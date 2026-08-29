// GET /api/ratings/employer?userId=<User.id> — public employer rating summary
// Used by worker application detail page to display employer avg rating.
// Accepts either User.id or EmployerProfile.id (resolves to userId internally).
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { errorResponse, HTTPError } from "@/lib/authz";
import { getEmployerRatingSummary } from "@/lib/ratings";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");
    if (!userId) throw new HTTPError(400, "MISSING_USERID");

    let resolvedUserId = userId;
    const profile = await db.employerProfile.findUnique({
      where: { id: userId },
      select: { userId: true },
    });
    if (profile) resolvedUserId = profile.userId;

    const summary = await getEmployerRatingSummary(db, resolvedUserId);
    return NextResponse.json(summary);
  } catch (e) {
    return errorResponse(e);
  }
}
