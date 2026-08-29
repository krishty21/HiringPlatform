// Jobhunt — Worker↔Employer rating flow (ROADMAP R16).
// Self-contained module: ratings zod schemas + summary helpers + eligibility.
// FROZEN contracts respected:
//   - prisma/schema.prisma Rating model is unchanged (already had all fields)
//   - src/lib/schemas/index.ts untouched — rating schemas live here
//   - src/lib/trust/recompute.ts untouched — ratings do NOT feed into trust score
//     (displayed as a separate signal on the Skill Passport / candidate detail)
import { z } from "zod";
import type { PrismaClient } from "@prisma/client";

// ---- schemas (NEW; not in frozen src/lib/schemas/index.ts) ----
export const CreateRatingBody = z.object({
  applicationId: z.string().min(1),
  score: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional().or(z.literal("")),
});
export type CreateRatingInput = z.infer<typeof CreateRatingBody>;

export const RatingSchema = z.object({
  id: z.string(),
  applicationId: z.string(),
  raterId: z.string(),
  rateeId: z.string(),
  score: z.number().int().min(1).max(5),
  comment: z.string(),
  createdAt: z.string(),
  // Direction relative to the current viewer: "given" (I rated them) | "received" (they rated me)
  direction: z.enum(["given", "received"]).optional(),
  raterRole: z.enum(["worker", "employer"]).optional(),
});
export type Rating = z.infer<typeof RatingSchema>;

export interface RatingSummary {
  avg: number;     // 0-5 (one decimal)
  count: number;
  breakdown: { score: number; count: number }[]; // 5..1
}

export const EMPTY_SUMMARY: RatingSummary = {
  avg: 0,
  count: 0,
  breakdown: [5, 4, 3, 2, 1].map(score => ({ score, count: 0 })),
};

// Per SRD §R16: rating prompt appears 24h after hiredAt. Configurable.
export const RATING_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export function canRate(
  now: number,
  hiredAt: Date | null,
): { eligible: boolean; reason?: string } {
  if (!hiredAt) return { eligible: false, reason: "NOT_HIRED" };
  if (now - hiredAt.getTime() < RATING_COOLDOWN_MS) {
    return { eligible: false, reason: "COOLDOWN" };
  }
  return { eligible: true };
}

// ---- DB helpers ----
// Worker's average rating FROM employers (ratee = worker.userId).
export async function getWorkerRatingSummary(
  db: PrismaClient,
  workerUserId: string,
): Promise<RatingSummary> {
  const rows = await db.rating.findMany({
    where: { rateeId: workerUserId },
    select: { score: true },
  });
  return summarize(rows.map(r => r.score));
}

// Employer's average rating FROM workers (ratee = employer.userId).
export async function getEmployerRatingSummary(
  db: PrismaClient,
  employerUserId: string,
): Promise<RatingSummary> {
  const rows = await db.rating.findMany({
    where: { rateeId: employerUserId },
    select: { score: true },
  });
  return summarize(rows.map(r => r.score));
}

// All ratings tied to an application — visible to both participants.
export async function getRatingsForApplication(
  db: PrismaClient,
  applicationId: string,
): Promise<{ id: string; applicationId: string; raterId: string; rateeId: string; score: number; comment: string; createdAt: Date }[]> {
  return db.rating.findMany({
    where: { applicationId },
    orderBy: { createdAt: "desc" },
  });
}

// Has the given rater already rated this application?
export async function raterHasRated(
  db: PrismaClient,
  applicationId: string,
  raterId: string,
): Promise<boolean> {
  const count = await db.rating.count({
    where: { applicationId, raterId },
  });
  return count > 0;
}

function summarize(scores: number[]): RatingSummary {
  if (scores.length === 0) return EMPTY_SUMMARY;
  const sum = scores.reduce((a, b) => a + b, 0);
  const avg = Math.round((sum / scores.length) * 10) / 10;
  const breakdown = [5, 4, 3, 2, 1].map(score => ({
    score,
    count: scores.filter(s => s === score).length,
  }));
  return { avg, count: scores.length, breakdown };
}

// Format a 0-5 average to a one-decimal display string ("4.2").
export function formatAvg(avg: number): string {
  return avg.toFixed(1);
}
