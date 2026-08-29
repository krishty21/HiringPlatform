import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser, requireEmployer, errorResponse, assertJobOwner } from "@/lib/authz";
import { CreateJobBody, FeedJobsQuery } from "@/lib/schemas";
import { computeMatch } from "@/lib/matching/score";
import { recomputeEmployerVerified } from "@/lib/trust/recompute";
import { haversineKm } from "@/lib/matching/haversine";

// GET /api/jobs — feed with filters + pagination (any-auth)
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const params = Object.fromEntries(url.searchParams.entries());
    const parsed = FeedJobsQuery.parse(params);
    const user = await requireUser();

    // Determine worker location: prefer session worker profile, fall back to query overrides.
    // Hoisted out of the enrichment loop — one query instead of N.
    let lat = parsed.lat;
    let lng = parsed.lng;
    let maxRadius = 30; // default radius if not a worker
    let wp: {
      id: string; tradeId: string; yearsExp: number; lat: number; lng: number;
      wageMin: number; wageMax: number; shiftPref: string; trustTier: string; maxRadiusKm: number;
      skills: { skillId: string; proficiency: number }[];
    } | null = null;
    if (user.role === "worker") {
      wp = await db.workerProfile.findUnique({
        where: { userId: user.id },
        select: {
          id: true, tradeId: true, yearsExp: true, lat: true, lng: true,
          wageMin: true, wageMax: true, shiftPref: true, trustTier: true, maxRadiusKm: true,
          skills: { select: { skillId: true, proficiency: true } },
        },
      });
      if (wp) {
        lat ??= wp.lat;
        lng ??= wp.lng;
        maxRadius = wp.maxRadiusKm;
      }
    }

    const where = {
      status: "open" as const,
      ...(parsed.tradeId ? { tradeId: parsed.tradeId } : {}),
      ...(parsed.wageMin != null ? { wageMin: { gte: parsed.wageMin } } : {}),
      ...(parsed.wageMax != null ? { wageMax: { lte: parsed.wageMax } } : {}),
      ...(parsed.shift ? { shift: parsed.shift } : {}),
      ...(parsed.urgentOnly ? { isUrgent: true } : {}),
    };

    // Fetch ALL filter-matching jobs (SQLite demo scale), then paginate AFTER the
    // radius filter. Paginating in SQL before filtering would silently drop
    // in-radius jobs when out-of-radius jobs occupy page slots, and `hasNext`
    // computed pre-filter would be wrong (round-6 fix).
    const jobs = await db.job.findMany({
      where,
      include: {
        trade: true,
        employer: { select: { id: true, companyName: true, city: true, isVerified: true } },
        skills: { include: { skill: true } },
      },
      orderBy: [{ isUrgent: "desc" }, { createdAt: "desc" }],
    });

    // Cached match scores for this worker — one query for the whole set.
    const cachedScores = new Map<string, number>();
    if (wp && jobs.length > 0) {
      const ms = await db.matchScore.findMany({
        where: { workerId: wp.id, jobId: { in: jobs.map(j => j.id) } },
        select: { jobId: true, score: true },
      }).catch(() => []);
      for (const m of ms) cachedScores.set(m.jobId, m.score);
    }

    // Compute scores + distances (only when worker with location)
    const enriched = await Promise.all(jobs.map(async (j) => {
      const dist = (lat != null && lng != null) ? haversineKm(lat, lng, j.lat, j.lng) : null;
      const inRadius = dist == null || dist <= maxRadius;
      let score: number | null = null;
      if (wp && wp.skills.length > 0) {
        const cached = cachedScores.get(j.id);
        if (cached != null) {
          score = cached;
        } else {
          // compute on the fly (cheap for small feed)
          const s = computeMatch({
            worker: {
              id: wp.id, tradeId: wp.tradeId, yearsExp: wp.yearsExp,
              lat: wp.lat, lng: wp.lng, wageMin: wp.wageMin, wageMax: wp.wageMax,
              shiftPref: wp.shiftPref, trustTier: wp.trustTier, maxRadiusKm: wp.maxRadiusKm,
              skills: wp.skills,
            },
            job: {
              id: j.id, tradeId: j.tradeId, wageMin: j.wageMin, wageMax: j.wageMax,
              lat: j.lat, lng: j.lng, shift: j.shift, isUrgent: j.isUrgent,
              skills: j.skills.map(s => ({ skillId: s.skillId, required: s.required })),
            },
          });
          score = s.score;
          // persist for cache
          await db.matchScore.upsert({
            where: { jobId_workerId: { jobId: j.id, workerId: wp.id } },
            update: { score: s.score, breakdownJson: JSON.stringify(s.breakdown), computedAt: new Date() },
            create: { jobId: j.id, workerId: wp.id, score: s.score, breakdownJson: JSON.stringify(s.breakdown) },
          }).catch(() => {});
        }
      }

      return {
        id: j.id,
        title: j.title,
        tradeId: j.tradeId,
        trade: j.trade,
        headcount: j.headcount,
        wageMin: j.wageMin,
        wageMax: j.wageMax,
        city: j.city,
        lat: j.lat, lng: j.lng,
        shift: j.shift,
        isUrgent: j.isUrgent,
        status: j.status,
        description: j.description,
        viewsCount: j.viewsCount,
        employer: j.employer,
        skills: j.skills.map(s => ({ skillId: s.skillId, required: s.required, skill: s.skill })),
        matchScore: score,
        distanceKm: dist == null ? null : Math.round(dist * 10) / 10,
        inRadius,
        createdAt: j.createdAt.toISOString(),
      };
    }));

    // Filter by radius/distance/availableOnly
    const filtered = enriched.filter(j => {
      if (parsed.distanceKm != null && (j.distanceKm == null || j.distanceKm > parsed.distanceKm)) return false;
      if (!j.inRadius && parsed.distanceKm == null && lat != null) return false;
      return true;
    });

    // Manual pagination AFTER filtering (round-6 fix)
    const total = filtered.length;
    const start = (parsed.page - 1) * parsed.pageSize;
    const pageItems = filtered.slice(start, start + parsed.pageSize);
    const hasNext = start + pageItems.length < total;

    return NextResponse.json({ items: pageItems, total, page: parsed.page, pageSize: parsed.pageSize, hasNext });
  } catch (e) {
    return errorResponse(e);
  }
}

// POST /api/jobs — create job (employer only)
export async function POST(req: Request) {
  try {
    const { user, profile } = await requireEmployer();
    const body = await req.json();
    const parsed = CreateJobBody.parse(body);

    const job = await db.job.create({
      data: {
        employerId: profile.id,
        postedBy: user.id,
        title: parsed.title,
        tradeId: parsed.tradeId,
        headcount: parsed.headcount,
        wageMin: parsed.wageMin,
        wageMax: parsed.wageMax,
        city: parsed.city,
        lat: parsed.lat,
        lng: parsed.lng,
        shift: parsed.shift,
        isUrgent: parsed.isUrgent,
        status: "open",
        description: parsed.description,
      },
    });

    // job_skills
    if (parsed.skills.length > 0) {
      await db.jobSkill.createMany({
        data: parsed.skills.map(s => ({ jobId: job.id, skillId: s.skillId, required: s.required })),
        skipDuplicates: true,
      });
    }

    // Precompute match scores against all workers (so feed shows them immediately)
    const workers = await db.workerProfile.findMany({
      include: { skills: { select: { skillId: true, proficiency: true } } },
    });
    for (const w of workers) {
      const s = computeMatch({
        worker: {
          id: w.id, tradeId: w.tradeId, yearsExp: w.yearsExp, lat: w.lat, lng: w.lng,
          wageMin: w.wageMin, wageMax: w.wageMax, shiftPref: w.shiftPref,
          trustTier: w.trustTier, maxRadiusKm: w.maxRadiusKm, skills: w.skills,
        },
        job: {
          id: job.id, tradeId: job.tradeId, wageMin: job.wageMin, wageMax: job.wageMax,
          lat: job.lat, lng: job.lng, shift: job.shift, isUrgent: job.isUrgent,
          skills: parsed.skills.map(s => ({ skillId: s.skillId, required: s.required })),
        },
      });
      await db.matchScore.upsert({
        where: { jobId_workerId: { jobId: job.id, workerId: w.id } },
        update: { score: s.score, breakdownJson: JSON.stringify(s.breakdown), computedAt: new Date() },
        create: { jobId: job.id, workerId: w.id, score: s.score, breakdownJson: JSON.stringify(s.breakdown) },
      }).catch(() => {});
    }

    // Touch employer verified state (in case admin approved meanwhile)
    await recomputeEmployerVerified(db, profile.id);

    return NextResponse.json({ id: job.id, status: "open" }, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
