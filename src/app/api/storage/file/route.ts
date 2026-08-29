// GET /api/storage/file?token=... — stream bytes for a privately-stored file.
// VER-01 AC: "File stored; publicly inaccessible" — this is the ONLY way to
// retrieve a stored verification document; the token is HMAC-signed and
// short-lived (default 1 hour). Invalid/expired → 403. Missing file → 404.
import { promises as fs } from "fs";
import path from "path";
import { getStorageDir, verifyFileToken } from "@/lib/storage/sign";
import { errorResponse, HTTPError } from "@/lib/authz";

const EXT_MIME: Record<string, string> = {
  ".pdf": "application/pdf",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

function mimeFromName(storedName: string): string {
  const ext = path.extname(storedName).toLowerCase();
  return EXT_MIME[ext] ?? "application/octet-stream";
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    if (!token) throw new HTTPError(400, "VALIDATION");

    const verified = verifyFileToken(token);
    if (!verified) throw new HTTPError(403, "FORBIDDEN");

    // Defense in depth: storedName must be a plain filename (no path separators)
    const storedName = path.basename(verified.storedName);
    if (storedName !== verified.storedName) {
      throw new HTTPError(400, "VALIDATION");
    }

    const storageDir = getStorageDir();
    const fullPath = path.join(storageDir, storedName);

    // Read the file from disk
    let buf: Buffer;
    try {
      buf = await fs.readFile(fullPath);
    } catch {
      throw new HTTPError(404, "NOT_FOUND");
    }

    const mime = mimeFromName(storedName);
    // Node's Buffer is a Uint8Array subclass at runtime; TS 5.7's stricter
    // generic Uint8Array<ArrayBufferLike> isn't directly assignable to BlobPart
    // / BodyInit. Copy to a plain ArrayBuffer (a valid BodyInit) and pass via
    // a Blob so we get a typed Content-Type out of the box.
    const ab = new ArrayBuffer(buf.byteLength);
    new Uint8Array(ab).set(buf);
    const blob = new Blob([ab as BlobPart], { type: mime });
    return new Response(blob, {
      status: 200,
      headers: {
        "content-type": mime,
        "content-length": String(buf.length),
        // Prevent embedding on other origins
        "x-content-type-options": "nosniff",
        "cache-control": "private, max-age=300",
        // PDFs are previewed in iframe; images in <img>. We do not allow
        // Content-Disposition: attachment (would force download) so inline
        // preview works, but we set CSP-ish hint via x-content-type-options.
      },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
