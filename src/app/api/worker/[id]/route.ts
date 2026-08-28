// GET /api/worker/[id] — candidate Skill Passport view for employers (EMP-04).
// Employer auth; returns worker + trade + skills (with proficiency) + endorsements.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireEmployer, errorResponse, HTTPError } from "@/lib/authz";
import { haversineKm } from "@/lib/matching/haversine";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { profile } = await requireEmployer();
    const { id } = await params;
    const worker = await db.workerProfile.findUnique({
      where: { id },
      include: {
        trade: { select: { nameEn: true } },
        skills: { include: { skill: { select: { nameEn: true, category: true } } } },
        endorsements: {
          include: {
            skill: { select: { nameEn: true } },
            employer: { select: { companyName: true, isVerified: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });
    if (!worker) throw new HTTPError(404, "NOT_FOUND");

    // Distance from caller's employer city (use employer's job lat/lng centroid; cheap heuristic)
    const employer = await db.employerProfile.findUnique({
      where: { id: profile.id },
      select: { city: true },
    });
    const centroid = await db.workerProfile.findFirst({
      where: { city: employer?.city ?? undefined },
      select: { lat: true, lng: true },
    });
    const distanceKm = centroid
      ? Math.round(haversineKm(worker.lat, worker.lng, centroid.lat, centroid.lng) * 10) / 10
      : null;

    let languagesArr: string[] = [];
    try { languagesArr = JSON.parse(worker.languages) as string[]; } catch {}

    return NextResponse.json({
      id: worker.id,
      fullName: worker.fullName,
      tradeId: worker.tradeId,
      tradeName: worker.trade?.nameEn ?? null,
      yearsExp: worker.yearsExp,
      city: worker.city,
      wageMin: worker.wageMin,
      wageMax: worker.wageMax,
      shiftPref: worker.shiftPref,
      bio: worker.bio,
      photoUrl: worker.photoUrl,
      availableToday: worker.availableToday,
      trustTier: worker.trustTier,
      trustScore: worker.trustScore,
      profileViews: worker.profileViews,
      passportPublic: worker.passportPublic,
      languages: languagesArr,
      skills: worker.skills.map(s => ({
        skillId: s.skillId,
        proficiency: s.proficiency,
        nameEn: s.skill.nameEn,
        category: s.skill.category,
      })),
      endorsements: worker.endorsements.map(e => ({
        id: e.id,
        comment: e.comment,
        createdAt: e.createdAt.toISOString(),
        skillName: e.skill.nameEn,
        companyName: e.employer.companyName,
        employerVerified: e.employer.isVerified,
      })),
      distanceKm,
    });
  } catch (e) {
    return errorResponse(e);
  }
}
