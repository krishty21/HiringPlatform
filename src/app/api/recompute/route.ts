// POST /api/recompute — admin-only fallback path to recompute a worker's trust
// score OR an employer's verified flag. WS2's hire+endorse flow normally
// triggers `recomputeWorkerTrust` server-side; this endpoint is the manual
// admin override (used by an admin to fix a stale tier without re-approving
// a doc).
//
// Body: { workerId?: string } OR { employerId?: string }
// Returns: { workerId?, trustScore?, trustTier? } OR { employerId?, isVerified? }
//
// Trust formula: SRD §8.2 — see src/lib/trust/recompute.ts (frozen, called only).
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, errorResponse, HTTPError } from "@/lib/authz";
import { recomputeWorkerTrust, recomputeEmployerVerified } from "@/lib/trust/recompute";

export async function POST(req: Request) {
  try {
    await requireAdmin();

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      throw new HTTPError(400, "VALIDATION");
    }
    const { workerId, employerId } = body as { workerId?: string; employerId?: string };

    if (workerId && !employerId) {
      // Worker trust recompute — SRD §8.2 (30 + 20 + 10×certs(cap 30)
      // + 5×hires(cap 10) + 4×endorsements(cap 12) → max 100).
      // Verify the worker exists so we don't silently no-op.
      const exists = await db.workerProfile.findUnique({
        where: { id: workerId },
        select: { id: true },
      });
      if (!exists) throw new HTTPError(404, "NOT_FOUND");

      const result = await recomputeWorkerTrust(db, workerId);
      return NextResponse.json({
        workerId,
        trustScore: result.trustScore,
        trustTier: result.trustTier,
      });
    }

    if (employerId && !workerId) {
      // Employer verified recompute — looks at approved company docs only.
      const exists = await db.employerProfile.findUnique({
        where: { id: employerId },
        select: { id: true },
      });
      if (!exists) throw new HTTPError(404, "NOT_FOUND");

      const isVerified = await recomputeEmployerVerified(db, employerId);
      return NextResponse.json({ employerId, isVerified });
    }

    // Either exactly one of {workerId, employerId} must be present.
    throw new HTTPError(400, "VALIDATION");
  } catch (e) {
    return errorResponse(e);
  }
}
