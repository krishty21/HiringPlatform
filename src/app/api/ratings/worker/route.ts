// GET /api/ratings/worker/[userId]? — public worker rating summary
// Public endpoint (no auth — used by employer candidate detail pages).
// Returns { avg, count, breakdown } for all ratings where rateeId === userId.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { errorResponse, HTTPError } from "@/lib/authz";
import { getWorkerRatingSummary } from "@/lib/ratings";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");
    if (!userId) throw new HTTPError(400, "MISSING_USERID");

    // userId can be either a User.id or a WorkerProfile.id; we accept WorkerProfile.id
    // and resolve to userId via the profile (so employer-side calls can use the
    // worker profile id they already have from /api/worker/[id]).
    let resolvedUserId = userId;
    const profile = await db.workerProfile.findUnique({
      where: { id: userId },
      select: { userId: true },
    });
    if (profile) resolvedUserId = profile.userId;

    const summary = await getWorkerRatingSummary(db, resolvedUserId);
    return NextResponse.json(summary);
  } catch (e) {
    return errorResponse(e);
  }
}
