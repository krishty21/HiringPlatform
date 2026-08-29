// POST /api/ratings — create a worker↔employer rating (ROADMAP R16).
// Eligibility:
//   - Caller is logged-in (worker or employer)
//   - Application exists, status === 'hired', hiredAt + 24h elapsed
//   - Caller is a participant on the application (the worker OR the job's employer)
//   - Caller hasn't already rated this application
// Direction:
//   - worker caller → rater=worker.userId, ratee=job.employer.userId
//   - employer caller → rater=employer.userId, ratee=worker.userId
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser, errorResponse, HTTPError } from "@/lib/authz";
import { pushNotification } from "@/lib/notifications";
import {
  CreateRatingBody,
  canRate,
  raterHasRated,
  RATING_COOLDOWN_MS,
} from "@/lib/ratings";

export async function POST(req: Request) {
  try {
    const caller = await requireUser(["worker", "employer"]);
    const body = CreateRatingBody.parse(await req.json());
    const { applicationId, score, comment } = body;

    // Fetch application + related job + worker + employer user.
    const app = await db.application.findUnique({
      where: { id: applicationId },
      include: {
        job: { select: { employerId: true, employer: { select: { userId: true, companyName: true } } } },
        worker: { select: { id: true, userId: true, fullName: true } },
      },
    });
    if (!app) throw new HTTPError(404, "NOT_FOUND");
    if (app.status !== "hired") throw new HTTPError(409, "NOT_HIRED");

    // Cooldown check.
    const guard = canRate(Date.now(), app.hiredAt);
    if (!guard.eligible) {
      if (guard.reason === "COOLDOWN") {
        const remainingMs = RATING_COOLDOWN_MS - (Date.now() - (app.hiredAt?.getTime() ?? 0));
        const hoursLeft = Math.ceil(remainingMs / (60 * 60 * 1000));
        return NextResponse.json(
          { error: "COOLDOWN", hoursLeft },
          { status: 409 },
        );
      }
      throw new HTTPError(409, guard.reason ?? "INELIGIBLE");
    }

    // Direction + participant check.
    let raterId: string;
    let rateeId: string;
    if (caller.role === "worker") {
      // Caller must be the application's worker.
      if (app.worker.userId !== caller.id) throw new HTTPError(403, "FORBIDDEN");
      raterId = caller.id;
      rateeId = app.job.employer.userId;
    } else {
      // Caller must be the job's employer.
      if (app.job.employer.userId !== caller.id) throw new HTTPError(403, "FORBIDDEN");
      raterId = caller.id;
      rateeId = app.worker.userId;
    }

    // Idempotency: one rating per (rater, application).
    if (await raterHasRated(db, applicationId, raterId)) {
      throw new HTTPError(409, "ALREADY_RATED");
    }

    const rating = await db.rating.create({
      data: {
        applicationId,
        raterId,
        rateeId,
        score,
        comment: comment ?? "",
      },
      select: {
        id: true,
        applicationId: true,
        raterId: true,
        rateeId: true,
        score: true,
        comment: true,
        createdAt: true,
      },
    });

    // Round 8: notify the ratee in-app (+ WS relay when the mini-service is up).
    // Fire-and-forget — a notification failure must never fail the rating itself.
    // Payload routing: worker ratee → application detail; employer ratee → candidate page.
    const raterName = caller.role === "worker"
      ? app.worker.fullName
      : app.job.employer.companyName;
    try {
      await pushNotification(rateeId, "rating", {
        raterName,
        raterRole: caller.role,
        score,
        applicationId,
        ...(caller.role === "worker" ? { candidateId: app.worker.id } : {}),
      });
    } catch {
      // non-critical
    }

    return NextResponse.json({
      ...rating,
      createdAt: rating.createdAt.toISOString(),
    }, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
