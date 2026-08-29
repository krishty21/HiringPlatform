// ShramSetu — frozen AI provider interface (directive P0.8)
// Default: MockProvider (deterministic). Optional real: ZAIProvider (uses z-ai-web-dev-sdk).
// Zero key configured = Mock, silently. App shell shows "AI: demo mode" indicator.
import type { VoiceProfileJSON, JobDescriptionInput } from "@/lib/schemas";

export interface AIProvider {
  name: "mock" | "zai";
  extractVoiceProfile(transcript: string, lang: "en" | "hi" | "te"): Promise<VoiceProfileJSON>;
  generateJobDescription(fields: JobDescriptionInput): Promise<string>;
  ocrPrecheck?(fileUrl: string): Promise<{ name: string | null; cert_type: string | null } | null>;
}

export type { VoiceProfileJSON, JobDescriptionInput };
