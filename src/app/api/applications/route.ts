import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireWorker, errorResponse, HTTPError } from "@/lib/authz";
import { rateLimit, clientKey, rateLimitResponse } from "@/lib/rate-limit";

// POST /api/applications — one-tap apply
export async function POST(req: Request) {
  try {
    const { user, profile } = await requireWorker();

    // Brute-force/spam protection (STATUS.md finding #4): 20 applies/min
    // per worker, keyed by user AFTER auth.
    const rl = rateLimit(clientKey(req, user.id), { limit: 20, windowMs: 60_000 });
    if (!rl.ok) return rateLimitResponse(rl.retryAfterSec);

    const body = await req.json();
    const { jobId } = body as { jobId?: string };
    if (!jobId) return errorResponse(new Error("VALIDATION"));

    // Round 13: applications to closed jobs are rejected at the API level.
    // The board hides closed jobs, but the endpoint must not rely on UI
    // hiding — a stale card, a direct POST, or a re-apply on a job closed
    // after withdrawal must all fail cleanly with JOB_CLOSED (409).
    const targetJob = await db.job.findUnique({
      where: { id: jobId },
      select: { status: true },
    });
    if (!targetJob) throw new HTTPError(404, "NOT_FOUND");
    if (targetJob.status !== "open") throw new HTTPError(409, "JOB_CLOSED");

    // Prevent double-apply — but a WITHDRAWN application may be re-submitted
    // (round 12): reset the row to a fresh "applied" state and re-notify.
    const existing = await db.application.findUnique({
      where: { jobId_workerId: { jobId, workerId: profile.id } },
    });
    if (existing) {
      if (existing.status !== "withdrawn") {
        return NextResponse.json({ id: existing.id, status: existing.status, alreadyApplied: true });
      }
      const reapplied = await db.application.update({
        where: { id: existing.id },
        data: {
          status: "applied",
          appliedAt: new Date(),
          shortlistedAt: null,
          interviewAt: null,
          offerAt: null,
          hiredAt: null,
          rejectedAt: null,
        },
      });
      const jobForNotify = await db.job.findUnique({
        where: { id: jobId },
        select: { employer: { select: { userId: true, companyName: true } }, title: true },
      });
      if (jobForNotify) {
        await db.notification.create({
          data: {
            userId: jobForNotify.employer.userId,
            type: "application_status",
            payloadJson: JSON.stringify({
              applicationId: reapplied.id,
              jobId,
              jobTitle: jobForNotify.title,
              stage: "applied",
              workerId: profile.id,
            }),
          },
        });
      }
      return NextResponse.json({ id: reapplied.id, status: "applied", reapplied: true }, { status: 201 });
    }

    const app = await db.application.create({
      data: { jobId, workerId: profile.id, status: "applied" },
    });

    // Notify the employer
    const job = await db.job.findUnique({
      where: { id: jobId },
      select: { employer: { select: { userId: true, companyName: true } }, title: true },
    });
    if (job) {
      await db.notification.create({
        data: {
          userId: job.employer.userId,
          type: "application_status",
          payloadJson: JSON.stringify({
            applicationId: app.id,
            jobId,
            jobTitle: job.title,
            stage: "applied",
            workerId: profile.id,
          }),
        },
      });
    }

    return NextResponse.json({ id: app.id, status: "applied" }, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
