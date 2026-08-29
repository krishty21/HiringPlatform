// POST /api/applications/:id/withdraw — worker-initiated withdrawal (round 12).
// Trust/UX gap: a worker who applied by mistake (or took other work) previously
// had to "ghost" the employer. Withdrawal lets them exit cleanly; the employer
// is notified, the application leaves the employer's pipeline board, and the
// worker can re-apply later (POST /api/applications resets a withdrawn row).
//
// Rules:
//  - Worker auth + must own the application (RLS-equivalent via authz helpers).
//  - Withdrawable only from active stages: applied | shortlisted | interview | offer.
//    (hired / rejected / withdrawn are terminal — nothing to withdraw.)
//  - Status string "withdrawn" is additive: the Prisma `status` field is a free
//    String (no enum migration needed) and every consumer buckets unknown
//    statuses safely.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireWorker, assertApplicationOwnerForWorker, errorResponse, HTTPError } from "@/lib/authz";
import { pushNotification } from "@/lib/notifications";

const WITHDRAWABLE = new Set(["applied", "shortlisted", "interview", "offer"]);

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { profile } = await requireWorker();
    if (!(await assertApplicationOwnerForWorker(id, profile.id))) {
      return errorResponse(new HTTPError(403, "FORBIDDEN"));
    }

    const app = await db.application.findUnique({
      where: { id },
      select: {
        id: true, status: true, jobId: true,
        job: { select: { id: true, title: true, employer: { select: { userId: true, companyName: true } } } },
      },
    });
    if (!app) return errorResponse(new HTTPError(404, "NOT_FOUND"));
    if (!WITHDRAWABLE.has(app.status)) {
      // Terminal or already withdrawn — nothing to do (idempotent-friendly 409).
      return errorResponse(new HTTPError(409, "CONFLICT"));
    }

    const updated = await db.application.update({
      where: { id },
      data: { status: "withdrawn" },
    });

    // Tell the employer the candidate pulled out (same channel the apply flow uses).
    if (app.job?.employer) {
      await pushNotification(app.job.employer.userId, "application_status", {
        applicationId: id,
        jobId: app.job.id,
        jobTitle: app.job.title,
        companyName: app.job.employer.companyName,
        stage: "withdrawn",
        workerId: profile.id,
      });
    }

    return NextResponse.json({ id: updated.id, status: updated.status });
  } catch (e) {
    return errorResponse(e);
  }
}
