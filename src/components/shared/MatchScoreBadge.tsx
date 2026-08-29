import { cn } from "@/lib/utils";

/**
 * MatchScoreBadge — clean numeric badge.
 * Master Prompt §69: replace Sparkles icon with Gauge (or a clean numeric badge).
 * Per §11 — combine color + shape + text, never color alone.
 * Removed: Sparkles icon, color-only Badge tones, "%" symbol clutter.
 * Added: clean numeric readout with a small "MATCH" eyebrow, tone via status-dot color.
 */
export function MatchScoreBadge({ score, size = "md" }: { score: number; size?: "sm" | "md" | "lg" }) {
  const tone =
    score >= 80
      ? { dot: "is-positive", text: "text-positive" }
      : score >= 60
        ? { dot: "is-positive", text: "text-positive" }
        : score >= 40
          ? { dot: "is-warning", text: "text-warning-foreground" }
          : { dot: "is-error", text: "text-destructive" };
  const padCls =
    size === "sm"
      ? "px-2 py-0.5 text-xs"
      : size === "lg"
        ? "px-2.5 py-1 text-sm"
        : "px-2 py-0.5 text-xs";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-border bg-surface tabular-nums",
        padCls,
      )}
      aria-label={`Match score ${score}`}
    >
      <span className={cn("status-dot", tone.dot)} aria-hidden />
      <span className="text-meta uppercase tracking-wide text-ink-subtle">Match</span>
      <span className={cn("font-semibold", tone.text)}>{score}</span>
    </span>
  );
}
