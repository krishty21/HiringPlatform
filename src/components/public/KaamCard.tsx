"use client";
import Link from "next/link";
import { useLanguage, type LanguageCode } from "@/lib/i18n/LanguageProvider";
import { TrustTierBadge } from "@/components/shared/TrustTierBadge";
import { WageDisplay } from "@/components/shared/WageDisplay";
import { TopRatedBadge } from "@/components/ratings/TopRatedBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  MapPin,
  Briefcase,
  Clock,
  Star,
  Share2,
  ShieldCheck,
  Lock,
  ArrowLeft,
  Check,
  IdCard,
  Award,
  Trophy,
  Sparkles,
} from "lucide-react";
import { motion } from "framer-motion";
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
};

const TIER_INDEX: Record<PublicWorkerData["trustTier"], number> = {
  new: 0,
  id_verified: 1,
  skill_verified: 2,
  top_pro: 3,
};

// Locale map for date formatting — follows the card's language toggle.
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

// Public trust journey — compact milestone strip (dates only, no PII).
// Shows what the worker has achieved on ShramSetu so employers can
// gauge trust at a glance without logging in.
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
    icon: typeof Sparkles;
    iconClass: string;
    ringClass: string;
  };

  const milestones: Milestone[] = [
    {
      key: "joined",
      label: t("kaamTrustJoined"),
      date: journey.joinedAt,
      icon: Sparkles,
      iconClass: "text-muted-foreground",
      ringClass: "border-border bg-muted/40",
    },
  ];
  if (journey.idVerifiedAt) {
    milestones.push({
      key: "id",
      label: t("kaamTrustIdVerified"),
      date: journey.idVerifiedAt,
      icon: IdCard,
      iconClass: "text-sky-700",
      ringClass: "border-sky-200 bg-sky-50",
    });
  }
  if (journey.skillVerifiedAt) {
    milestones.push({
      key: "skill",
      label: t("kaamTrustSkillVerified"),
      date: journey.skillVerifiedAt,
      icon: Award,
      iconClass: "text-emerald-700",
      ringClass: "border-emerald-200 bg-emerald-50",
    });
  }
  if (trustTier === "top_pro") {
    milestones.push({
      key: "top",
      label: t("kaamTrustTopPro"),
      date: null,
      icon: Trophy,
      iconClass: "text-amber-700",
      ringClass: "border-amber-200 bg-amber-50",
    });
  }

  // Nothing achieved beyond joining → don't render the strip.
  if (milestones.length < 2) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15, ease: "easeOut" }}
      className="flex flex-col gap-3"
      aria-label={t("kaamTrustTitle")}
    >
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {t("kaamTrustTitle")}
      </h2>
      <ol className="relative flex flex-col sm:flex-row sm:items-stretch gap-0 sm:gap-0 rounded-xl border border-border bg-gradient-to-br from-card/80 to-secondary/30 p-3 sm:p-4 overflow-hidden">
        {/* subtle top hairline */}
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/25 to-transparent"
        />
        {milestones.map((m, idx) => {
          const Icon = m.icon;
          const isLast = idx === milestones.length - 1;
          return (
            <motion.li
              key={m.key}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.2 + idx * 0.08 }}
              className="relative flex items-start gap-3 py-2 sm:py-0 sm:flex-1 sm:flex-col sm:items-center sm:gap-2 sm:text-center"
            >
              {/* connector — vertical on mobile, horizontal on sm+ */}
              {!isLast && (
                <span
                  aria-hidden
                  className="absolute left-[19px] top-[38px] bottom-0 w-px bg-gradient-to-b from-border to-transparent sm:left-[calc(50%+24px)] sm:right-[calc(-50%+24px)] sm:top-[19px] sm:bottom-auto sm:h-px sm:w-auto sm:bg-gradient-to-r"
                />
              )}
              <span
                className={`relative z-10 grid size-10 shrink-0 place-items-center rounded-full border-2 ${m.ringClass}`}
              >
                <Icon className={`size-[18px] ${m.iconClass}`} aria-hidden />
              </span>
              <span className="flex flex-col sm:items-center gap-0.5 min-w-0">
                <span className="text-sm font-semibold text-foreground leading-tight">
                  {m.label}
                </span>
                {m.date && (
                  <span className="text-xs text-muted-foreground">
                    {formatJourneyDate(m.date, lang)}
                  </span>
                )}
                {!m.date && m.key === "top" && (
                  <span className="text-xs font-medium text-amber-700">{t("trustTimelineNow")}</span>
                )}
              </span>
            </motion.li>
          );
        })}
      </ol>
    </motion.section>
  );
}

function pickLocalized(
  en: string,
  hi: string,
  te: string,
  lang: LanguageCode,
): string {
  if (lang === "hi") return hi || en;
  if (lang === "te") return te || en;
  return en;
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
      // graceful fallback
      toast.error(t("errGeneric"));
    }
  };

  const initials = useMemo(() => {
    return worker.firstName.slice(0, 2).toUpperCase();
  }, [worker.firstName]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="w-full max-w-2xl mx-auto"
    >
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
      >
        <ArrowLeft className="size-4" />
        <span>{t("kaamCardBackToHome")}</span>
      </Link>

      <Card className="passport-card relative overflow-hidden">
        {/* Verified stamp (rotated dashed border) */}
        {isVerified && (
          <div
            className="passport-stamp absolute top-4 right-4 sm:top-6 sm:right-6 z-10 px-3 py-1.5 rounded-md bg-accent/10"
            aria-label={t("kaamCardVerifiedStamp")}
          >
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
              <ShieldCheck className="size-4" />
              {t("kaamCardVerifiedStamp")}
            </div>
          </div>
        )}

        <CardContent className="p-6 sm:p-8 flex flex-col gap-6">
          {/* Header: initials avatar + name + trade + tier */}
          <header className="flex items-start gap-4 pr-16">
            <div
              className="size-16 sm:size-20 shrink-0 rounded-full bg-primary text-primary-foreground grid place-items-center text-2xl sm:text-3xl font-bold"
              aria-hidden="true"
            >
              {initials}
            </div>
            <div className="flex flex-col gap-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("kaamCardPublicBadge")}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground break-words">
                {worker.firstName}
              </h1>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className="text-base sm:text-lg font-medium text-foreground">
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

          {/* Available-today chip */}
          <div className="flex flex-wrap gap-2">
            <Badge
              variant="outline"
              className={
                worker.availableToday
                  ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                  : "bg-muted/50 text-muted-foreground"
              }
            >
              <Clock className="size-3.5" />
              {worker.availableToday
                ? t("kaamCardAvailableToday")
                : t("kaamCardNotAvailableToday")}
            </Badge>
            <Badge variant="outline" className="bg-card">
              <Briefcase className="size-3.5" />
              {t("kaamCardExperience")} · {worker.yearsExp} {t("kaamCardYears")}
            </Badge>
            <Badge variant="outline" className="bg-card">
              <MapPin className="size-3.5" />
              {worker.city}
            </Badge>
          </div>

          {/* Quick facts grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card/50">
              <Briefcase className="size-5 text-primary shrink-0" aria-hidden />
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">
                  {t("kaamCardTrade")}
                </span>
                <span className="text-sm font-semibold text-foreground">
                  {tradeName}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card/50">
              <MapPin className="size-5 text-primary shrink-0" aria-hidden />
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">
                  {t("kaamCardCity")}
                </span>
                <span className="text-sm font-semibold text-foreground">
                  {worker.city}
                </span>
              </div>
            </div>
          </div>

          {/* Wage */}
          <div className="flex items-center justify-between gap-3 p-4 rounded-lg border-2 border-accent/30 bg-accent/5">
            <div className="flex flex-col">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("kaamCardWage")}
              </span>
              <WageDisplay
                min={worker.wageMin}
                max={worker.wageMax}
                size="lg"
              />
            </div>
          </div>

          {/* Skills */}
          {worker.skills.length > 0 && (
            <div className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {t("kaamCardSkills")}
              </h2>
              <ul className="flex flex-wrap gap-2" aria-label={t("kaamCardSkills")}>
                {worker.skills.map((s, i) => (
                  <li
                    key={`${s.nameEn}-${i}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-card text-sm"
                  >
                    <span className="text-foreground font-medium">
                      {pickLocalized(s.nameEn, s.nameHi, s.nameTe, lang)}
                    </span>
                    <span
                      className="inline-flex items-center gap-0.5"
                      aria-label={`${s.proficiency}/5`}
                    >
                      {Array.from({ length: 5 }).map((_, idx) => (
                        <Star
                          key={idx}
                          className={
                            idx < s.proficiency
                              ? "size-3 fill-accent text-accent"
                              : "size-3 text-muted-foreground/40"
                          }
                          aria-hidden="true"
                        />
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Trust journey — public milestone strip */}
          {worker.trustJourney && (
            <KaamTrustJourney journey={worker.trustJourney} trustTier={worker.trustTier} />
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              asChild
              size="lg"
              className="flex-1 min-h-12 text-base gap-2"
            >
              <Link href="/login" aria-label={t("kaamCardContact")}>
                <Lock className="size-4" />
                {t("kaamCardContact")}
              </Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="flex-1 min-h-12 text-base gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
              onClick={onWhatsAppShare}
              aria-label={t("kaamCardShareWhatsApp")}
            >
              <Share2 className="size-4" />
              {t("kaamCardShareWhatsApp")}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1.5">
            <ShieldCheck className="size-3.5 shrink-0" aria-hidden />
            {t("kaamCardContactHelp")}
          </p>

          {/* Subtle copy-link row */}
          <button
            type="button"
            onClick={onCopyLink}
            className="self-center inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors min-h-11 px-3"
            aria-label={t("copyPublicLink")}
            title={t("copyPublicLink")}
          >
            {copied ? (
              <Check className="size-3.5 text-emerald-600" aria-hidden />
            ) : (
              <Share2 className="size-3.5" aria-hidden />
            )}
            <span>{t("kaamCardPoweredBy")}</span>
          </button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
