// GET /api/match/explain — MAT-02 — Score breakdown + top-3 plain-language reasons
// for a job × worker pair. Any-auth (worker sees why-this-job-recommended;
// employer sees why-this-candidate-ranked). Returns frozen `computeMatch` +
// `explainMatch` output plus the haversine distance.
//
// Query: ?jobId=...&workerId=...
//
// Per SRD §8.1 the breakdown is the five weighted components (S/D/E/W/T) plus
// the embedding bonus (MAT-04 — stubbed to 0 unless a real provider returns
// similarity > 0). WS1/WS2 frontend render the "Why 87" panel from this payload.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser, errorResponse, HTTPError } from "@/lib/authz";
import { computeMatch } from "@/lib/matching/score";
import { explainMatch } from "@/lib/matching/explain";
import { haversineKm } from "@/lib/matching/haversine";

export async function GET(req: Request) {
  try {
    // Any-auth — workers and employers both consume the "Why X" panel.
    await requireUser();

    const url = new URL(req.url);
    const jobId = url.searchParams.get("jobId");
    const workerId = url.searchParams.get("workerId");
    if (!jobId || !workerId) {
      throw new HTTPError(400, "VALIDATION");
    }

    // Parallel fetch: job (with skills) + worker (with skills, lat/lng, trust tier).
    // Select only what computeMatch needs — keep payload slim for fast <100ms responses.
    const [job, worker] = await Promise.all([
      db.job.findUnique({
        where: { id: jobId },
        select: {
          id: true,
          tradeId: true,
          wageMin: true,
          wageMax: true,
          lat: true,
          lng: true,
          shift: true,
          isUrgent: true,
          city: true,
          skills: { select: { skillId: true, required: true, skill: { select: { nameEn: true } } } },
          trade: { select: { nameEn: true } },
        },
      }),
      db.workerProfile.findUnique({
        where: { id: workerId },
        select: {
          id: true,
          tradeId: true,
          yearsExp: true,
          lat: true,
          lng: true,
          wageMin: true,
          wageMax: true,
          shiftPref: true,
          trustTier: true,
          maxRadiusKm: true,
          city: true,
          skills: { select: { skillId: true, proficiency: true, skill: { select: { nameEn: true } } } },
          trade: { select: { nameEn: true } },
        },
      }),
    ]);

    if (!job) throw new HTTPError(404, "NOT_FOUND");
    if (!worker) throw new HTTPError(404, "NOT_FOUND");

    // MAT-04: embedding bonus — stubbed to 0. Real embeddings provider would
    // compute cosine similarity × 5 (capped at 5) and pass it here.
    const embeddingBonus = 0;

    const score = computeMatch({
      worker: {
        id: worker.id,
        tradeId: worker.tradeId,
        yearsExp: worker.yearsExp,
        lat: worker.lat,
        lng: worker.lng,
        wageMin: worker.wageMin,
        wageMax: worker.wageMax,
        shiftPref: worker.shiftPref,
        trustTier: worker.trustTier,
        maxRadiusKm: worker.maxRadiusKm,
        skills: worker.skills.map((s) => ({ skillId: s.skillId, proficiency: s.proficiency })),
      },
      job: {
        id: job.id,
        tradeId: job.tradeId,
        wageMin: job.wageMin,
        wageMax: job.wageMax,
        lat: job.lat,
        lng: job.lng,
        shift: job.shift,
        isUrgent: job.isUrgent,
        skills: job.skills.map((s) => ({ skillId: s.skillId, required: s.required })),
      },
      embeddingBonus,
    });

    const distanceKm = haversineKm(worker.lat, worker.lng, job.lat, job.lng);

    const reasons = explainMatch({
      score,
      worker: {
        yearsExp: worker.yearsExp,
        tradeName: worker.trade?.nameEn ?? null,
        skillCount: worker.skills.length,
      },
      job: {
        skillCount: job.skills.length,
        tradeName: job.trade?.nameEn ?? null,
        city: job.city,
        wageMin: job.wageMin,
        wageMax: job.wageMax,
      },
      distanceKm,
    });

    return NextResponse.json({
      jobId: job.id,
      workerId: worker.id,
      score: score.score,
      breakdown: score.breakdown,
      reasons,
      distanceKm: Math.round(distanceKm * 10) / 10,
      embeddingBonus,
    });
  } catch (e) {
    return errorResponse(e);
  }
}
