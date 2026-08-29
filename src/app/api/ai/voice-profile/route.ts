// POST /api/ai/voice-profile — extract structured profile fields from a voice transcript.
// Worker auth + zod VoiceProfileBody. Uses getAIProvider().extractVoiceProfile().
import { NextResponse } from "next/server";
import { requireWorker, errorResponse } from "@/lib/authz";
import { VoiceProfileBody } from "@/lib/schemas";
import { getAIProvider } from "@/lib/ai";
import { rateLimit, clientKey, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    const { user } = await requireWorker();

    // LLM cost protection (STATUS.md finding #4): 10 req/min per worker,
    // keyed by user AFTER auth so anonymous callers can't burn AI spend.
    const rl = rateLimit(clientKey(req, user.id), { limit: 10, windowMs: 60_000 });
    if (!rl.ok) return rateLimitResponse(rl.retryAfterSec);

    const body = await req.json();
    const parsed = VoiceProfileBody.parse(body);
    const provider = getAIProvider();
    const result = await provider.extractVoiceProfile(parsed.transcript, parsed.lang);
    return NextResponse.json(result);
  } catch (e) {
    return errorResponse(e);
  }
}
