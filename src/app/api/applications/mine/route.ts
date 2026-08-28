// GET /api/applications/mine — list the caller's own applications (worker auth).
// Returns [] with job + employer details attached, sorted by most recent activity.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireWorker, errorResponse } from "@/lib/authz";

export async function GET() {
  try {
    const { profile } = await requireWorker();
    const apps = await db.application.findMany({
      where: { workerId: profile.id },
      orderBy: [{ updatedAt: "desc" }, { appliedAt: "desc" }],
      include: {
        job: {
          include: {
            trade: true,
            employer: { select: { id: true, companyName: true, city: true, isVerified: true } },
          },
        },
      },
    });

    const items = apps.map(a => ({
      id: a.id,
      jobId: a.jobId,
      workerId: a.workerId,
      status: a.status,
      appliedAt: a.appliedAt.toISOString(),
      shortlistedAt: a.shortlistedAt?.toISOString() ?? null,
      interviewAt: a.interviewAt?.toISOString() ?? null,
      offerAt: a.offerAt?.toISOString() ?? null,
      hiredAt: a.hiredAt?.toISOString() ?? null,
      rejectedAt: a.rejectedAt?.toISOString() ?? null,
      updatedAt: a.updatedAt.toISOString(),
      job: {
        id: a.job.id,
        title: a.job.title,
        tradeId: a.job.tradeId,
        trade: a.job.trade,
        headcount: a.job.headcount,
        wageMin: a.job.wageMin,
        wageMax: a.job.wageMax,
        city: a.job.city,
        shift: a.job.shift,
        isUrgent: a.job.isUrgent,
        employer: a.job.employer,
      },
    }));

    return NextResponse.json({ items });
  } catch (e) {
    return errorResponse(e);
  }
}
