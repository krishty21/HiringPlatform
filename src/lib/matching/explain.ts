// explainMatch — top 3 plain-language reason strings, generated from the largest
// contributing components per SRD §8.1 + MAT-02.
import type { MatchScore } from "@/lib/schemas";

export interface ExplainInput {
  score: MatchScore;
  worker: { yearsExp: number; tradeName?: string | null; skillCount?: number };
  job: { skillCount: number; tradeName?: string | null; city: string; wageMin: number; wageMax: number };
  distanceKm: number;
}

export function explainMatch(input: ExplainInput): string[] {
  const { score, worker, job, distanceKm } = input;
  const b = score.breakdown;
  const reasons: { label: string; weight: number }[] = [];

  // Skill overlap label
  const overlapPct = Math.round(b.S * 100);
  if (job.skillCount > 0) {
    const matchedSkills = Math.round(b.S * job.skillCount);
    reasons.push({
      label: `${matchedSkills}/${job.skillCount} skills match`,
      weight: b.S * 0.35,
    });
  } else if (b.S >= 1) {
    reasons.push({ label: `Trade match (${worker.tradeName ?? "—"} )`, weight: 0.35 });
  }

  // Distance label
  const distStr = distanceKm < 1 ? `${Math.round(distanceKm * 1000)} m` : `${distanceKm.toFixed(1)} km`;
  reasons.push({
    label: distanceKm <= 5 ? `${distStr} away` : `${distStr} away (within radius)`,
    weight: b.D * 0.25,
  });

  // Wage label
  if (b.W >= 1) reasons.push({ label: "Wage within your range", weight: b.W * 0.15 });
  else if (b.W >= 0.6) reasons.push({ label: "Wage slightly above range", weight: b.W * 0.15 });
  else reasons.push({ label: "Wage below your range", weight: b.W * 0.15 });

  // Experience label (only when notable)
  if (b.E >= 1) {
    reasons.push({ label: `${worker.yearsExp} yrs experience`, weight: b.E * 0.15 });
  } else if (b.E < 0.5) {
    reasons.push({ label: `Below required experience`, weight: (1 - b.E) * 0.15 });
  }

  // Trust tier label (when high)
  if (b.T >= 0.8) reasons.push({ label: "Skill Verified worker", weight: b.T * 0.10 });
  else if (b.T >= 1) reasons.push({ label: "Top Pro worker", weight: b.T * 0.10 });

  // Sort by weighted contribution, take top 3
  return reasons.sort((a, b) => b.weight - a.weight).slice(0, 3).map(r => r.label);
}
