// GET /api/public/worker/[slug] — public Kaam Card data (PUB-01 support).
// No auth. Returns only public-safe fields — no PII beyond first name.
// 404 when worker not found OR passportPublic=false (PUB-03 privacy toggle).
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { HTTPError, errorResponse } from "@/lib/authz";
import { getWorkerRatingSummary } from "@/lib/ratings";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const worker = await db.workerProfile.findUnique({
      where: { id: slug },
      include: {
        trade: { select: { nameEn: true, nameHi: true, nameTe: true } },
        skills: {
          include: {
            skill: { select: { nameEn: true, nameHi: true, nameTe: true, category: true } },
          },
          orderBy: { proficiency: "desc" },
        },
      },
    });

    if (!worker) throw new HTTPError(404, "NOT_FOUND");
    if (!worker.passportPublic) throw new HTTPError(404, "NOT_FOUND"); // PUB-03 privacy

    // Public-safe trust journey (dates only — no doc contents, no PII).
    const [firstIdDoc, firstSkillDoc] = await Promise.all([
      db.verificationDocument.findFirst({
        where: { ownerUserId: worker.userId, docType: "id", status: "approved" },
        orderBy: { reviewedAt: "asc" },
        select: { reviewedAt: true },
      }),
      db.verificationDocument.findFirst({
        where: { ownerUserId: worker.userId, docType: "skill_cert", status: "approved" },
        orderBy: { reviewedAt: "asc" },
        select: { reviewedAt: true },
      }),
    ]);

    // Round 11: public stats — counts only (no PII, no employer names).
    // Applications sent, hires, avg rating (if any). All values already public
    // by aggregation; nothing here can identify a specific employer or co-worker.
    const [applicationCount, hireCount, ratingSummary] = await Promise.all([
      db.application.count({ where: { workerId: worker.id } }),
      db.application.count({ where: { workerId: worker.id, status: "hired" } }),
      getWorkerRatingSummary(db, worker.userId),
    ]);

    // PII minimization — PUB-01: only first name; no last name, email, phone, photo, lat/lng.
    const firstName = worker.fullName.split(/\s+/)[0] || worker.fullName;

    return NextResponse.json(
      {
        id: worker.id,
        firstName,
        trade: worker.trade
          ? {
              nameEn: worker.trade.nameEn,
              nameHi: worker.trade.nameHi,
              nameTe: worker.trade.nameTe,
            }
          : null,
        yearsExp: worker.yearsExp,
        city: worker.city, // city only — no full address, no lat/lng
        wageMin: worker.wageMin,
        wageMax: worker.wageMax,
        shiftPref: worker.shiftPref,
        availableToday: worker.availableToday,
        trustTier: worker.trustTier, // new | id_verified | skill_verified | top_pro
        trustScore: worker.trustScore,
        skills: worker.skills.map((s) => ({
          proficiency: s.proficiency,
          nameEn: s.skill.nameEn,
          nameHi: s.skill.nameHi,
          nameTe: s.skill.nameTe,
          category: s.skill.category,
        })),
        slug: worker.id,
        trustJourney: {
          joinedAt: worker.createdAt.toISOString(),
          idVerifiedAt: firstIdDoc?.reviewedAt?.toISOString() ?? null,
          skillVerifiedAt: firstSkillDoc?.reviewedAt?.toISOString() ?? null,
        },
        // Round 11: public stats (counts only, no PII).
        stats: {
          applicationsSent: applicationCount,
          hires: hireCount,
          ratingAvg: ratingSummary.avg,
          ratingCount: ratingSummary.count,
        },
        // NOTE: deliberately NOT included: fullName, lastName, email, phone, photoUrl,
        // lat, lng, languages, bio, profileViews, maxRadiusKm, passportPublic, userId.
      },
      {
        headers: {
          "cache-control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
        },
      },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
