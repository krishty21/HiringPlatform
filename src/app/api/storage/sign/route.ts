// POST /api/storage/sign — issue a signed-URL token for a stored file.
// Two paths:
//   (a) Worker/employer previews their own doc → POST { docId } → server checks
//       ownership, issues a token bound to (storedName, ownerUserId=caller).
//   (b) Admin previews any worker/employer doc → POST { docId } → admin role
//       is checked, then a token is issued bound to (storedName, ownerUserId=doc.ownerUserId)
//       so the same token works for any admin previewing the file.
// Tokens are short-lived (1 hour) and HMAC-signed (see src/lib/storage/sign.ts).
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser, errorResponse, HTTPError } from "@/lib/authz";
import { signFileToken } from "@/lib/storage/sign";

const TTL_SEC = 3600;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const docId = body?.docId as string | undefined;
    if (!docId || typeof docId !== "string") {
      return errorResponse(new HTTPError(400, "VALIDATION"));
    }

    // Auth-first: try worker/employer (owner) path first; if that fails or
    // they don't own the doc, fall back to admin. We never expose doc
    // existence to unauthenticated callers — the doc lookup happens only
    // after auth resolves.
    let user;
    try {
      user = await requireUser(["worker", "employer"]);
    } catch {
      // Not a worker/employer — fall through to admin path
      user = null;
    }

    if (user) {
      const doc = await db.verificationDocument.findUnique({
        where: { id: docId },
        select: { fileUrl: true, ownerUserId: true },
      });
      if (!doc) throw new HTTPError(404, "NOT_FOUND");
      if (doc.ownerUserId !== user.id) throw new HTTPError(403, "FORBIDDEN");
      const token = signFileToken(doc.fileUrl, user.id, TTL_SEC);
      return NextResponse.json({ token, ttl: TTL_SEC });
    }

    // Admin path
    const admin = await requireUser(["admin"]);
    const doc = await db.verificationDocument.findUnique({
      where: { id: docId },
      select: { fileUrl: true, ownerUserId: true },
    });
    if (!doc) throw new HTTPError(404, "NOT_FOUND");
    // Admin signs a token bound to the doc's owner (so verifyFileToken works)
    const token = signFileToken(doc.fileUrl, doc.ownerUserId, TTL_SEC);
    return NextResponse.json({ token, ttl: TTL_SEC });
  } catch (e) {
    return errorResponse(e);
  }
}
