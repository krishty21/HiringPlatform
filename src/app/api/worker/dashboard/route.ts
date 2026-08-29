// GET /api/worker/dashboard — DSH-02 worker side.
// Returns { inReviewCount, profileViews, topRecommendedJobs[] }.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireWorker, errorResponse } from "@/lib/authz";

export async function GET() {
  try {
    const { profile } = await requireWorker();

    // Applications in review = NOT in terminal stages (hired/rejected)
    const inReviewCount = await db.application.count({
      where: {
        workerId: profile.id,
        status: { notIn: ["hired", "rejected"] },
      },
    });

    // Profile views this week — the schema tracks a cumulative counter.
    // We surface the cumulative number; UI labels it as "this week" per directive.
    const wp = await db.workerProfile.findUnique({
      where: { id: profile.id },
      select: { profileViews: true },
    });

    // Top 3 recommended jobs — by stored match score, with the job+employer attached.
    const topScores = await db.matchScore.findMany({
      where: { workerId: profile.id },
      orderBy: { score: "desc" },
      take: 3,
      select: {
        score: true,
        jobId: true,
        breakdownJson: true,
        job: {
          include: {
            trade: true,
            employer: { select: { id: true, companyName: true, city: true, isVerified: true } },
            skills: { include: { skill: true } },
          },
        },
      },
    });

    const topRecommendedJobs = topScores
      .filter(ms => ms.job && ms.job.status === "open")
      .map(ms => {
        let breakdown: { S?: number; D?: number; E?: number; W?: number; T?: number; bonus?: number } = {};
        try { breakdown = JSON.parse(ms.breakdownJson) as typeof breakdown; } catch {}
        const j = ms.job;
        return {
          id: j.id,
          title: j.title,
          tradeId: j.tradeId,
          trade: j.trade,
          headcount: j.headcount,
          wageMin: j.wageMin,
          wageMax: j.wageMax,
          city: j.city,
          shift: j.shift,
          isUrgent: j.isUrgent,
          employer: j.employer,
          matchScore: ms.score,
          topReason: explainBreakdown(breakdown),
        };
      });

    return NextResponse.json({
      inReviewCount,
      profileViews: wp?.profileViews ?? 0,
      topRecommendedJobs,
    });
  } catch (e) {
    return errorResponse(e);
  }
}

function explainBreakdown(b: { S?: number; D?: number; E?: number; W?: number; T?: number; bonus?: number }): string {
  const parts: string[] = [];
  if (typeof b.S === "number") parts.push(`${Math.round(b.S * 100)}% skills`);
  if (typeof b.D === "number") parts.push(`${Math.round(b.D * 100)}% distance`);
  if (typeof b.W === "number") parts.push(`${Math.round(b.W * 100)}% wage`);
  if (typeof b.T === "number") parts.push(`${Math.round(b.T * 100)}% trust`);
  return parts.length ? parts.join(" · ") : "Match available";
}
