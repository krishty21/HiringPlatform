// POST /api/ai/job-description — generate a 3-4 sentence job description from structured fields.
// Per directive §10 + NFR-10: human-in-the-loop — output is editable by the caller before posting.
// Employer auth. WS4 territory but created here because the route did not yet exist.
import { NextResponse } from "next/server";
import { requireEmployer, errorResponse } from "@/lib/authz";
import { JobDescriptionBody } from "@/lib/schemas";
import { getAIProvider } from "@/lib/ai";
import { rateLimit, clientKey, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    const { user } = await requireEmployer();

    // LLM cost protection (STATUS.md finding #4): 10 req/min per employer,
    // keyed by user AFTER auth so anonymous callers can't burn AI spend.
    const rl = rateLimit(clientKey(req, user.id), { limit: 10, windowMs: 60_000 });
    if (!rl.ok) return rateLimitResponse(rl.retryAfterSec);

    const body = await req.json();
    const parsed = JobDescriptionBody.parse(body);
    const provider = getAIProvider();
    const description = await provider.generateJobDescription(parsed);
    return NextResponse.json({ description });
  } catch (e) {
    return errorResponse(e);
  }
}
