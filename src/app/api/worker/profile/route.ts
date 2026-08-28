// GET /api/worker/profile — fetch the caller's own WorkerProfile (worker auth).
// PATCH /api/worker/profile — update availableToday/passportPublic (and other allowed fields).
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireWorker, errorResponse, HTTPError } from "@/lib/authz";
import { z } from "zod";

// Patch body — workers can update availableToday + passportPublic + a curated set of profile fields.
const PatchWorkerProfileBody = z.object({
  availableToday: z.boolean().optional(),
  passportPublic: z.boolean().optional(),
  fullName: z.string().min(2).max(80).optional(),
  yearsExp: z.number().int().min(0).max(50).optional(),
  city: z.string().min(2).optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  wageMin: z.number().int().min(0).max(10000).optional(),
  wageMax: z.number().int().min(0).max(10000).optional(),
  shiftPref: z.enum(["day", "night", "any"]).optional(),
  languages: z.array(z.enum(["en", "hi", "te"])).optional(),
  bio: z.string().max(500).optional(),
  photoUrl: z.string().url().nullable().optional(),
  maxRadiusKm: z.number().int().min(1).max(200).optional(),
});

export async function GET() {
  try {
    const { user } = await requireWorker();
    const wp = await db.workerProfile.findUnique({
      where: { userId: user.id },
      include: {
        trade: true,
        skills: { include: { skill: true } },
        endorsements: {
          include: {
            skill: { select: { nameEn: true } },
            employer: { select: { companyName: true, isVerified: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });
    if (!wp) throw new HTTPError(404, "NOT_FOUND");

    let languagesArr: string[] = [];
    try { languagesArr = JSON.parse(wp.languages) as string[]; } catch {}

    // Profile-strength computation per directive
    const requiredFilled =
      (!!wp.tradeId ? 1 : 0) +
      (wp.yearsExp > 0 ? 1 : 0) +
      (wp.city ? 1 : 0) +
      (wp.wageMin > 0 || wp.wageMax > 0 ? 1 : 0) +
      (wp.shiftPref ? 1 : 0) +
      (languagesArr.length > 0 ? 1 : 0) +
      (!!wp.bio ? 1 : 0);
    let strength = 30 + 10 * requiredFilled;
    strength += Math.min(25, 5 * wp.skills.length);
    if (wp.bio && wp.bio.length > 50) strength += 10;
    if (wp.photoUrl) strength += 10;
    if (wp.trustTier !== "new") strength += 10;
    strength = Math.min(100, strength);

    return NextResponse.json({
      id: wp.id,
      userId: wp.userId,
      fullName: wp.fullName,
      tradeId: wp.tradeId,
      trade: wp.trade,
      yearsExp: wp.yearsExp,
      city: wp.city,
      lat: wp.lat,
      lng: wp.lng,
      wageMin: wp.wageMin,
      wageMax: wp.wageMax,
      shiftPref: wp.shiftPref,
      languages: languagesArr,
      bio: wp.bio,
      photoUrl: wp.photoUrl,
      availableToday: wp.availableToday,
      trustTier: wp.trustTier,
      trustScore: wp.trustScore,
      passportPublic: wp.passportPublic,
      profileViews: wp.profileViews,
      maxRadiusKm: wp.maxRadiusKm,
      profileStrength: strength,
      skills: wp.skills.map(s => ({
        skillId: s.skillId,
        proficiency: s.proficiency,
        skill: s.skill,
      })),
      endorsements: wp.endorsements.map(e => ({
        id: e.id,
        comment: e.comment,
        createdAt: e.createdAt.toISOString(),
        skillName: e.skill.nameEn,
        companyName: e.employer.companyName,
        employerVerified: e.employer.isVerified,
      })),
    });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function PATCH(req: Request) {
  try {
    const { user } = await requireWorker();
    const body = await req.json();
    const parsed = PatchWorkerProfileBody.parse(body);

    // Serialize languages if provided
    const data: Record<string, unknown> = { ...parsed };
    if (parsed.languages) data.languages = JSON.stringify(parsed.languages);

    const updated = await db.workerProfile.update({
      where: { userId: user.id },
      data,
      select: {
        id: true,
        availableToday: true,
        passportPublic: true,
        profileViews: true,
      },
    });
    return NextResponse.json(updated);
  } catch (e) {
    return errorResponse(e);
  }
}
