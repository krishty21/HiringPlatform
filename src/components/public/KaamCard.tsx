"use client";
import Link from "next/link";
import { useLanguage, type LanguageCode } from "@/lib/i18n/LanguageProvider";
import { TrustTierBadge } from "@/components/shared/TrustTierBadge";
import { WageDisplay } from "@/components/shared/WageDisplay";
import { TopRatedBadge } from "@/components/ratings/TopRatedBadge";
import { Button } from "@/components/ui/button";
import {
  MapPin, Briefcase, Clock, ShieldCheck, Lock, ArrowLeft, Check, IdCard, Award, Trophy,
  Share2,
} from "lucide-react";
import { toast } from "sonner";
import { useMemo, useState } from "react";

export type PublicWorkerSkill = {
  proficiency: number;
  nameEn: string;
  nameHi: string;
  nameTe: string;
  category: string;
};

export type PublicWorkerData = {
  id: string;
  firstName: string;
  trade: { nameEn: string; nameHi: string; nameTe: string } | null;
  yearsExp: number;
  city: string;
  wageMin: number;
  wageMax: number;
  shiftPref: "day" | "night" | "any";
  availableToday: boolean;
  trustTier: "new" | "id_verified" | "skill_verified" | "top_pro";
  trustScore: number;
  skills: PublicWorkerSkill[];
  slug: string;
  trustJourney?: {
    joinedAt: string;
    idVerifiedAt: string | null;
    skillVerifiedAt: string | null;
  };
  stats?: {
    applicationsSent: number;
    hires: number;
    ratingAvg: number;
    ratingCount: number;
  };
};

const TIER_INDEX: Record<PublicWorkerData["trustTier"], number> = {
  new: 0,
  id_verified: 1,
  skill_verified: 2,
  top_pro: 3,
};

const DATE_LOCALES: Record<LanguageCode, string> = { en: "en-IN", hi: "hi-IN", te: "te-IN" };

function formatJourneyDate(iso: string, lang: LanguageCode): string {
  try {
    return new Intl.DateTimeFormat(DATE_LOCALES[lang] ?? "en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

function pickLocalized(en: string, hi: string, te: string, lang: LanguageCode): string {
  if (lang === "hi") return hi || en;
  if (lang === "te") return te || en;
  return en;
}

// Public trust journey — compact milestone strip (dates only, no PII).
// Master Prompt §34: never expose PII the application intentionally protects.
function KaamTrustJourney({
  journey,
  trustTier,
}: {
  journey: NonNullable<PublicWorkerData["trustJourney"]>;
  trustTier: PublicWorkerData["trustTier"];
}) {
  const { t, lang } = useLanguage();

  type Milestone = {
    key: string;
    label: string;
    date: string | null;
    icon: typeof IdCard;
    dotClass: string;
  };

  const milestones: Milestone[] = [
    {
      key: "joined",
      label: t("kaamTrustJoined"),
      date: journey.joinedAt,
      icon: Briefcase,
      dotClass: "is-neutral",
    },
  ];
  if (journey.idVerifiedAt) {
    milestones.push({
      key: "id",
      label: t("kaamTrustIdVerified"),
      date: journey.idVerifiedAt,
      icon: IdCard,
      dotClass: "is-info",
    });
  }
  if (journey.skillVerifiedAt) {
    milestones.push({
      key: "skill",
      label: t("kaamTrustSkillVerified"),
      date: journey.skillVerifiedAt,
      icon: Award,
      dotClass: "is-positive",
    });
  }
  if (trustTier === "top_pro") {
    milestones.push({
      key: "top",
      label: t("kaamTrustTopPro"),
      date: null,
      icon: Trophy,
      dotClass: "is-warning",
    });
  }

  if (milestones.length < 2) return null;

  return (
    <section className="flex flex-col gap-3" aria-label={t("kaamTrustTitle")}>
      <h2 className="text-meta font-semibold uppercase tracking-wider text-ink-subtle">
        {t("kaamTrustTitle")}
      </h2>
      <ol className="relative flex flex-col sm:flex-row sm:items-stretch gap-0 rounded-md border border-border bg-surface p-3 sm:p-4 overflow-hidden">
        {milestones.map((m, idx) => {
          const Icon = m.icon;
          const isLast = idx === milestones.length - 1;
          return (
            <li
              key={m.key}
              className="relative flex items-start gap-3 py-2 sm:py-0 sm:flex-1 sm:flex-col sm:items-center sm:gap-2 sm:text-center"
            >
              {!isLast && (
                <span
                  aria-hidden
                  className="absolute left-[19px] top-[38px] bottom-0 w-px bg-border sm:left-[calc(50%+24px)] sm:right-[calc(-50%+24px)] sm:top-[19px] sm:bottom-auto sm:h-px sm:w-auto"
                />
              )}
              <span className="relative z-10 grid size-10 shrink-0 place-items-center rounded-full border-2 border-border bg-surface">
                <Icon className="size-[18px] text-ink-muted" aria-hidden />
                <span
                  className={`absolute -top-0.5 -right-0.5 size-2.5 rounded-full border-2 border-surface status-dot ${m.dotClass}`}
                  aria-hidden
                />
              </span>
              <span className="flex flex-col sm:items-center gap-0.5 min-w-0">
                <span className="text-sm font-semibold text-ink leading-tight">
                  {m.label}
                </span>
                {m.date ? (
                  <span className="text-meta text-ink-muted tabular-nums">
                    {formatJourneyDate(m.date, lang)}
                  </span>
                ) : null}
                {!m.date && m.key === "top" && (
                  <span className="text-meta font-medium text-ink-muted">
                    {t("trustTimelineNow")}
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

// Public worker stats — applications sent, hires, avg rating.
// Renders only when the worker has at least one application OR one rating.
function KaamStats({ stats }: { stats: NonNullable<PublicWorkerData["stats"]> }) {
  const { t } = useLanguage();
  const { applicationsSent, hires, ratingAvg, ratingCount } = stats;

  if (applicationsSent === 0 && ratingCount === 0) return null;

  const hireRate = applicationsSent > 0
    ? Math.round((hires / applicationsSent) * 100)
    : 0;
  const hasRating = ratingCount > 0 && ratingAvg > 0;

  const tiles: { key: string; value: string; label: string; desc: string }[] = [
    {
      key: "apps",
      value: String(applicationsSent),
      label: t("kaamCardStatsApplications"),
      desc: t("kaamCardStatsApplicationsDesc"),
    },
    {
      key: "hires",
      value: String(hires),
      label: t("kaamCardStatsHires"),
      desc: hires > 0
        ? t("kaamCardStatsHireRate", { pct: hireRate })
        : t("kaamCardStatsHiresDesc"),
    },
    {
      key: "rating",
      value: hasRating ? ratingAvg.toFixed(1) : "—",
      label: t("kaamCardStatsRating"),
      desc: hasRating
        ? (ratingCount === 1
            ? t("employerFromOne")
            : t("employerFromMany", { count: ratingCount }))
        : t("kaamCardStatsNotRated"),
    },
  ];

  return (
    <section className="flex flex-col gap-3" aria-label={t("kaamCardStatsTitle")}>
      <h2 className="text-meta font-semibold uppercase tracking-wider text-ink-subtle">
        {t("kaamCardStatsTitle")}
      </h2>
      <dl className="grid grid-cols-3 gap-2 rounded-md border border-border bg-surface p-3">
        {tiles.map((tile, idx) => (
          <div
            key={tile.key}
            className={`relative flex flex-col items-center text-center gap-1 px-1 py-2 ${
              idx < tiles.length - 1 ? "sm:border-r sm:border-border" : ""
            }`}
          >
            <dt className="text-meta font-semibold uppercase tracking-wide text-ink-subtle">
              {tile.label}
            </dt>
            <dd className="text-xl sm:text-2xl font-semibold tabular-nums text-ink leading-none">
              {tile.value}
            </dd>
            <dd className="text-meta text-ink-muted leading-tight line-clamp-2 max-w-[110px] text-pretty">
              {tile.desc}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function KaamCard({ worker }: { worker: PublicWorkerData }) {
  const { t, lang } = useLanguage();

  const tradeName = worker.trade
    ? pickLocalized(worker.trade.nameEn, worker.trade.nameHi, worker.trade.nameTe, lang)
    : "—";

  const isVerified = TIER_INDEX[worker.trustTier] >= TIER_INDEX.skill_verified;
  const baseUrl =
    typeof window !== "undefined" ? window.location.origin : "https://shramsetu.app";

  const shareUrl = `${baseUrl}/c/${worker.slug}`;
  const shareText = `${worker.firstName} — ${tradeName} | ShramSetu\n${shareUrl}`;

  const onWhatsAppShare = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    toast.success(t("kaamCardShareWhatsApp"));
  };

  const [copied, setCopied] = useState(false);

  const onCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success(shareUrl, {
        description: t("kaamCardPoweredBy"),
        duration: 4000,
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("errGeneric"));
    }
  };

  const initials = useMemo(() => {
    return worker.firstName.slice(0, 2).toUpperCase();
  }, [worker.firstName]);

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-4">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-ink transition-colors min-h-11"
      >
        <ArrowLeft className="size-4" aria-hidden />
        <span>{t("kaamCardBackToHome")}</span>
      </Link>

      <article className="passport-card rounded-md">
        {/* Verified stamp — dashed, rotated, no glow */}
        {isVerified && (
          <span
            className="passport-stamp absolute top-4 right-4 sm:top-6 sm:right-6 z-10 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-meta font-semibold uppercase tracking-wider"
            aria-label={t("kaamCardVerifiedStamp")}
          >
            <ShieldCheck className="size-3.5" aria-hidden />
            {t("kaamCardVerifiedStamp")}
          </span>
        )}

        <div className="p-6 sm:p-8 flex flex-col gap-6">
          {/* Header — name, trade, tier */}
          <header className="flex items-start gap-4 pr-16 sm:pr-20">
            <div
              className="size-16 sm:size-20 shrink-0 rounded-md bg-primary text-primary-foreground grid place-items-center text-2xl sm:text-3xl font-semibold"
              aria-hidden="true"
            >
              {initials}
            </div>
            <div className="flex flex-col gap-1.5 min-w-0">
              <p className="text-meta font-semibold uppercase tracking-wider text-ink-subtle">
                {t("kaamCardPublicBadge")}
              </p>
              <h1 className="text-2xl sm:text-3xl font-semibold text-ink break-words">
                {worker.firstName}
              </h1>
              <div className="flex flex-wrap items-center gap-2 mt-0.5">
                <span className="text-base sm:text-lg font-medium text-ink">
                  {tradeName}
                </span>
                <TrustTierBadge
                  tier={worker.trustTier}
                  score={worker.trustScore}
                  size="md"
                />
                <TopRatedBadge workerProfileId={worker.slug} />
              </div>
            </div>
          </header>

          {/* Identity row — verified trade, city, experience */}
          <section className="flex flex-wrap gap-3">
            {worker.availableToday && (
              <p className="inline-flex items-center gap-1.5 text-meta font-medium text-positive">
                <span className="status-dot is-positive" aria-hidden />
                {t("kaamCardAvailableToday")}
              </p>
            )}
            <p className="inline-flex items-center gap-1.5 text-meta text-ink-muted">
              <Briefcase className="size-3.5" aria-hidden />
              {worker.yearsExp} {t("kaamCardYears")} {t("kaamCardExperience").toLowerCase()}
            </p>
            <p className="inline-flex items-center gap-1.5 text-meta text-ink-muted">
              <MapPin className="size-3.5" aria-hidden />
              {worker.city}
            </p>
            <p className="inline-flex items-center gap-1.5 text-meta text-ink-muted">
              <Clock className="size-3.5" aria-hidden />
              {t(worker.shiftPref === "day" ? "shiftDay" : worker.shiftPref === "night" ? "shiftNight" : "shiftAny")}
            </p>
          </section>

          {/* Wage — bordered panel, no gradient */}
          <section className="rounded-md border border-border bg-surface-sunken p-4 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex flex-col gap-0.5">
              <p className="text-meta uppercase tracking-wider text-ink-subtle">
                {t("kaamCardWage")}
              </p>
              <p className="text-2xl font-semibold tabular-nums text-ink">
                <WageDisplay min={worker.wageMin} max={worker.wageMax} size="lg" />
              </p>
            </div>
            <p className="text-meta text-ink-subtle">{t("perDay")}</p>
          </section>

          {/* Skills — inline text, no chips. Skill verified marker on each row. */}
          {worker.skills.length > 0 && (
            <section className="flex flex-col gap-2">
              <h2 className="text-meta font-semibold uppercase tracking-wider text-ink-subtle">
                {t("kaamCardSkills")}
              </h2>
              <ul className="flex flex-col gap-1.5" aria-label={t("kaamCardSkills")}>
                {worker.skills.map((s, i) => (
                  <li
                    key={`${s.nameEn}-${i}`}
                    className="flex items-center justify-between gap-3 text-sm text-ink py-1.5 border-b border-border last:border-b-0"
                  >
                    <span className="font-medium">{pickLocalized(s.nameEn, s.nameHi, s.nameTe, lang)}</span>
                    <span
                      className="inline-flex items-center gap-0.5"
                      aria-label={`Proficiency ${s.proficiency} of 5`}
                    >
                      {Array.from({ length: 5 }).map((_, idx) => (
                        <span
                          key={idx}
                          aria-hidden
                          className={`size-1.5 rounded-full ${
                            idx < s.proficiency ? "bg-accent" : "bg-border"
                          }`}
                        />
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Trust journey — public milestone strip */}
          {worker.trustJourney && (
            <KaamTrustJourney journey={worker.trustJourney} trustTier={worker.trustTier} />
          )}

          {/* Public worker stats */}
          {worker.stats && <KaamStats stats={worker.stats} />}

          {/* "Verified by ShramSetu" — credential infrastructure framing */}
          <section className="flex items-center gap-2 text-meta text-ink-muted border-t border-border pt-4">
            <ShieldCheck className="size-4 text-positive shrink-0" aria-hidden />
            <span>{t("kaamCardVerifiedBy")}</span>
          </section>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              asChild
              size="lg"
              className="flex-1 min-h-12 text-base gap-2"
            >
              <Link href="/login" aria-label={t("kaamCardContact")}>
                <Lock className="size-4" aria-hidden />
                {t("kaamCardContact")}
              </Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="flex-1 min-h-12 text-base gap-2"
              onClick={onWhatsAppShare}
              aria-label={t("kaamCardShareWhatsApp")}
            >
              <ShieldCheck className="size-4" aria-hidden />
              {t("kaamCardShareWhatsApp")}
            </Button>
          </div>
          <p className="text-meta text-ink-muted text-center flex items-center justify-center gap-1.5">
            <ShieldCheck className="size-3.5 shrink-0" aria-hidden />
            {t("kaamCardContactHelp")}
          </p>

          {/* Copy-link row — subtle */}
          <button
            type="button"
            onClick={onCopyLink}
            className="self-center inline-flex items-center gap-1.5 text-meta text-ink-muted hover:text-ink transition-colors min-h-11 px-3"
            aria-label={t("copyPublicLink")}
            title={t("copyPublicLink")}
          >
            {copied ? (
              <Check className="size-3.5 text-positive" aria-hidden />
            ) : (
              <Share2 className="size-3.5" aria-hidden />
            )}
            <span>{t("kaamCardPoweredBy")}</span>
          </button>
        </div>
      </article>
    </div>
  );
}
