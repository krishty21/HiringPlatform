// /c/[slug] — Public Kaam Card (PUB-01, PUB-03).
// Server component: fetches worker from db directly, gates by passportPublic.
// If disabled, renders KaamCardDisabled (no other data exposed).
// If not found, calls notFound() → 404.
// If public, renders the client-side KaamCard component with public-safe fields.
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import {
  KaamCard,
  type PublicWorkerData,
} from "@/components/public/KaamCard";
import {
  KaamCardDisabled,
  KaamCardHeader,
  KaamCardNotFound,
} from "@/components/public/KaamCardShared";
import { PublicFooter } from "@/components/public/PublicFooter";
import { getWorkerRatingSummary } from "@/lib/ratings";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const worker = await db.workerProfile.findUnique({
    where: { id: slug },
    select: {
      fullName: true,
      passportPublic: true,
      city: true,
      trade: { select: { nameEn: true } },
    },
  });
  if (!worker || !worker.passportPublic) {
    return {
      title: "Kaam Card · Jobhunt",
      description: "Jobhunt — A bridge between India's skilled hands and honest work.",
    };
  }
  const firstName = worker.fullName.split(/\s+/)[0];
  const tradeName = worker.trade?.nameEn ?? "Skilled worker";
  const title = `${firstName} — ${tradeName} | Jobhunt Kaam Card`;
  const description = `${firstName} is a ${tradeName.toLowerCase()} in ${worker.city}. Verified through Jobhunt's Skill Passport.`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      siteName: "Jobhunt",
      type: "profile",
      images: [
        {
          url: `/c/${slug}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: `${firstName} — ${tradeName}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`/c/${slug}/opengraph-image`],
    },
  };
}

export default async function PublicKaamCardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const worker = await db.workerProfile.findUnique({
    where: { id: slug },
    include: {
      trade: { select: { nameEn: true, nameHi: true, nameTe: true } },
      skills: {
        include: {
          skill: {
            select: { nameEn: true, nameHi: true, nameTe: true, category: true },
          },
        },
        orderBy: { proficiency: "desc" },
      },
    },
  });

  if (!worker) {
    // PUB-01 AC: 404 when worker doesn't exist
    return (
      <KaamCardShell>
        <KaamCardNotFound />
      </KaamCardShell>
    );
  }

  if (!worker.passportPublic) {
    // PUB-03 AC: toggle removes public access; show disabled view (no other data exposed)
    return (
      <KaamCardShell>
        <KaamCardDisabled />
      </KaamCardShell>
    );
  }

  // Public-safe trust journey (dates only — no doc contents, no PII):
  // first approved ID doc + first approved skill cert review timestamps.
  const [firstIdDoc, firstSkillDoc, applicationCount, hireCount, ratingSummary] = await Promise.all([
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
    db.application.count({ where: { workerId: worker.id } }),
    db.application.count({ where: { workerId: worker.id, status: "hired" } }),
    getWorkerRatingSummary(db, worker.userId),
  ]);

  // PII minimization: first name only; no email, phone, photo, lat/lng, address beyond city.
  const firstName = worker.fullName.split(/\s+/)[0];
  const publicData: PublicWorkerData = {
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
    city: worker.city,
    wageMin: worker.wageMin,
    wageMax: worker.wageMax,
    shiftPref: worker.shiftPref as "day" | "night" | "any",
    availableToday: worker.availableToday,
    trustTier: worker.trustTier as "new" | "id_verified" | "skill_verified" | "top_pro",
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
    // Round 11: public stats (counts only — no PII, no employer names).
    stats: {
      applicationsSent: applicationCount,
      hires: hireCount,
      ratingAvg: ratingSummary.avg,
      ratingCount: ratingSummary.count,
    },
  };

  return (
    <KaamCardShell>
      <KaamCard worker={publicData} />
    </KaamCardShell>
  );
}

function KaamCardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-surface-sunken">
      <KaamCardHeader />
      <main className="flex-1 px-4 sm:px-6 py-8 sm:py-12 flex items-start justify-center">
        <div className="w-full max-w-3xl">{children}</div>
      </main>
      <PublicFooter />
    </div>
  );
}
