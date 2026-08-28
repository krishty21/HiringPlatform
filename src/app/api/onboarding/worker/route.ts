// POST /api/onboarding/worker — create the caller's WorkerProfile.
// Worker auth (a user with role=worker who hasn't onboarded yet).
// Validates the body with the frozen OnboardWorkerBody zod schema.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser, errorResponse, HTTPError } from "@/lib/authz";
import { OnboardWorkerBody } from "@/lib/schemas";

export async function POST(req: Request) {
  try {
    const user = await requireUser(["worker"]);

    // Reject if the worker already has a profile
    const existing = await db.workerProfile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (existing) {
      throw new HTTPError(409, "ALREADY_ONBOARDED");
    }

    const body = await req.json();
    const parsed = OnboardWorkerBody.parse(body);

    // Resolve the trade to ensure it exists
    const trade = await db.skill.findUnique({ where: { id: parsed.tradeId } });
    if (!trade) throw new HTTPError(400, "VALIDATION");

    const profile = await db.workerProfile.create({
      data: {
        userId: user.id,
        fullName: parsed.fullName,
        tradeId: parsed.tradeId,
        yearsExp: parsed.yearsExp,
        city: parsed.city,
        lat: parsed.lat,
        lng: parsed.lng,
        wageMin: parsed.wageMin,
        wageMax: parsed.wageMax,
        shiftPref: parsed.shiftPref,
        languages: JSON.stringify(parsed.languages),
        bio: parsed.bio ?? "",
        photoUrl: parsed.photoUrl ?? null,
        availableToday: parsed.availableToday,
        passportPublic: true,
        maxRadiusKm: parsed.maxRadiusKm,
      },
    });

    // Attach worker skills if provided
    if (parsed.skills.length > 0) {
      await db.workerSkill.createMany({
        data: parsed.skills.map(s => ({
          workerId: profile.id,
          skillId: s.skillId,
          proficiency: s.proficiency,
        })),
        skipDuplicates: true,
      });
    }

    // Pre-compute match scores against all open jobs so the feed has them ready
    const jobs = await db.job.findMany({
      where: { status: "open" },
      include: { skills: { select: { skillId: true, required: true } } },
    });
    const skills = parsed.skills.map(s => ({ skillId: s.skillId, proficiency: s.proficiency }));
    const { computeMatch } = await import("@/lib/matching/score");
    for (const j of jobs) {
      const s = computeMatch({
        worker: {
          id: profile.id,
          tradeId: parsed.tradeId,
          yearsExp: parsed.yearsExp,
          lat: parsed.lat,
          lng: parsed.lng,
          wageMin: parsed.wageMin,
          wageMax: parsed.wageMax,
          shiftPref: parsed.shiftPref,
          trustTier: "new",
          maxRadiusKm: parsed.maxRadiusKm,
          skills,
        },
        job: {
          id: j.id,
          tradeId: j.tradeId,
          wageMin: j.wageMin,
          wageMax: j.wageMax,
          lat: j.lat,
          lng: j.lng,
          shift: j.shift,
          isUrgent: j.isUrgent,
          skills: j.skills.map(s => ({ skillId: s.skillId, required: s.required })),
        },
      });
      await db.matchScore.upsert({
        where: { jobId_workerId: { jobId: j.id, workerId: profile.id } },
        update: { score: s.score, breakdownJson: JSON.stringify(s.breakdown), computedAt: new Date() },
        create: { jobId: j.id, workerId: profile.id, score: s.score, breakdownJson: JSON.stringify(s.breakdown) },
      }).catch(() => {});
    }

    return NextResponse.json({ id: profile.id, status: "ok" }, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
