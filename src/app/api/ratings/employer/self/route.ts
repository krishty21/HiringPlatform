// GET /api/ratings/employer/self — employer auth, returns the caller's own
// rating summary (avg, count, breakdown). Used by the EmployerReputationCard
// on /employer/dashboard.
//
// Round 9 (additive). Frozen contracts untouched. Mirrors the public
// /api/ratings/employer?userId=… shape so the same UI components can consume
// it. The only difference: requires employer auth and resolves `userId` from
// the session instead of the query string.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireEmployer, errorResponse } from "@/lib/authz";
import { getEmployerRatingSummary } from "@/lib/ratings";

export async function GET() {
  try {
    const { user } = await requireEmployer();
    const summary = await getEmployerRatingSummary(db, user.id);
    return NextResponse.json(summary);
  } catch (e) {
    return errorResponse(e);
  }
}
