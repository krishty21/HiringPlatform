// GET /api/candidates/search — employer auth, returns ranked workers by match score.
// Per EMP-03/EMP-04/EMP-05:
//   - filters: trade, experience, distance, trust tier, wage, available-today, language
//   - results ranked by match score desc
//   - when urgentJobId is provided, workers available-today are sorted first (EMP-05)
// Round 8 (additive): `topRated=true` keeps only workers with ≥3 ratings and avg ≥4.5
// (same thresholds as the TopRatedBadge). Each row is annotated with ratingAvg +
// ratingCount so cards can render inline stars without N+1 fetches.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireEmployer, errorResponse } from "@/lib/authz";
import { SearchCandidatesQuery } from "@/lib/schemas";
import { computeMatch } from "@/lib/matching/score";
import { explainMatch } from "@/lib/matching/explain";
import { haversineKm } from "@/lib/matching/haversine";

interface WorkerRow {
  id: string;
  fullName: string;
  tradeId: string | null;
  tradeName: string | null;
  yearsExp: number;
  city: string;
  lat: number;
  lng: number;
  wageMin: number;
  wageMax: number;
  shiftPref: string;
  availableToday: boolean;
  trustTier: string;
  trustScore: number;
  bio: string;
  languages: string[];
  skills: { skillId: string; proficiency: number; nameEn: string }[];
  matchScore: number;
  topReason: string | null;
  distanceKm: number;
  profileViews: number;
  // Round 8: worker's rating from employers (0 when unrated)
  ratingAvg: number;
  ratingCount: number;
}

export async function GET(req: Request) {
  try {
    const { profile } = await requireEmployer();
    const url = new URL(req.url);
    const params = Object.fromEntries(url.searchParams.entries());
    const parsed = SearchCandidatesQuery.parse(params);
    // Round 8: `topRated` is parsed outside the frozen SearchCandidatesQuery schema
    // (coordinated additive extension — frozen schemas/index.ts stays untouched).
    const topRatedOnly = url.searchParams.get("topRated") === "true";

    // Employer city — used for distance computation when caller doesn't pass lat/lng
    const employer = await db.employerProfile.findUnique({
      where: { id: profile.id },
      select: { city: true },
    });

    // Determine target job for match scoring
    // - If urgentJobId provided, use that job's match scores
    // - Else if a tradeId filter is provided, score against a "generic" job of that trade
    //   with wage/location = employer's city
    let scoringJob: {
      id: string; tradeId: string | null; wageMin: number; wageMax: number;
      lat: number; lng: number; shift: string; isUrgent: boolean;
      skills: { skillId: string; required: boolean }[];
    } | null = null;

    if (parsed.urgentJobId) {
      const job = await db.job.findUnique({
        where: { id: parsed.urgentJobId },
        include: { skills: { select: { skillId: true, required: true } } },
      });
      if (job) {
        scoringJob = {
          id: job.id, tradeId: job.tradeId, wageMin: job.wageMin, wageMax: job.wageMax,
          lat: job.lat, lng: job.lng, shift: job.shift, isUrgent: job.isUrgent,
          skills: job.skills.map(s => ({ skillId: s.skillId, required: s.required })),
        };
      }
    }

    // If no job context, build a synthetic scoring job from filters + employer location.
    if (!scoringJob) {
      const empCityData = await db.employerProfile.findUnique({ where: { id: profile.id }, select: { city: true } });
      // Look up a city centroid from existing workers/jobs (cheap heuristic)
      const centroid = await db.workerProfile.findFirst({
        where: { city: employer?.city ?? undefined },
        select: { lat: true, lng: true },
      });
      scoringJob = {
        id: "synthetic",
        tradeId: parsed.tradeId ?? null,
        wageMin: parsed.wageMin ?? 0,
        wageMax: parsed.wageMax ?? 10000,
        lat: centroid?.lat ?? 16.5,
        lng: centroid?.lng ?? 81.5,
        shift: "any",
        isUrgent: false,
        skills: [],
      };
    }

    // Where clause for candidate filter
    const where: Record<string, unknown> = {};
    if (parsed.tradeId) where.tradeId = parsed.tradeId;
    if (parsed.experienceMin != null || parsed.experienceMax != null) {
      where.yearsExp = {
        ...(parsed.experienceMin != null ? { gte: parsed.experienceMin } : {}),
        ...(parsed.experienceMax != null ? { lte: parsed.experienceMax } : {}),
      };
    }
    if (parsed.trustTier) where.trustTier = parsed.trustTier;
    if (parsed.availableToday) where.availableToday = true;
    if (parsed.wageMin != null) where.wageMin = { gte: parsed.wageMin };
    if (parsed.wageMax != null) where.wageMax = { lte: parsed.wageMax };
    if (parsed.language) {
      // languages is a JSON-encoded string array; SQLite LIKE fallback (best-effort)
      where.languages = { contains: `"${parsed.language}"` };
    }

    const workers = await db.workerProfile.findMany({
      where,
      include: {
        trade: { select: { nameEn: true } },
        skills: { select: { skillId: true, proficiency: true, skill: { select: { nameEn: true } } } },
      },
      orderBy: { trustScore: "desc" },
      take: 100,
    });

    // Round 8: one query for every employer→worker rating, grouped per ratee (worker userId).
    // Mirrors TopRatedBadge thresholds (minCount 3, minAvg 4.5).
    const TOP_RATED_MIN_AVG = 4.5;
    const TOP_RATED_MIN_COUNT = 3;
    const ratingRows = await db.rating.findMany({
      select: { rateeId: true, score: true },
    });
    const ratingsByRatee = new Map<string, { sum: number; count: number }>();
    for (const r of ratingRows) {
      const agg = ratingsByRatee.get(r.rateeId) ?? { sum: 0, count: 0 };
      agg.sum += r.score;
      agg.count += 1;
      ratingsByRatee.set(r.rateeId, agg);
    }
    const ratingOf = (userId: string) => {
      const agg = ratingsByRatee.get(userId);
      if (!agg || agg.count === 0) return { avg: 0, count: 0 };
      return { avg: Math.round((agg.sum / agg.count) * 10) / 10, count: agg.count };
    };

    const enriched: WorkerRow[] = workers.map((w) => {
      const dist = haversineKm(w.lat, w.lng, scoringJob!.lat, scoringJob!.lng);
      const skillRows = w.skills.map(s => ({
        skillId: s.skillId,
        proficiency: s.proficiency,
        nameEn: s.skill?.nameEn ?? "",
      }));
      const score = computeMatch({
        worker: {
          id: w.id, tradeId: w.tradeId, yearsExp: w.yearsExp, lat: w.lat, lng: w.lng,
          wageMin: w.wageMin, wageMax: w.wageMax, shiftPref: w.shiftPref,
          trustTier: w.trustTier, maxRadiusKm: w.maxRadiusKm,
          skills: w.skills.map(s => ({ skillId: s.skillId, proficiency: s.proficiency })),
        },
        job: scoringJob!,
      });
      const reasons = explainMatch({
        score,
        worker: { yearsExp: w.yearsExp, tradeName: w.trade?.nameEn ?? null, skillCount: skillRows.length },
        job: {
          skillCount: scoringJob!.skills.length,
          tradeName: null,
          city: employer?.city ?? "",
          wageMin: scoringJob!.wageMin,
          wageMax: scoringJob!.wageMax,
        },
        distanceKm: dist,
      });
      let languagesArr: string[] = [];
      try { languagesArr = JSON.parse(w.languages) as string[]; } catch {}
      const rating = ratingOf(w.userId);
      return {
        id: w.id,
        fullName: w.fullName,
        tradeId: w.tradeId,
        tradeName: w.trade?.nameEn ?? null,
        yearsExp: w.yearsExp,
        city: w.city,
        lat: w.lat, lng: w.lng,
        wageMin: w.wageMin, wageMax: w.wageMax,
        shiftPref: w.shiftPref,
        availableToday: w.availableToday,
        trustTier: w.trustTier,
        trustScore: w.trustScore,
        bio: w.bio,
        languages: languagesArr,
        skills: skillRows,
        matchScore: score.score,
        topReason: reasons[0] ?? null,
        distanceKm: Math.round(dist * 10) / 10,
        profileViews: w.profileViews,
        ratingAvg: rating.avg,
        ratingCount: rating.count,
      };
    });

    // Filter by distance radius when requested + Top Rated (round 8)
    const filtered = enriched.filter(w => {
      if (parsed.distanceKm != null && w.distanceKm > parsed.distanceKm) return false;
      if (topRatedOnly && !(w.ratingCount >= TOP_RATED_MIN_COUNT && w.ratingAvg >= TOP_RATED_MIN_AVG)) return false;
      return true;
    });

    // Sort by match score desc; if urgent job, sort available-today workers first within the same score band
    filtered.sort((a, b) => {
      if (parsed.urgentJobId) {
        // Urgent job — promote available workers (EMP-05)
        if (a.availableToday !== b.availableToday) return a.availableToday ? -1 : 1;
      }
      return b.matchScore - a.matchScore;
    });

    return NextResponse.json({
      items: filtered,
      total: filtered.length,
      urgentJobId: parsed.urgentJobId ?? null,
      topRated: topRatedOnly,
    });
  } catch (e) {
    return errorResponse(e);
  }
}
