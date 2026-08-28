// Storage signed-URL helper (private bucket simulation in /storage).
// HMAC-signed short-lived token → /api/storage/file?token=...
import { createHash, createHmac } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { randomBytes } from "crypto";

const STORAGE_DIR = path.join(process.cwd(), "storage");
const SECRET = process.env.STORAGE_HMAC_SECRET ?? "shramsetu-dev-secret-please-rotate";

export function getStorageDir() { return STORAGE_DIR; }

// Persist uploaded bytes to disk and return the stored filename.
export async function persistUpload(buf: Buffer, fileName: string): Promise<string> {
  await fs.mkdir(STORAGE_DIR, { mode: 0o700 }).catch(() => {});
  const safeExt = path.extname(fileName).toLowerCase() || ".bin";
  const storedName = `${Date.now()}-${randomBytes(8).toString("hex")}${safeExt}`;
  await fs.writeFile(path.join(STORAGE_DIR, storedName), buf, { mode: 0o600 });
  return storedName;
}

// Issue a signed token for a stored file. TTL in seconds (default 1 hour).
export function signFileToken(storedName: string, ownerUserId: string, ttlSec = 3600): string {
  const exp = Math.floor(Date.now() / 1000) + ttlSec;
  const payload = `${storedName}|${ownerUserId}|${exp}`;
  const sig = createHmac("sha256", SECRET).update(payload).digest("hex");
  return Buffer.from(`${payload}|${sig}`).toString("base64url");
}

export function verifyFileToken(token: string): { storedName: string; ownerUserId: string; exp: number } | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const parts = decoded.split("|");
    if (parts.length !== 4) return null;
    const [storedName, ownerUserId, expStr, sig] = parts;
    const exp = parseInt(expStr, 10);
    if (isNaN(exp) || exp < Math.floor(Date.now() / 1000)) return null;
    const expected = createHmac("sha256", SECRET).update(`${storedName}|${ownerUserId}|${exp}`).digest("hex");
    if (sig !== expected) return null;
    return { storedName, ownerUserId, exp };
  } catch {
    return null;
  }
}

export function fileHash(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex").slice(0, 32);
}
