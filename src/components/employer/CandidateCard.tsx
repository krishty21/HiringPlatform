"use client";
import Link from "next/link";
import { MatchScoreBadge } from "@/components/shared/MatchScoreBadge";
import { TrustTierBadge } from "@/components/shared/TrustTierBadge";
import { WageDisplay } from "@/components/shared/WageDisplay";
import { TopRatedBadge } from "@/components/ratings/TopRatedBadge";
import { RatingStars } from "@/components/ratings/RatingStars";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Zap, Sparkles, ArrowRight, Star } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { motion } from "framer-motion";
import { useMemo } from "react";

export interface CandidateCardData {
  id: string;
  fullName: string;
  tradeName: string | null;
  yearsExp: number;
  city: string;
  wageMin: number;
  wageMax: number;
  availableToday: boolean;
  trustTier: "new" | "id_verified" | "skill_verified" | "top_pro";
  trustScore: number;
  matchScore: number;
  topReason: string | null;
  distanceKm: number;
  skills: { skillId: string; proficiency: number; nameEn: string }[];
  // Round 8: rating from employers (0 / 0 when unrated)
  ratingAvg?: number;
  ratingCount?: number;
}

export function CandidateCard({ candidate }: { candidate: CandidateCardData }) {
  const { t } = useLanguage();
  const initials = useMemo(
    () => candidate.fullName.split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase(),
    [candidate.fullName],
  );
  const ratingAvg = candidate.ratingAvg ?? 0;
  const ratingCount = candidate.ratingCount ?? 0;
  const hasRating = ratingCount > 0;
  const prefetchedSummary = hasRating ? { avg: ratingAvg, count: ratingCount } : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="h-full"
    >
      <Link href={`/employer/candidates/${candidate.id}`} className="group block h-full" aria-label={`View ${candidate.fullName}`}>
        <Card className="relative overflow-hidden transition-all hover:shadow-md hover:border-primary/40 hover:-translate-y-0.5 group-focus-visible:ring-2 group-focus-visible:ring-ring h-full">
          {/* Match-score top gradient hairline (navy → emerald for high matches) */}
          <div
            aria-hidden
            className={`absolute inset-x-0 top-0 h-1 ${candidate.matchScore >= 70 ? "bg-gradient-to-r from-primary to-emerald-500" : candidate.matchScore >= 50 ? "bg-gradient-to-r from-primary to-accent" : "bg-gradient-to-r from-muted-foreground/30 to-muted-foreground/50"}`}
          />
          <CardContent className="relative p-4 flex flex-col gap-3">
            {/* Top row: avatar + name + match score */}
            <div className="flex items-start gap-3">
              <div className="size-11 shrink-0 rounded-full bg-primary/10 text-primary grid place-items-center font-bold text-sm group-hover:scale-105 transition-transform" aria-hidden>
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-base truncate">{candidate.fullName}</p>
                <p className="text-sm text-muted-foreground truncate">
                  {candidate.tradeName ?? "—"} · {candidate.yearsExp} {t("passportYears")}
                </p>
              </div>
              <MatchScoreBadge score={candidate.matchScore} size="lg" />
            </div>

            {/* Top reason */}
            {candidate.topReason && (
              <div className="flex items-start gap-1.5 text-xs text-muted-foreground bg-muted/40 rounded-md px-2.5 py-1.5">
                <Sparkles className="size-3 mt-0.5 shrink-0 text-accent-foreground" aria-hidden />
                <span className="line-clamp-2">{candidate.topReason}</span>
              </div>
            )}

            {/* Trust tier + available today */}
            <div className="flex flex-wrap items-center gap-2">
              <TrustTierBadge tier={candidate.trustTier} score={candidate.trustScore} size="sm" />
              <TopRatedBadge workerProfileId={candidate.id} summary={prefetchedSummary} />
              {candidate.availableToday && (
                <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-300 gap-1 text-xs">
                  <Zap className="size-3" />
                  {t("today")}
                </Badge>
              )}
              <Badge variant="outline" className="text-xs gap-1">
                <MapPin className="size-3" />
                {candidate.distanceKm.toFixed(1)} {t("km")}
              </Badge>
            </div>

            {/* Worker rating (round 8) — inline stars + avg + count */}
            {hasRating && (
              <div
                className="flex items-center gap-1.5 text-xs"
                aria-label={t("candidateRatingAria", { avg: ratingAvg, count: ratingCount })}
                title={t("candidateRatingAria", { avg: ratingAvg, count: ratingCount })}
              >
                <RatingStars value={ratingAvg} size="sm" readOnly className="shrink-0" />
                <span className="font-semibold text-amber-700 dark:text-amber-400 tabular-nums">{ratingAvg.toFixed(1)}</span>
                <span className="text-muted-foreground">· {t("ratingSummaryCount", { count: ratingCount, s: ratingCount === 1 ? "" : "s" })}</span>
                {ratingCount >= 3 && ratingAvg >= 4.5 && (
                  <Star className="size-3 fill-amber-400 text-amber-500 ml-0.5" aria-hidden />
                )}
              </div>
            )}

            {/* Skills chips */}
            {candidate.skills.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {candidate.skills.slice(0, 4).map(s => (
                  <Badge key={s.skillId} variant="secondary" className="text-[10px]">
                    {s.nameEn} · {s.proficiency}/5
                  </Badge>
                ))}
                {candidate.skills.length > 4 && (
                  <Badge variant="outline" className="text-[10px]">
                    +{candidate.skills.length - 4}
                  </Badge>
                )}
              </div>
            )}

            {/* Wage + view hint */}
            <div className="border-t border-border pt-2 flex items-center justify-between gap-2">
              <WageDisplay min={candidate.wageMin} max={candidate.wageMax} size="sm" />
              <span className="inline-flex items-center gap-1 text-xs font-medium text-primary opacity-70 group-hover:opacity-100 transition-opacity">
                View
                <ArrowRight className="size-3 group-hover:translate-x-0.5 transition-transform" aria-hidden />
              </span>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}
