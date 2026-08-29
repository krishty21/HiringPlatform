// GET /api/employer/applications — list all applications for the caller's jobs.
// Used by the pipeline Kanban (EMP-06). Each row includes worker + job + match score.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireEmployer, errorResponse } from "@/lib/authz";

export async function GET(req: Request) {
  try {
    const { profile } = await requireEmployer();
    const url = new URL(req.url);
    const jobId = url.searchParams.get("jobId");

    const applications = await db.application.findMany({
      where: {
        // Round 12: withdrawn applications are excluded — the worker removed
        // themselves from consideration, so they no longer belong on the board.
        status: { not: "withdrawn" },
        ...(jobId ? { jobId } : {}),
        job: { employerId: profile.id },
      },
      include: {
        job: {
          select: {
            id: true, title: true, tradeId: true, headcount: true,
            trade: { select: { nameEn: true } },
          },
        },
        worker: {
          select: {
            id: true, fullName: true, tradeId: true, yearsExp: true,
            city: true, wageMin: true, wageMax: true,
            trustTier: true, trustScore: true, availableToday: true,
            photoUrl: true,
            trade: { select: { nameEn: true } },
            skills: { select: { skillId: true, proficiency: true, skill: { select: { nameEn: true } } } },
          },
        },
      },
      orderBy: [{ status: "asc" }, { appliedAt: "desc" }],
    });

    const items = applications.map(a => ({
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
      job: {
        id: a.job.id,
        title: a.job.title,
        tradeId: a.job.tradeId,
        headcount: a.job.headcount,
        tradeName: a.job.trade?.nameEn ?? null,
      },
      worker: {
        id: a.worker.id,
        fullName: a.worker.fullName,
        tradeId: a.worker.tradeId,
        yearsExp: a.worker.yearsExp,
        city: a.worker.city,
        wageMin: a.worker.wageMin,
        wageMax: a.worker.wageMax,
        trustTier: a.worker.trustTier,
        trustScore: a.worker.trustScore,
        availableToday: a.worker.availableToday,
        photoUrl: a.worker.photoUrl,
        tradeName: a.worker.trade?.nameEn ?? null,
        skills: a.worker.skills.map(s => ({
          skillId: s.skillId,
          proficiency: s.proficiency,
          nameEn: s.skill?.nameEn ?? "",
        })),
      },
    }));

    return NextResponse.json({ items });
  } catch (e) {
    return errorResponse(e);
  }
}
