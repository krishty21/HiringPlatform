"use client";
import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RatingStars } from "./RatingStars";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { Star, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface RatingSummaryData {
  avg: number;
  count: number;
  breakdown: { score: number; count: number }[];
}

interface RatingSummaryProps {
  // Either workerUserId OR employerUserId OR workerProfileId/employerProfileId
  // (the API resolves profile id → userId internally).
  endpoint: "/api/ratings/worker" | "/api/ratings/employer";
  userId: string;
  title?: string;
  variant?: "full" | "compact";
  className?: string;
}

export function RatingSummary({
  endpoint,
  userId,
  title,
  variant = "full",
  className,
}: RatingSummaryProps) {
  const { t } = useLanguage();
  const [summary, setSummary] = useState<RatingSummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${endpoint}?userId=${encodeURIComponent(userId)}`, { cache: "no-store" });
      if (res.ok) {
        const d = await res.json();
        setSummary(d);
      } else {
        setSummary(null);
      }
    } catch {
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [endpoint, userId]);

  useEffect(() => {
    // Defer to avoid setState-in-effect anti-pattern.
    const id = setTimeout(load, 0);
    return () => clearTimeout(id);
  }, [load]);

  if (loading) {
    return (
      <div className={cn("flex items-center gap-2 text-xs text-muted-foreground", className)}>
        <Loader2 className="size-3 animate-spin" />
        {t("loading")}
      </div>
    );
  }

  if (!summary || summary.count === 0) {
    if (variant === "compact") return null;
    return (
      <Card className={cn("border-dashed", className)}>
        <CardContent className="p-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Star className="size-4 text-muted-foreground/40" />
          {t("ratingSummaryEmpty")}
        </CardContent>
      </Card>
    );
  }

  const max = Math.max(...summary.breakdown.map(b => b.count), 1);

  if (variant === "compact") {
    return (
      <div className={cn("inline-flex items-center gap-1.5", className)} title={t("ratingSummaryTitle")}>
        <RatingStars value={summary.avg} readOnly size="sm" />
        <span className="text-xs font-semibold tabular-nums">{summary.avg.toFixed(1)}</span>
        <span className="text-xs text-muted-foreground tabular-nums">({summary.count})</span>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={className}
    >
      <Card className="border-amber-500/20 bg-gradient-to-br from-amber-50/40 via-card to-card dark:from-amber-950/10">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="inline-flex size-7 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950/40">
              <Star className="size-4 text-amber-500 fill-amber-400" />
            </span>
            {title ?? t("ratingSummaryTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <div className="text-3xl font-bold tabular-nums text-amber-600 dark:text-amber-400">
              {summary.avg.toFixed(1)}
            </div>
            <div className="flex flex-col gap-1">
              <RatingStars value={summary.avg} readOnly size="sm" />
              <p className="text-xs text-muted-foreground tabular-nums">
                {t("ratingSummaryCount", { count: summary.count })}
              </p>
            </div>
          </div>

          {variant === "full" && (
            <div className="flex flex-col gap-1.5">
              {summary.breakdown.map(b => (
                <div key={b.score} className="flex items-center gap-2 text-xs">
                  <span className="w-3 font-medium tabular-nums">{b.score}</span>
                  <Star className="size-3 text-amber-500 fill-amber-400" />
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(b.count / max) * 100}%` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                      className="h-full bg-amber-400 rounded-full"
                    />
                  </div>
                  <span className="w-5 text-right text-muted-foreground tabular-nums">{b.count}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
