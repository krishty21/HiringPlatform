// POST /api/ai/voice-profile — extract structured profile fields from a voice transcript.
// Worker auth + zod VoiceProfileBody. Uses getAIProvider().extractVoiceProfile().
import { NextResponse } from "next/server";
import { requireWorker, errorResponse } from "@/lib/authz";
import { VoiceProfileBody } from "@/lib/schemas";
import { getAIProvider } from "@/lib/ai";

export async function POST(req: Request) {
  try {
    await requireWorker();
    const body = await req.json();
    const parsed = VoiceProfileBody.parse(body);
    const provider = getAIProvider();
    const result = await provider.extractVoiceProfile(parsed.transcript, parsed.lang);
    return NextResponse.json(result);
  } catch (e) {
    return errorResponse(e);
  }
}
