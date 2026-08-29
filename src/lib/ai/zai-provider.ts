// ZAIProvider — uses z-ai-web-dev-sdk for real LLM extraction + description.
// Active only when AI_PROVIDER=zai and the SDK is reachable. Falls back to Mock
// silently on any failure (per directive: graceful degradation over hard failure).
import type { AIProvider } from "./provider";
import type { VoiceProfileJSON, JobDescriptionInput } from "@/lib/schemas";
import { MockProvider } from "./mock-provider";

// Lazily import the SDK so this module never breaks the client bundle when unused.
async function getSDK() {
  try {
    const mod = await import("z-ai-web-dev-sdk");
    return mod;
  } catch {
    return null;
  }
}

const TRADES = [
  "Electrician", "Plumber", "Welder", "CNC Operator", "Fitter",
  "Delivery Executive", "Carpenter", "Mason",
];

const CITIES = [
  "Bhimavaram", "Tadepalligudem", "Rajahmundry", "Vijayawada", "Visakhapatnam",
  "Hyderabad", "Guntur", "Nellore", "Tirupati", "Kakinada",
];

export const ZAIProvider: AIProvider = {
  name: "zai",
  async extractVoiceProfile(transcript: string, lang: "en" | "hi" | "te"): Promise<VoiceProfileJSON> {
    const sdk = await getSDK();
    if (!sdk) return MockProvider.extractVoiceProfile(transcript, lang);
    try {
      const sys = `You are an information extraction service. Given a speech transcript, return STRICT JSON with keys: trade (one of ${JSON.stringify(TRADES)} or null), yearsExp (integer or null), wageMin (₹/day integer or null), wageMax (₹/day integer or null), bio (string), languages (array of "en"|"hi"|"te"), city (one of ${JSON.stringify(CITIES)} or null), confidence (0-1). No prose.`;
      const resp = await sdk.chat.completions.create({
        messages: [
          { role: "system", content: sys },
          { role: "user", content: transcript },
        ],
      }) as { choices?: { message?: { content?: string } }[] };
      const raw = resp.choices?.[0]?.message?.content ?? "";
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) return MockProvider.extractVoiceProfile(transcript, lang);
      const parsed = JSON.parse(match[0]);
      return {
        trade: parsed.trade ?? null,
        yearsExp: typeof parsed.yearsExp === "number" ? parsed.yearsExp : null,
        wageMin: typeof parsed.wageMin === "number" ? parsed.wageMin : null,
        wageMax: typeof parsed.wageMax === "number" ? parsed.wageMax : null,
        bio: typeof parsed.bio === "string" ? parsed.bio : "",
        languages: Array.isArray(parsed.languages) ? parsed.languages : [lang],
        city: parsed.city ?? null,
        confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
      };
    } catch {
      return MockProvider.extractVoiceProfile(transcript, lang);
    }
  },
  async generateJobDescription(f: JobDescriptionInput): Promise<string> {
    const sdk = await getSDK();
    if (!sdk) return MockProvider.generateJobDescription(f);
    try {
      const sys = "You write 3-4 sentence job descriptions for India blue-collar roles. Plain text, no markdown, no headings. Always mention wage, shift, city, headcount.";
      const user = `Title: ${f.title}\nTrade: ${f.tradeId}\nHeadcount: ${f.headcount}\nWage: ₹${f.wageMin}-${f.wageMax}/day\nCity: ${f.city}\nShift: ${f.shift}\nUrgent: ${f.isUrgent}`;
      const resp = await sdk.chat.completions.create({
        messages: [{ role: "system", content: sys }, { role: "user", content: user }],
      }) as { choices?: { message?: { content?: string } }[] };
      const out = resp.choices?.[0]?.message?.content?.trim();
      if (!out) return MockProvider.generateJobDescription(f);
      return out;
    } catch {
      return MockProvider.generateJobDescription(f);
    }
  },
};
