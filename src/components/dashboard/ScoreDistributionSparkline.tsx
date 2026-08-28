"use client";
// ScoreDistributionSparkline — minimal 5-bar SVG (no axes).
// Buckets: [0-20, 21-40, 41-60, 61-80, 81-100].
// Colors: rose → orange → amber → emerald → green (matching MatchScoreBadge tones).
import { useLanguage } from "@/lib/i18n/LanguageProvider";

export function ScoreDistributionSparkline({
  distribution,
  width = 120,
  height = 36,
}: {
  distribution: number[]; // length 5
  width?: number;
  height?: number;
}) {
  const { t } = useLanguage();
  const safe = (distribution.length === 5 ? distribution : [0, 0, 0, 0, 0]).map((n) =>
    typeof n === "number" && Number.isFinite(n) ? n : 0,
  );
  const max = Math.max(...safe, 1);
  const gap = 3;
  const barWidth = (width - gap * (safe.length - 1)) / safe.length;

  const colors = [
    "#f43f5e", // rose-500 (0-20)
    "#f97316", // orange-500 (21-40)
    "#f59e0b", // amber-500 (41-60)
    "#10b981", // emerald-500 (61-80)
    "#059669", // emerald-600 (81-100)
  ];

  return (
    <div className="flex flex-col items-start gap-1">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${t("dashScoreDist")}`}
        className="overflow-visible"
      >
        {safe.map((n, i) => {
          const h = (n / max) * (height - 2);
          const x = i * (barWidth + gap);
          const y = height - h;
          return (
            <rect
              key={i}
              x={x}
              y={y}
              width={barWidth}
              height={Math.max(h, 1)}
              rx={1.5}
              fill={colors[i]}
            >
              {n > 0 && (
                <title>
                  Bucket {i === 0 ? "0-20" : i === 1 ? "21-40" : i === 2 ? "41-60" : i === 3 ? "61-80" : "81-100"}: {n}
                </title>
              )}
            </rect>
          );
        })}
      </svg>
      <div className="flex items-center justify-between w-full" style={{ width }}>
        <span className="text-[9px] text-muted-foreground">0</span>
        <span className="text-[9px] text-muted-foreground">100</span>
      </div>
    </div>
  );
}
