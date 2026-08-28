// Deterministic MockProvider — directive §10 rules:
// - regex/keyword extraction of years ("8 years" → 8), wages ("800 rupees"/"₹800" → wage),
//   trade keywords mapped against the skills taxonomy in all 3 languages,
//   remaining text as bio; unknown fields → null.
// - Must produce sensible output for "Nenu electrician, eight years experience, 800 rupees per day, Bhimavaram".
// - generateJobDescription: deterministic template filled from fields.
import type { AIProvider } from "./provider";
import type { VoiceProfileJSON, JobDescriptionInput } from "@/lib/schemas";

// Trade keyword map (the seed skills taxonomy uses these nameEn keys)
const TRADE_KEYWORDS: Record<"en" | "hi" | "te", Record<string, string>> = {
  en: {
    electrician: "Electrician", electricians: "Electrician", wireman: "Electrician",
    plumber: "Plumber", plumbing: "Plumber",
    welder: "Welder", welding: "Welder",
    cnc: "CNC Operator", "cnc operator": "CNC Operator",
    fitter: "Fitter",
    delivery: "Delivery Executive", driver: "Delivery Executive", "delivery executive": "Delivery Executive",
    carpenter: "Carpenter", carpentry: "Carpenter",
    mason: "Mason", masonry: "Mason",
  },
  hi: {
    बिजली: "Electrician", बिजलीकार: "Electrician",
    प्लंबर: "Plumber", प्लंबर: "Plumber",
    वेल्डर: "Welder",
    "सीएनसी": "CNC Operator", "सीएनसी ऑपरेटर": "CNC Operator",
    फिटर: "Fitter",
    डिलीवरी: "Delivery Executive", ड्राइवर: "Delivery Executive",
    बढ़ई: "Carpenter",
    राज: "Mason",
  },
  te: {
    ఎలక్ట్రీషియన్: "Electrician", కరెంట్: "Electrician",
    ప్లంబర్: "Plumber",
    వెల్డర్: "Welder",
    "సీఎన్సీ": "CNC Operator",
    ఫిట్టర్: "Fitter",
    డెలివరీ: "Delivery Executive", డ్రైవర్: "Delivery Executive",
    వడ్రంగి: "Carpenter",
    కట్టడం: "Mason",
  },
};

const WORD_TO_NUM: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
};

function parseYears(text: string): number | null {
  // "8 years", "8 yrs", "eight years"
  const m = text.match(/(\d+)\s*(?:years?|yrs?)/i);
  if (m) return parseInt(m[1], 10);
  const wordMatch = text.match(/\b(zero|one|two|three|four|five|six|seven|eight|nine|ten)\s*(?:years?|yrs?)/i);
  if (wordMatch) return WORD_TO_NUM[wordMatch[1].toLowerCase()] ?? null;
  return null;
}

function parseWage(text: string): { min: number | null; max: number | null } {
  // "₹800", "800 rupees", "800 per day", "800 to 1000 per day"
  const rangeMatch = text.match(/₹?\s*(\d{2,5})\s*(?:to|-)\s*₹?\s*(\d{2,5})\s*(?:rupees?|rs|₹|per\s*day)?/i);
  if (rangeMatch) {
    const a = parseInt(rangeMatch[1], 10);
    const b = parseInt(rangeMatch[2], 10);
    return { min: Math.min(a, b), max: Math.max(a, b) };
  }
  const single = text.match(/₹\s*(\d{2,5})|\b(\d{2,5})\s*(?:rupees?|rs|per\s*day)\b/i);
  if (single) {
    const v = parseInt(single[1] ?? single[2], 10);
    return { min: v, max: Math.round(v * 1.1) };
  }
  return { min: null, max: null };
}

const CITY_KEYWORDS = [
  "Bhimavaram", "Tadepalligudem", "Rajahmundry", "Vijayawada", "Visakhapatnam", "Vizag",
  "Hyderabad", "Guntur", "Nellore", "Tirupati", "Kakinada", "Anantapur",
];

function parseCity(text: string): string | null {
  for (const c of CITY_KEYWORDS) {
    if (new RegExp(c, "i").test(text)) return c;
  }
  return null;
}

export const MockProvider: AIProvider = {
  name: "mock",
  async extractVoiceProfile(transcript: string, lang: "en" | "hi" | "te"): Promise<VoiceProfileJSON> {
    const lower = transcript.toLowerCase();
    // find trade
    let trade: string | null = null;
    const kw = TRADE_KEYWORDS[lang] ?? TRADE_KEYWORDS.en;
    for (const [keyword, tradeName] of Object.entries(kw)) {
      if (lower.includes(keyword.toLowerCase())) { trade = tradeName; break; }
    }
    const yearsExp = parseYears(transcript);
    const wage = parseWage(transcript);
    const city = parseCity(transcript);
    // Strip parsed fragments out of the bio
    let bio = transcript
      .replace(/\b\d+\s*(?:years?|yrs?)\b/gi, "")
      .replace(/₹?\s*\d{2,5}\s*(?:to\s*₹?\s*\d{2,5}\s*)?(?:rupees?|rs|per\s*day)?/gi, "")
      .replace(new RegExp(CITY_KEYWORDS.join("|"), "gi"), "")
      .replace(new RegExp(Object.keys(kw).join("|"), "gi"), "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 280);
    if (!bio) bio = `${trade ?? "Worker"} from ${city ?? "Andhra Pradesh"}.`;
    const confidence = [trade, yearsExp, wage.min, city].filter(Boolean).length / 4;
    return {
      trade,
      yearsExp,
      wageMin: wage.min,
      wageMax: wage.max,
      bio: bio.charAt(0).toUpperCase() + bio.slice(1) + (bio.endsWith(".") ? "" : "."),
      languages: [lang],
      city,
      confidence,
    };
  },
  async generateJobDescription(f: JobDescriptionInput): Promise<string> {
    const urgent = f.isUrgent ? "Urgent requirement: " : "";
    const wage = f.wageMin === f.wageMax
      ? `₹${f.wageMin}/day`
      : `₹${f.wageMin}–₹${f.wageMax}/day`;
    const shiftText = f.shift === "day" ? "day shift" : f.shift === "night" ? "night shift" : "flexible shift";
    return `${urgent}Looking for ${f.headcount} skilled ${f.title.toLowerCase()} to join our team in ${f.city}. The role offers ${wage} on a ${shiftText}. Reliable candidates with proven trade experience and a strong work ethic will be preferred. Verified Skill Passport holders will be prioritised for shortlisting.`;
  },
};
