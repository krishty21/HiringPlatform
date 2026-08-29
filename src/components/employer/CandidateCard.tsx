"use client";
import Link from "next/link";
import { MatchScoreBadge } from "@/components/shared/MatchScoreBadge";
import { TrustTierBadge } from "@/components/shared/TrustTierBadge";
import { WageDisplay } from "@/components/shared/WageDisplay";
import { TopRatedBadge } from "@/components/ratings/TopRatedBadge";
import { RatingStars } from "@/components/ratings/RatingStars";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, ArrowRight, ChevronRight } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { cn } from "@/lib/utils";

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

/**
 * CandidateCard — ATS row comparison tile.
 * Removed: motion entrance, gradient top hairline (navy→emerald), Sparkles icon on top-reason,
 *   hover:-translate-y-0.5 + hover:shadow-md decorative transforms, emerald "Available today" Badge,
 *   amber Star proficiency chips, "View" hover text.
 * Added: surface-raised + shadow-raise, hover:border-ink/30 only (no transform),
 *   status-dot for available-today, inline p text for top-reason (no card-within-card),
 *   skills as inline-meta dl with proficiency dots (no chips), "Open dossier →" CTA row.
 */
export function CandidateCard({ candidate }: { candidate: CandidateCardData }) {
  const { t } = useLanguage();
  const initials = candidate.fullName
    .split(" ")
    .map(p => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const ratingAvg = candidate.ratingAvg ?? 0;
  const ratingCount = candidate.ratingCount ?? 0;
  const hasRating = ratingCount > 0;
  const prefetchedSummary = hasRating ? { avg: ratingAvg, count: ratingCount } : null;

  return (
    <Link
      href={`/employer/candidates/${candidate.id}`}
      className="group block h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
      aria-label={t("candidatesViewProfile") + " — " + candidate.fullName}
    >
      <Card className="surface-raised shadow-raise h-full transition-colors hover:border-ink/30 group-focus-visible:border-ink/30">
        <CardContent className="p-4 flex flex-col gap-3">
          {/* Top row: avatar + name + match score */}
          <div className="flex items-start gap-3">
            <div
              className="size-11 shrink-0 rounded-full bg-primary/10 text-primary grid place-items-center font-bold text-sm border border-border"
              aria-hidden
            >
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-base truncate text-ink">{candidate.fullName}</p>
              <p className="text-sm text-ink-muted truncate">
                {candidate.tradeName ?? "—"} · {candidate.yearsExp} {t("passportYears")}
              </p>
            </div>
            <MatchScoreBadge score={candidate.matchScore} size="lg" />
          </div>

          {/* Top reason — inline-meta p, no card-within-card */}
          {candidate.topReason && (
            <p className="flex items-start gap-1.5 text-meta text-ink-muted">
              <ChevronRight className="size-3 mt-0.5 shrink-0 text-ink-subtle" aria-hidden />
              <span className="line-clamp-2">{candidate.topReason}</span>
            </p>
          )}

          {/* Trust tier + available today + distance — single dl with status-dots */}
          <div className="flex flex-wrap items-center gap-2">
            <TrustTierBadge tier={candidate.trustTier} score={candidate.trustScore} size="sm" />
            <TopRatedBadge workerProfileId={candidate.id} summary={prefetchedSummary} />
            {candidate.availableToday && (
              <span className="inline-flex items-center gap-1 text-xs text-positive">
                <span className="status-dot is-positive" aria-hidden />
                {t("today")}
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-xs text-ink-muted">
              <MapPin className="size-3 text-ink-subtle" aria-hidden />
              {candidate.distanceKm.toFixed(1)} {t("km")}
            </span>
          </div>

          {/* Worker rating (round 8) — inline stars + avg + count */}
          {hasRating && (
            <div
              className="flex items-center gap-1.5 text-xs flex-wrap"
              aria-label={t("candidateRatingAria", { avg: ratingAvg, count: ratingCount })}
              title={t("candidateRatingAria", { avg: ratingAvg, count: ratingCount })}
            >
              <RatingStars value={ratingAvg} size="sm" readOnly className="shrink-0" />
              <span className="font-semibold text-ink tabular-nums">{ratingAvg.toFixed(1)}</span>
              <span className="text-ink-subtle">· {ratingCount === 1 ? t("ratingCountOne") : t("ratingCountMany", { count: ratingCount })}</span>
            </div>
          )}

          {/* Skills — inline-meta dl with proficiency dots, no chips */}
          {candidate.skills.length > 0 && (
            <dl className="flex flex-col gap-1">
              {candidate.skills.slice(0, 4).map(s => (
                <div key={s.skillId} className="flex items-center justify-between gap-2 text-xs">
                  <dt className="text-ink-muted truncate">{s.nameEn}</dt>
                  <dd
                    className="flex items-center gap-0.5 shrink-0"
                    aria-label={t("proficiencyAria", { level: s.proficiency })}
                  >
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span
                        key={i}
                        className={cn(
                          "size-1.5 rounded-full",
                          i < s.proficiency ? "bg-accent" : "bg-border",
                        )}
                        aria-hidden
                      />
                    ))}
                  </dd>
                </div>
              ))}
              {candidate.skills.length > 4 && (
                <p className="text-[10px] text-ink-subtle">
                  +{candidate.skills.length - 4} {t("candidatesMoreSkills")}
                </p>
              )}
            </dl>
          )}

          {/* Wage + dossier CTA */}
          <div className="border-t border-border pt-2 flex items-center justify-between gap-2">
            <WageDisplay min={candidate.wageMin} max={candidate.wageMax} size="sm" />
            <span className="inline-flex items-center gap-1 text-xs font-medium text-ink-muted">
              {t("candidatesOpenDossier")}
              <ArrowRight className="size-3" aria-hidden />
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
