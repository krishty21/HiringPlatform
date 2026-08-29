import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser, requireEmployer, errorResponse, assertJobOwner, HTTPError } from "@/lib/authz";
import { UpdateJobBody } from "@/lib/schemas";
import { computeMatch } from "@/lib/matching/score";
import { haversineKm } from "@/lib/matching/haversine";

// PATCH /api/jobs/:id — employer updates own job (status open|closed, title, description).
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { profile } = await requireEmployer();
    const { id } = await params;
    const owner = await assertJobOwner(id, profile.id);
    if (!owner) return errorResponse(new Error("FORBIDDEN"));

    const body = await req.json();
    const parsed = UpdateJobBody.parse(body);
    const updated = await db.job.update({ where: { id }, data: parsed });
    return NextResponse.json({ id: updated.id, status: updated.status });
  } catch (e) {
    return errorResponse(e);
  }
}

// GET /api/jobs/:id — single-job detail (any status) with the same enrichment
// shape as the feed item (round 13). The feed only returns status:"open" jobs,
// so a worker with an existing application on a since-closed job could never
// load the detail page (infinite skeleton). This endpoint serves ANY status so
// application cards keep deep-linking correctly; the page renders a closed
// banner and disables Apply when status !== "open".
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const job = await db.job.findUnique({
      where: { id },
      include: {
        trade: true,
        employer: { select: { id: true, userId: true, companyName: true, city: true, isVerified: true } },
        skills: { include: { skill: true } },
      },
    });
    if (!job) throw new HTTPError(404, "NOT_FOUND");

    // Employer rating summary (worker→employer ratings, ratee = employer userId)
    const ratingRows = await db.rating.findMany({
      where: { rateeId: job.employer.userId },
      select: { score: true },
    });
    const ratingCount = ratingRows.length;
    const ratingAvg = ratingCount > 0
      ? Math.round((ratingRows.reduce((s, r) => s + r.score, 0) / ratingCount) * 10) / 10
      : 0;

    // Worker context: distance + match score (same inputs as the feed route)
    let distanceKm: number | null = null;
    let matchScore: number | null = null;
    if (user.role === "worker") {
      const wp = await db.workerProfile.findUnique({
        where: { userId: user.id },
        select: {
          id: true, tradeId: true, yearsExp: true, lat: true, lng: true,
          wageMin: true, wageMax: true, shiftPref: true, trustTier: true, maxRadiusKm: true,
          skills: { select: { skillId: true, proficiency: true } },
        },
      });
      if (wp) {
        distanceKm = haversineKm(wp.lat, wp.lng, job.lat, job.lng);
        distanceKm = Math.round(distanceKm * 10) / 10;
        if (wp.skills.length > 0) {
          const s = computeMatch({
            worker: {
              id: wp.id, tradeId: wp.tradeId, yearsExp: wp.yearsExp,
              lat: wp.lat, lng: wp.lng, wageMin: wp.wageMin, wageMax: wp.wageMax,
              shiftPref: wp.shiftPref, trustTier: wp.trustTier, maxRadiusKm: wp.maxRadiusKm,
              skills: wp.skills,
            },
            job: {
              id: job.id, tradeId: job.tradeId, wageMin: job.wageMin, wageMax: job.wageMax,
              lat: job.lat, lng: job.lng, shift: job.shift, isUrgent: job.isUrgent,
              skills: job.skills.map(s => ({ skillId: s.skillId, required: s.required })),
            },
          });
          matchScore = s.score;
          // Refresh the cache row (best-effort — same pattern as the feed route)
          await db.matchScore.upsert({
            where: { jobId_workerId: { jobId: job.id, workerId: wp.id } },
            update: { score: s.score, breakdownJson: JSON.stringify(s.breakdown), computedAt: new Date() },
            create: { jobId: job.id, workerId: wp.id, score: s.score, breakdownJson: JSON.stringify(s.breakdown) },
          }).catch(() => {});
        }
      }
    }

    return NextResponse.json({
      id: job.id,
      title: job.title,
      tradeId: job.tradeId,
      trade: job.trade,
      headcount: job.headcount,
      wageMin: job.wageMin,
      wageMax: job.wageMax,
      city: job.city,
      lat: job.lat, lng: job.lng,
      shift: job.shift,
      isUrgent: job.isUrgent,
      status: job.status,
      description: job.description,
      viewsCount: job.viewsCount,
      employer: {
        id: job.employer.id,
        companyName: job.employer.companyName,
        city: job.employer.city,
        isVerified: job.employer.isVerified,
        ratingAvg,
        ratingCount,
      },
      skills: job.skills.map(s => ({ skillId: s.skillId, required: s.required, skill: s.skill })),
      matchScore,
      distanceKm,
      createdAt: job.createdAt.toISOString(),
    });
  } catch (e) {
    return errorResponse(e);
  }
}
