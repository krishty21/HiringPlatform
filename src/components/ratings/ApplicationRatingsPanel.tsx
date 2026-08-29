"use client";
import { useEffect, useState, useCallback } from "react";
import { RatingStars } from "./RatingStars";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { MessageSquare, Star } from "lucide-react";
import { motion } from "framer-motion";

interface ApplicationRating {
  id: string;
  applicationId: string;
  raterId: string;
  rateeId: string;
  score: number;
  comment: string;
  createdAt: string;
  direction: "given" | "received";
  raterRole: "worker" | "employer";
}

interface ApplicationRatingsPanelProps {
  applicationId: string;
  // callerRole: who's viewing — "worker" (sees their rating of employer + employer's rating of them)
  //                | "employer"
  callerRole: "worker" | "employer";
  rateeDisplayName?: string;
  // Optional callback fired when the panel discovers the caller has already rated.
  onRatedByMe?: (hasRated: boolean) => void;
}

/**
 * Inline panel listing all ratings tied to an application. Visible to both
 * participants. Shows the caller's rating ("given") + any ratings the other
 * party has submitted about the caller ("received").
 */
export function ApplicationRatingsPanel({
  applicationId,
  callerRole,
  rateeDisplayName,
  onRatedByMe,
}: ApplicationRatingsPanelProps) {
  const { t } = useLanguage();
  const [ratings, setRatings] = useState<ApplicationRating[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/ratings/${applicationId}`, { cache: "no-store" });
      const d = res.ok ? await res.json() : { items: [] };
      setRatings(d.items ?? []);
      // Inform the parent whether the caller has already rated (so the prompt can hide).
      const hasGiven = (d.items ?? []).some((r: ApplicationRating) => r.direction === "given");
      onRatedByMe?.(hasGiven);
    } catch {
      setRatings([]);
    } finally {
      setLoading(false);
    }
  }, [applicationId, onRatedByMe]);

  useEffect(() => {
    // Defer to avoid setState-in-effect anti-pattern.
    const id = setTimeout(load, 0);
    return () => clearTimeout(id);
  }, [load]);

  if (loading) return null;
  if (ratings.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <Card className="border-amber-500/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Star className="size-4 text-amber-500 fill-amber-400" />
            {t("ratingPanelTitle")}
            <Badge variant="outline" className="text-[10px] ml-auto tabular-nums">{ratings.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {ratings.map((r, idx) => {
            const roleLabel = r.raterRole === callerRole ? t("ratingRoleYou") : t("ratingRoleOther");
            const directionLabel = r.direction === "given"
              ? t("ratingDirectionGiven")
              : t("ratingDirectionReceived");
            return (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.06, ease: "easeOut" }}
                whileHover={{ scale: 1.005, transition: { duration: 0.15 } }}
                className={`rounded-lg border p-3 transition-shadow hover:shadow-sm ${
                  r.direction === "given"
                    ? "border-primary/30 bg-primary/5"
                    : "border-amber-500/30 bg-amber-50/40 dark:bg-amber-950/10"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                  <div className="flex items-center gap-2">
                    <RatingStars value={r.score} readOnly size="sm" />
                    <span className="text-xs font-semibold tabular-nums">{r.score}/5</span>
                  </div>
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground whitespace-normal break-words">
                    {directionLabel} · {roleLabel}
                  </span>
                </div>
                {r.comment && (
                  <p className="text-sm text-foreground/90 italic flex gap-1.5">
                    <MessageSquare className="size-3 text-muted-foreground mt-0.5 shrink-0" />
                    "{r.comment}"
                  </p>
                )}
                <p className="text-[10px] text-muted-foreground mt-1.5 tabular-nums">
                  {new Date(r.createdAt).toLocaleDateString()}
                </p>
              </motion.div>
            );
          })}
        </CardContent>
      </Card>
    </motion.div>
  );
}
