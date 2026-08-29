// GET /api/ratings/[applicationId] — list ratings tied to an application.
// Caller must be a participant (the worker OR the job's employer) on the application.
// Each returned rating is annotated with direction ("given" | "received") relative
// to the caller and raterRole ("worker" | "employer").
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser, errorResponse, HTTPError } from "@/lib/authz";
import { getRatingsForApplication } from "@/lib/ratings";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ applicationId: string }> },
) {
  try {
    const caller = await requireUser(["worker", "employer"]);
    const { applicationId } = await params;

    // Participant check: fetch application + resolve caller side.
    const app = await db.application.findUnique({
      where: { id: applicationId },
      include: {
        job: { select: { employer: { select: { userId: true } } } },
        worker: { select: { userId: true } },
      },
    });
    if (!app) throw new HTTPError(404, "NOT_FOUND");

    const isWorkerSide = app.worker.userId === caller.id;
    const isEmployerSide = app.job.employer.userId === caller.id;
    if (!isWorkerSide && !isEmployerSide) throw new HTTPError(403, "FORBIDDEN");

    const rows = await getRatingsForApplication(db, applicationId);

    // Annotate each row with direction + rater role.
    const annotated = rows.map(r => {
      const raterIsWorker = r.raterId === app.worker.userId;
      const direction = r.raterId === caller.id ? "given" : "received";
      return {
        id: r.id,
        applicationId: r.applicationId,
        raterId: r.raterId,
        rateeId: r.rateeId,
        score: r.score,
        comment: r.comment,
        createdAt: r.createdAt.toISOString(),
        direction: direction as "given" | "received",
        raterRole: (raterIsWorker ? "worker" : "employer") as "worker" | "employer",
      };
    });

    return NextResponse.json({ items: annotated });
  } catch (e) {
    return errorResponse(e);
  }
}
