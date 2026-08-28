// /api/verifications — worker/employer document upload + own-list.
// VER-01 (worker ID / skill cert upload), VER-04 (employer company doc upload).
// VER-06 (PII minimization): we never read or store raw ID numbers; only
// doc type, file bytes, and (optionally) the linked skillId for skill certs.
// Storage is private (persistUpload writes to /storage with mode 0o600); files
// are only retrievable via signed-URL tokens issued by /api/storage/sign.
import { NextResponse } from "next/server";
import path from "path";
import { db } from "@/lib/db";
import { requireUser, errorResponse, HTTPError } from "@/lib/authz";
import { UploadVerificationBody } from "@/lib/schemas";
import { persistUpload, signFileToken } from "@/lib/storage/sign";
import { getAIProvider } from "@/lib/ai";

// Allowed MIME types and size cap (must match zod schema in schemas/index.ts)
const ALLOWED_TYPES = new Set(["application/pdf", "image/jpeg", "image/png"]);
const MAX_BYTES = 5 * 1024 * 1024;

// POST /api/verifications — multipart/form-data with fields:
//   file: File (PDF/JPG/PNG, ≤5MB)
//   docType: "id" | "skill_cert" | "company"
//   fileName: string
//   fileType: application/pdf | image/jpeg | image/png
//   fileSize: number
//   skillId?: string (required when docType === "skill_cert")
export async function POST(req: Request) {
  try {
    const user = await requireUser(["worker", "employer"]);

    const form = await req.formData();
    const file = form.get("file");
    const docType = form.get("docType");
    const fileName = form.get("fileName");
    const fileType = form.get("fileType");
    const fileSize = form.get("fileSize");
    const skillId = form.get("skillId");

    if (!(file instanceof Blob)) {
      return errorResponse(new HTTPError(400, "VALIDATION"));
    }

    // Assemble metadata object for zod validation
    const metaObj: Record<string, unknown> = {
      docType: docType?.toString() ?? "",
      fileName: fileName?.toString() ?? "",
      fileType: fileType?.toString() ?? "",
      fileSize: Number(fileSize?.toString() ?? "0"),
    };
    if (skillId) metaObj.skillId = skillId.toString();

    const parsed = UploadVerificationBody.safeParse(metaObj);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "VALIDATION", issues: parsed.error.issues },
        { status: 400 },
      );
    }
    const meta = parsed.data;

    // Server-side re-validation of file (do not trust client metadata)
    if (!ALLOWED_TYPES.has(meta.fileType)) {
      return NextResponse.json(
        { error: "VALIDATION", message: "Unsupported file type" },
        { status: 400 },
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "VALIDATION", message: "File exceeds 5MB limit" },
        { status: 400 },
      );
    }

    // If skill_cert, the skill must exist
    if (meta.docType === "skill_cert" && meta.skillId) {
      const skill = await db.skill.findUnique({ where: { id: meta.skillId }, select: { id: true } });
      if (!skill) return errorResponse(new HTTPError(400, "VALIDATION"));
    }

    // Worker uploading company doc or employer uploading id doc is a category mismatch —
    // enforce role↔docType alignment to prevent privilege confusion.
    if (meta.docType === "company" && user.role !== "employer") {
      return errorResponse(new HTTPError(403, "FORBIDDEN"));
    }
    if ((meta.docType === "id" || meta.docType === "skill_cert") && user.role !== "worker") {
      return errorResponse(new HTTPError(403, "FORBIDDEN"));
    }

    // Read raw bytes from the Blob and persist to disk
    const arrayBuffer = await file.arrayBuffer();
    const buf = Buffer.from(arrayBuffer);
    const storedName = await persistUpload(buf, meta.fileName);

    // VER-05 (COULD): OCR pre-check if the AI provider supports it.
    // Mock provider has no ocrPrecheck → extractedJson stays "{}" and admin
    // queue will show "Manual review required".
    let extracted: Record<string, unknown> = {};
    try {
      const provider = getAIProvider();
      if (typeof provider.ocrPrecheck === "function") {
        // The provider would fetch the URL itself; we don't currently expose
        // an internal URL to it, so this is a no-op in the Mock path. When
        // ZAI is active and supports ocrPrecheck, this can be wired up.
        const result = await provider.ocrPrecheck(storedName);
        if (result && (result.name || result.cert_type)) {
          // PII-minimized: only the name + cert type, never any ID number
          if (result.name) extracted.name = result.name;
          if (result.cert_type) extracted.cert_type = result.cert_type;
        }
      }
    } catch {
      // OCR never blocks upload — fall back to manual review
    }

    // VER-06 (PII minimization): never persist the user's original filename,
    // which could carry an Aadhaar / PAN number (e.g. "aadhaar-1234-5678-9012.pdf").
    // We replace it with a masked, doc-type-derived name and the original
    // extension only. skillId is suffixed as ::skill:<id> for later resolution.
    const ext = path.extname(meta.fileName).toLowerCase() || `.${meta.fileType.split("/")[1] ?? "bin"}`;
    let safeFileName = meta.docType === "id"
      ? `id-proof${ext}`
      : meta.docType === "company"
        ? `company-registration${ext}`
        : `skill-cert${ext}`;
    if (meta.docType === "skill_cert" && meta.skillId) {
      safeFileName = `${safeFileName}::skill:${meta.skillId}`;
    }

    const doc = await db.verificationDocument.create({
      data: {
        ownerUserId: user.id,
        docType: meta.docType,
        fileName: safeFileName,
        fileType: meta.fileType,
        fileUrl: storedName,
        extractedJson: JSON.stringify(extracted),
        status: "pending",
      },
    });

    // Issue a fresh signed-URL token so the uploader can preview immediately
    const token = signFileToken(storedName, user.id, 3600);

    return NextResponse.json(
      { id: doc.id, status: doc.status, previewToken: token },
      { status: 201 },
    );
  } catch (e) {
    return errorResponse(e);
  }
}

// GET /api/verifications — list the caller's own submitted docs (VER-02).
// Returns masked labels only; raw ID numbers are never stored or returned.
export async function GET() {
  try {
    const user = await requireUser(["worker", "employer"]);
    const docs = await db.verificationDocument.findMany({
      where: { ownerUserId: user.id },
      orderBy: { createdAt: "desc" },
    });

    // Resolve skill names for skill_cert entries (for masked label "Skill Certificate — Electrician")
    const skillIds = docs
      .map((d) => {
        if (d.docType !== "skill_cert") return null;
        const m = d.fileName.match(/::skill:(.+)$/);
        return m ? m[1] : null;
      })
      .filter((x): x is string => !!x);

    const skills = skillIds.length
      ? await db.skill.findMany({ where: { id: { in: skillIds } }, select: { id: true, nameEn: true } })
      : [];
    const skillMap = new Map(skills.map((s) => [s.id, s.nameEn]));

    // Build masked payload
    const items = docs.map((d) => {
      // Strip the internal ::skill: suffix before returning the user-visible filename
      const displayFileName = d.fileName.replace(/::skill:.+$/, "");
      let maskedLabel = "ID Proof";
      if (d.docType === "skill_cert") {
        const m = d.fileName.match(/::skill:(.+)$/);
        const skillName = m ? skillMap.get(m[1]) : undefined;
        maskedLabel = skillName ? `Skill Certificate — ${skillName}` : "Skill Certificate";
      } else if (d.docType === "company") {
        maskedLabel = "Company Registration";
      }
      // Issue a fresh short-lived preview token for the owner
      const previewToken = signFileToken(d.fileUrl, user.id, 3600);
      return {
        id: d.id,
        docType: d.docType,
        maskedLabel,
        displayFileName,
        fileType: d.fileType,
        status: d.status,
        reviewerNote: d.reviewerNote,
        reviewedAt: d.reviewedAt?.toISOString() ?? null,
        submittedAt: d.createdAt.toISOString(),
        previewToken,
        skillName: d.docType === "skill_cert"
          ? (() => {
              const m = d.fileName.match(/::skill:(.+)$/);
              return m ? skillMap.get(m[1]) ?? null : null;
            })()
          : null,
      };
    });

    return NextResponse.json({ items });
  } catch (e) {
    return errorResponse(e);
  }
}
