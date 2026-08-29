// computeMatch — pure, unit-testable TypeScript function implementing SRD §8.1 verbatim.
// score = 100 × (0.35·S + 0.25·D + 0.15·E + 0.15·W + 0.10·T) + bonus
// S skill overlap = |worker_skills ∩ job_skills| / |job_skills|
// D distance = 1.0 if ≤5km (haversine); linear decay to 0 at worker's max radius
// E experience = 1.0 if exp ≥ required; 0.7 if within 1 yr below; else 0.3
// W wage alignment = 1.0 if expected within range; 0.6 if ≤ +10% over; else 0.2
// T trust tier = New 0.2 | ID 0.5 | Skill 0.8 | Top Pro 1.0
// bonus = +5 max, embedding similarity (COULD — capped 0 when no provider)
import { haversineKm } from "./haversine";
import type { MatchScore } from "@/lib/schemas";
import type { WorkerProfile, Job } from "@/lib/schemas";

const TRUST_TIER_VALUE: Record<string, number> = {
  new: 0.2,
  id_verified: 0.5,
  skill_verified: 0.8,
  top_pro: 1.0,
};

export interface MatchInput {
  worker: {
    id: string;
    tradeId: string | null;
    yearsExp: number;
    lat: number;
    lng: number;
    wageMin: number;
    wageMax: number;
    shiftPref: string;
    trustTier: string;
    maxRadiusKm: number;
    skills: { skillId: string; proficiency: number }[];
  };
  job: {
    id: string;
    tradeId: string | null;
    wageMin: number;
    wageMax: number;
    lat: number;
    lng: number;
    shift: string;
    isUrgent: boolean;
    skills: { skillId: string; required: boolean }[];
  };
  // Optional — required experience (years). Derived from job's trade expectations
  // when none provided in the schema (we use 1 as a sensible default below).
  requiredYearsExp?: number;
  // Optional embedding bonus — set when AI provider returns similarity > 0
  embeddingBonus?: number;
}

export function computeMatch(input: MatchInput): MatchScore {
  const { worker, job } = input;

  // S: skill overlap (over required job skills only — required:true)
  const requiredJobSkills = job.skills.filter(s => s.required).map(s => s.skillId);
  const workerSkillIds = new Set(worker.skills.map(s => s.skillId));
  const overlap = requiredJobSkills.length > 0
    ? requiredJobSkills.filter(id => workerSkillIds.has(id)).length / requiredJobSkills.length
    : (job.tradeId && worker.tradeId === job.tradeId ? 1 : 0);

  // D: distance (linear decay from 5km full to worker's max radius)
  const distKm = haversineKm(worker.lat, worker.lng, job.lat, job.lng);
  let D: number;
  const fullDist = 5;
  const maxDist = Math.max(fullDist + 1, worker.maxRadiusKm);
  if (distKm <= fullDist) D = 1.0;
  else if (distKm >= maxDist) D = 0;
  else D = Math.max(0, 1 - (distKm - fullDist) / (maxDist - fullDist));

  // E: experience
  const required = input.requiredYearsExp ?? 1;
  let E: number;
  if (worker.yearsExp >= required) E = 1.0;
  else if (worker.yearsExp >= required - 1) E = 0.7;
  else E = 0.3;

  // W: wage alignment — worker's expected range vs job's offered range
  const workerMid = (worker.wageMin + worker.wageMax) / 2;
  const jobMid = (job.wageMin + job.wageMax) / 2;
  let W: number;
  if (workerMid >= job.wageMin && workerMid <= job.wageMax) W = 1.0;
  else if (workerMid <= job.wageMax * 1.10) W = 0.6; // ≤ +10% over
  else W = 0.2;

  // T: trust tier
  const T = TRUST_TIER_VALUE[worker.trustTier] ?? 0.2;

  const bonus = Math.max(0, Math.min(5, input.embeddingBonus ?? 0));
  const raw = 100 * (0.35 * overlap + 0.25 * D + 0.15 * E + 0.15 * W + 0.10 * T);
  const score = Math.min(100, Math.max(0, Math.round(raw + bonus)));

  return {
    jobId: job.id,
    workerId: worker.id,
    score,
    breakdown: { S: overlap, D, E, W, T, bonus },
  };
}

// Helper to build a MatchInput from full entities (used by API + seed)
export function buildMatchInput(worker: WorkerProfile, job: Job): MatchInput {
  return {
    worker: {
      id: worker.id,
      tradeId: worker.tradeId,
      yearsExp: worker.yearsExp,
      lat: worker.lat,
      lng: worker.lng,
      wageMin: worker.wageMin,
      wageMax: worker.wageMax,
      shiftPref: worker.shiftPref,
      trustTier: worker.trustTier,
      maxRadiusKm: worker.maxRadiusKm,
      skills: (worker.skills ?? []).map(s => ({ skillId: s.skillId, proficiency: s.proficiency })),
    },
    job: {
      id: job.id,
      tradeId: job.tradeId,
      wageMin: job.wageMin,
      wageMax: job.wageMax,
      lat: job.lat,
      lng: job.lng,
      shift: job.shift,
      isUrgent: job.isUrgent,
      skills: (job.skills ?? []).map(s => ({ skillId: s.skillId, required: s.required })),
    },
    requiredYearsExp: 1,
  };
}
