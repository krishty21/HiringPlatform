// PATCH /api/admin/verifications/:id — approve or reject a pending doc (ADM-01).
// VER-02: transitions are auditable (reviewedAt, reviewedBy, reviewerNote).
// VER-03: approval triggers recomputeWorkerTrust (id|skill_cert) or
// recomputeEmployerVerified (company) → badge upgrade visible on next load.
// VER-06: reviewerNote is the only free-text field and must never contain
// raw ID numbers; we log it but we never log file contents.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, errorResponse, HTTPError } from "@/lib/authz";
import { PatchVerificationBody } from "@/lib/schemas";
import { recomputeWorkerTrust, recomputeEmployerVerified } from "@/lib/trust/recompute";
import { pushNotification } from "@/lib/notifications";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;

    const body = await req.json();
    const parsed = PatchVerificationBody.parse(body);

    const doc = await db.verificationDocument.findUnique({ where: { id } });
    if (!doc) throw new HTTPError(404, "NOT_FOUND");
    // Don't allow re-reviewing an already-closed doc; admin must reopen if needed
    if (doc.status !== "pending") {
      return NextResponse.json(
        { error: "ALREADY_REVIEWED", currentStatus: doc.status },
        { status: 409 },
      );
    }

    // PII minimization: reviewerNote is the only free-text field. We do not
    // append any ID number; we trust admins to keep notes clean.
    const updated = await db.verificationDocument.update({
      where: { id },
      data: {
        status: parsed.status,
        reviewerNote: parsed.reviewerNote ?? "",
        reviewedAt: new Date(),
        reviewedBy: admin.id,
        ...(parsed.extractedJson ? { extractedJson: parsed.extractedJson } : {}),
      },
    });

    // VER-03: bump trust / verified flag on approval
    let trust: { trustScore: number; trustTier: string } | null = null;
    let employerVerified: boolean | null = null;
    if (parsed.status === "approved") {
      if (doc.docType === "id" || doc.docType === "skill_cert") {
        const wp = await db.workerProfile.findUnique({
          where: { userId: doc.ownerUserId },
          select: { id: true },
        });
        if (wp) {
          trust = await recomputeWorkerTrust(db, wp.id);
        }
      } else if (doc.docType === "company") {
        const ep = await db.employerProfile.findUnique({
          where: { userId: doc.ownerUserId },
          select: { id: true },
        });
        if (ep) {
          employerVerified = await recomputeEmployerVerified(db, ep.id);
        }
      }
    }

    // Notify owner (VER-02 auditability + WRK-10 bell)
    const maskedLabel = doc.docType === "id"
      ? "ID Proof"
      : doc.docType === "company"
        ? "Company Registration"
        : "Skill Certificate";
    await pushNotification(doc.ownerUserId, "verification", {
      docId: doc.id,
      docType: maskedLabel,
      status: parsed.status,
    });

    return NextResponse.json({
      id: updated.id,
      status: updated.status,
      reviewedAt: updated.reviewedAt?.toISOString() ?? null,
      reviewedBy: updated.reviewedBy,
      reviewerNote: updated.reviewerNote,
      trust,
      employerVerified,
    });
  } catch (e) {
    return errorResponse(e);
  }
}
