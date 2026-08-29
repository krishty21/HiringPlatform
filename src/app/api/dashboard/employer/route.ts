// GET /api/dashboard/employer — DSH-01 employer dashboard aggregates.
// Returns: { timeToHireHours, activeJobs, newApplicantsToday, hiresThisWeek,
//            funnel: { views, applied, shortlisted, interview, hired },
//            perJob: [{ jobId, title, applicantsByStage, views, scoreDistribution }] }.
// Employer auth only; scoped to the caller's employerProfile.id (per authz §3.4).
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireEmployer, errorResponse } from "@/lib/authz";

type TTHRow = { h: number | null };

export async function GET() {
  try {
    const { profile } = await requireEmployer();

    // ---- 1. Time-to-hire (avg hours from appliedAt → hiredAt over hired apps for caller's jobs)
    // PostgreSQL: use EXTRACT(EPOCH ...) to convert interval to seconds, divide by 3600 for hours.
    const tthRows = await db.$queryRaw<TTHRow[]>`
      SELECT AVG(EXTRACT(EPOCH FROM ("hiredAt" - "appliedAt")) / 3600.0) AS h
      FROM "Application"
      WHERE status = 'hired'
        AND "jobId" IN (SELECT id FROM "Job" WHERE "employerId" = ${profile.id})`;
    const rawH = tthRows[0]?.h;
    const timeToHireHours =
      rawH != null && Number.isFinite(Number(rawH))
        ? Math.round(Number(rawH) * 10) / 10
        : null;

    // ---- 2. Active jobs (status=open AND owned by caller)
    const activeJobs = await db.job.count({
      where: { status: "open", employerId: profile.id },
    });

    // ---- 3. New applicants today (appliedAt >= UTC midnight today, for caller's jobs)
    const now = new Date();
    const utcMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const newApplicantsToday = await db.application.count({
      where: {
        appliedAt: { gte: utcMidnight },
        job: { employerId: profile.id },
      },
    });

    // ---- 4. Hires this week (hiredAt within last 7 days, for caller's jobs)
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const hiresThisWeek = await db.application.count({
      where: {
        hiredAt: { gte: weekAgo },
        job: { employerId: profile.id },
      },
    });

    // ---- 5. Per-stage funnel counts (per-stage convention: clearer for funnel bars)
    //    Per-stage = exact status match (not cumulative) so the bars show drop-off cleanly.
    const stageAgg = await db.application.groupBy({
      by: ["status"],
      where: { job: { employerId: profile.id } },
      _count: { _all: true },
    });
    const stageCount = (s: string) =>
      stageAgg.find((x) => x.status === s)?._count._all ?? 0;
    const applied = stageCount("applied");
    const shortlisted = stageCount("shortlisted");
    const interview = stageCount("interview");
    const offer = stageCount("offer");
    const hired = stageCount("hired");

    // Views = SUM(jobs.viewsCount) for caller's jobs.
    const viewsAgg = await db.job.aggregate({
      where: { employerId: profile.id },
      _sum: { viewsCount: true },
    });
    const views = viewsAgg._sum.viewsCount ?? 0;

    const funnel = { views, applied, shortlisted, interview, offer, hired };

    // ---- 6. Per-job drill-down (DSH-03): applicantsByStage + views + scoreDistribution
    const jobs = await db.job.findMany({
      where: { employerId: profile.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        viewsCount: true,
        status: true,
        applications: {
          select: {
            status: true,
            workerId: true,
          },
        },
      },
    });

    // Gather all workerIds per job for match-score bucketing.
    const allWorkerIds = Array.from(
      new Set(jobs.flatMap((j) => j.applications.map((a) => a.workerId))),
    );

    // Fetch match scores for these (jobId, workerId) pairs in one pass.
    // We query MatchScore rows for the jobs we care about; client buckets per job.
    const matchScores = allWorkerIds.length
      ? await db.matchScore.findMany({
          where: {
            jobId: { in: jobs.map((j) => j.id) },
          },
          select: { jobId: true, workerId: true, score: true },
        })
      : [];

    // Index: jobId → Set<workerId> → score (for O(1) lookup while bucketing).
    const scoreByJobWorker = new Map<string, Map<string, number>>();
    for (const ms of matchScores) {
      let inner = scoreByJobWorker.get(ms.jobId);
      if (!inner) {
        inner = new Map();
        scoreByJobWorker.set(ms.jobId, inner);
      }
      inner.set(ms.workerId, ms.score);
    }

    const perJob = jobs.map((j) => {
      // applicantsByStage
      const applicantsByStage: Record<
        "applied" | "shortlisted" | "interview" | "offer" | "hired" | "rejected",
        number
      > = { applied: 0, shortlisted: 0, interview: 0, offer: 0, hired: 0, rejected: 0 };
      for (const a of j.applications) {
        if (a.status in applicantsByStage) {
          applicantsByStage[a.status as keyof typeof applicantsByStage]++;
        }
      }

      // score distribution: 5 buckets [0-20, 21-40, 41-60, 61-80, 81-100]
      const scoreDistribution = [0, 0, 0, 0, 0];
      const inner = scoreByJobWorker.get(j.id);
      if (inner) {
        for (const a of j.applications) {
          const s = inner.get(a.workerId);
          if (typeof s !== "number") continue; // no cached score — skip
          let idx: number;
          if (s <= 20) idx = 0;
          else if (s <= 40) idx = 1;
          else if (s <= 60) idx = 2;
          else if (s <= 80) idx = 3;
          else idx = 4;
          scoreDistribution[idx]++;
        }
      }

      return {
        jobId: j.id,
        title: j.title,
        status: j.status,
        applicantsByStage,
        views: j.viewsCount,
        scoreDistribution,
      };
    });

    return NextResponse.json({
      timeToHireHours,
      activeJobs,
      newApplicantsToday,
      hiresThisWeek,
      funnel,
      perJob,
    });
  } catch (e) {
    return errorResponse(e);
  }
}
