"use client";
import Link from "next/link";
import { useLanguage, type LanguageCode } from "@/lib/i18n/LanguageProvider";
import { TrustTierBadge } from "@/components/shared/TrustTierBadge";
import { WageDisplay } from "@/components/shared/WageDisplay";
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
};

const TIER_INDEX: Record<PublicWorkerData["trustTier"], number> = {
  new: 0,
  id_verified: 1,
  skill_verified: 2,
  top_pro: 3,
};

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
            aria-label="Copy public link"
            title="Copy public link"
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
