"use client";
import Link from "next/link";
import { MatchScoreBadge } from "@/components/shared/MatchScoreBadge";
import { TrustTierBadge } from "@/components/shared/TrustTierBadge";
import { WageDisplay } from "@/components/shared/WageDisplay";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Zap, Sparkles } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

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
}

export function CandidateCard({ candidate }: { candidate: CandidateCardData }) {
  const { t } = useLanguage();
  return (
    <Link href={`/employer/candidates/${candidate.id}`} className="block group">
      <Card className="transition-all hover:shadow-md hover:border-primary/40 group-focus-visible:ring-2 group-focus-visible:ring-ring">
        <CardContent className="p-4 flex flex-col gap-3">
          {/* Top row: name + match score */}
          <div className="flex items-start justify-between gap-3">
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
            <div className="flex items-start gap-1.5 text-xs text-muted-foreground bg-muted/40 rounded-md px-2 py-1.5">
              <Sparkles className="size-3 mt-0.5 shrink-0 text-accent-foreground" />
              <span className="line-clamp-2">{candidate.topReason}</span>
            </div>
          )}

          {/* Trust tier + available today */}
          <div className="flex flex-wrap items-center gap-2">
            <TrustTierBadge tier={candidate.trustTier} score={candidate.trustScore} size="sm" />
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

          {/* Wage expectation */}
          <div className="border-t border-border pt-2">
            <WageDisplay min={candidate.wageMin} max={candidate.wageMax} size="sm" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
