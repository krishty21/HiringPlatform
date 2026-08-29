"use client";
import { useEffect, useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

interface TopRatedBadgeProps {
  workerProfileId: string;
  className?: string;
  size?: "sm" | "md";
  // Min avg to qualify (default 4.5)
  minAvg?: number;
  // Min count to qualify (default 3)
  minCount?: number;
  // Round 8: prefetched summary (avg + count) from the search API — skips the
  // lazy fetch entirely and keeps cards in sync with server-side filtering.
  summary?: { avg: number; count: number } | null;
}

/**
 * "Top Rated" badge — appears only when a worker has at least `minCount`
 * ratings (default 3) with avg ≥ `minAvg` (default 4.5). Lazy-fetches the
 * worker's rating summary via the public /api/ratings/worker endpoint unless
 * a `summary` prop is provided (search results already carry it).
 */
export function TopRatedBadge({
  workerProfileId,
  className,
  size = "sm",
  minAvg = 4.5,
  minCount = 3,
  summary: prefetched,
}: TopRatedBadgeProps) {
  const [fetched, setFetched] = useState<{ avg: number; count: number } | null>(null);
  // Round 12: localized badge text (was hardcoded "Top Rated").
  const { t } = useLanguage();

  const load = useCallback(async () => {
    // Prefetched summary wins — no network needed.
    if (prefetched !== undefined) return;
    try {
      const res = await fetch(`/api/ratings/worker?userId=${encodeURIComponent(workerProfileId)}`, { cache: "no-store" });
      if (res.ok) {
        const d = await res.json();
        setFetched({ avg: d.avg, count: d.count });
      } else {
        setFetched(null);
      }
    } catch {
      setFetched(null);
    }
  }, [workerProfileId, prefetched]);

  useEffect(() => {
    if (prefetched !== undefined) return;
    const id = setTimeout(load, 0);
    return () => clearTimeout(id);
  }, [load, prefetched]);

  const summary = prefetched !== undefined ? prefetched : fetched;
  if (!summary || summary.count < minCount || summary.avg < minAvg) return null;

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 border-amber-500/40 bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
        size === "sm" ? "text-[10px]" : "text-xs",
        className,
      )}
      title={t("topRatedTooltip", { avg: summary.avg.toFixed(1), count: summary.count })}
    >
      <Star className="size-3 fill-amber-400 text-amber-500" />
      {t("topRatedBadge")}
    </Badge>
  );
}
