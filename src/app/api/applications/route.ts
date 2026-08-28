import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireWorker, errorResponse } from "@/lib/authz";
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

    // Prevent double-apply
    const existing = await db.application.findUnique({
      where: { jobId_workerId: { jobId, workerId: profile.id } },
    });
    if (existing) {
      return NextResponse.json({ id: existing.id, status: existing.status, alreadyApplied: true });
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
