"use client";
import { useState, useRef, type KeyboardEvent } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface RatingStarsProps {
  value: number;
  onChange?: (v: number) => void;
  size?: "sm" | "md" | "lg";
  readOnly?: boolean;
  className?: string;
  label?: string;
}

const SIZE: Record<NonNullable<RatingStarsProps["size"]>, string> = {
  sm: "size-3.5",
  md: "size-5",
  lg: "size-7",
};

/**
 * Accessible 5-star rating widget.
 * - Interactive mode (readOnly=false): hover-preview + keyboard arrows + 1-5 keys.
 * - Read-only mode: just renders the avg as filled stars (with partial fill for .5).
 */
export function RatingStars({
  value,
  onChange,
  size = "md",
  readOnly = false,
  className,
  label,
}: RatingStarsProps) {
  const [hover, setHover] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const display = hover ?? value;
  const interactive = !readOnly && !!onChange;

  function handleKey(e: KeyboardEvent<HTMLDivElement>) {
    if (!interactive) return;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      onChange?.(Math.min(5, value + 1));
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      onChange?.(Math.max(1, value - 1));
    } else if (e.key >= "1" && e.key <= "5") {
      e.preventDefault();
      onChange?.(Number(e.key));
    }
  }

  return (
    <div
      ref={containerRef}
      role={interactive ? "radiogroup" : "img"}
      aria-label={label ?? `Rating ${value} of 5`}
      aria-valuenow={interactive ? value : undefined}
      aria-valuemin={interactive ? 1 : undefined}
      aria-valuemax={interactive ? 5 : undefined}
      tabIndex={interactive ? 0 : -1}
      onKeyDown={handleKey}
      className={cn("inline-flex items-center gap-0.5 outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:rounded", className)}
    >
      {Array.from({ length: 5 }).map((_, i) => {
        const idx = i + 1;
        const filled = idx <= Math.floor(display);
        const partial = !filled && idx - 0.5 <= display; // for .5 avgs in read-only
        return (
          <button
            key={i}
            type="button"
            disabled={!interactive}
            onMouseEnter={() => interactive && setHover(idx)}
            onMouseLeave={() => interactive && setHover(null)}
            onClick={() => interactive && onChange?.(idx)}
            className={cn(
              "relative inline-flex transition-transform",
              interactive && "hover:scale-110 cursor-pointer",
              !interactive && "cursor-default",
            )}
            aria-label={interactive ? `${idx} star${idx > 1 ? "s" : ""}` : undefined}
            aria-pressed={interactive ? idx === value : undefined}
          >
            <Star
              className={cn(
                SIZE[size],
                filled
                  ? "fill-amber-400 text-amber-500"
                  : partial
                    ? "fill-amber-400/50 text-amber-500/70"
                    : "fill-muted-foreground/15 text-muted-foreground/40",
              )}
              aria-hidden
            />
          </button>
        );
      })}
    </div>
  );
}
