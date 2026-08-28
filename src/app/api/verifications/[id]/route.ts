// GET /api/verifications/:id — fetch a single doc (owner only).
// Issues a fresh signed-URL token so the owner can preview the file.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser, errorResponse, HTTPError } from "@/lib/authz";
import { signFileToken } from "@/lib/storage/sign";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireUser(["worker", "employer"]);

    const doc = await db.verificationDocument.findUnique({ where: { id } });
    if (!doc) throw new HTTPError(404, "NOT_FOUND");
    if (doc.ownerUserId !== user.id) throw new HTTPError(403, "FORBIDDEN");

    // Resolve skill name (masked label) for skill_cert
    let skillName: string | null = null;
    if (doc.docType === "skill_cert") {
      const m = doc.fileName.match(/::skill:(.+)$/);
      if (m) {
        const s = await db.skill.findUnique({ where: { id: m[1] }, select: { nameEn: true } });
        skillName = s?.nameEn ?? null;
      }
    }

    const maskedLabel = doc.docType === "id"
      ? "ID Proof"
      : doc.docType === "company"
        ? "Company Registration"
        : skillName ? `Skill Certificate — ${skillName}` : "Skill Certificate";

    const displayFileName = doc.fileName.replace(/::skill:.+$/, "");

    const previewToken = signFileToken(doc.fileUrl, user.id, 3600);

    return NextResponse.json({
      id: doc.id,
      docType: doc.docType,
      maskedLabel,
      displayFileName,
      fileType: doc.fileType,
      status: doc.status,
      reviewerNote: doc.reviewerNote,
      reviewedAt: doc.reviewedAt?.toISOString() ?? null,
      submittedAt: doc.createdAt.toISOString(),
      previewToken,
      skillName,
      // Never expose: full ID number, raw bytes, fileUrl path
    });
  } catch (e) {
    return errorResponse(e);
  }
}
