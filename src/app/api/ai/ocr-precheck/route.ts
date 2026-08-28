// POST /api/ai/ocr-precheck — VER-05 (COULD) — Optional OCR pre-extraction step
// that runs BEFORE a verification doc is queued for admin review. Worker or
// employer auth. If the configured AI provider implements `ocrPrecheck`,
// returns the extracted name + cert_type (PII-minimized — no raw ID numbers).
// If it doesn't (Mock provider doesn't; ZAI provider doesn't), returns a
// graceful "Manual review required" payload so the admin drawer can show the
// same hint WS3 already renders.
//
// Per directive §3.3 + the AIProvider interface (frozen), `ocrPrecheck` is an
// OPTIONAL method on the provider — we duck-type it at runtime.
//
// Body: { fileUrl: string (signed storage path under /storage), docType: "id" | "skill_cert" | "company" }
// Returns: { name: string | null, cert_type: string | null, note: string }
import { NextResponse } from "next/server";
import { requireUser, errorResponse, HTTPError } from "@/lib/authz";
import { getAIProvider } from "@/lib/ai";
import { z } from "zod";

const OcrPrecheckBody = z.object({
  fileUrl: z.string().min(1).max(500),
  docType: z.enum(["id", "skill_cert", "company"]),
});

const MANUAL_REVIEW_FALLBACK = {
  name: null as string | null,
  cert_type: null as string | null,
  note: "Manual review required",
};

export async function POST(req: Request) {
  try {
    // Worker or employer — admins don't upload verification docs themselves.
    await requireUser(["worker", "employer"]);

    const body = await req.json();
    const parsed = OcrPrecheckBody.parse(body);

    const provider = getAIProvider();

    // Duck-type: the frozen AIProvider interface marks ocrPrecheck as optional.
    // If the active provider (Mock by default) doesn't implement it, fall back
    // gracefully to "Manual review required" — admin still sees the doc in queue.
    const maybeProvider = provider as {
      ocrPrecheck?: (fileUrl: string) => Promise<{ name: string | null; cert_type: string | null } | null>;
    };

    if (typeof maybeProvider.ocrPrecheck !== "function") {
      return NextResponse.json(MANUAL_REVIEW_FALLBACK);
    }

    try {
      const result = await maybeProvider.ocrPrecheck(parsed.fileUrl);
      if (!result) {
        return NextResponse.json(MANUAL_REVIEW_FALLBACK);
      }
      return NextResponse.json({
        name: result.name,
        cert_type: result.cert_type,
        note: result.name || result.cert_type ? "Auto-extracted" : "Manual review required",
      });
    } catch {
      // Any provider error → graceful fallback. Never throw 500 on a COULD feature.
      return NextResponse.json(MANUAL_REVIEW_FALLBACK);
    }
  } catch (e) {
    if (e instanceof HTTPError) return errorResponse(e);
    return errorResponse(e);
  }
}
