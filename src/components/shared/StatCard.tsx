"use client";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

/**
 * StatCard — operational metric tile for employer dashboard + admin console.
 * Per Master Prompt §31/§32: number + table + progress bar over decorative analytics.
 * Restrained surfaces (surface-raised), no motion, no blur blobs, no scale hover.
 */
export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon?: LucideIcon;
  tone?: "default" | "primary" | "accent" | "success";
  className?: string;
}) {
  // Tone drives only color of the icon chip + a thin top hairline — never a colored card.
  const iconChipCls =
    tone === "primary"
      ? "bg-primary/10 text-primary"
      : tone === "accent"
        ? "bg-accent/10 text-accent-foreground"
        : tone === "success"
          ? "bg-positive/10 text-positive"
          : "bg-primary/10 text-primary";
  const hairlineCls =
    tone === "primary"
      ? "bg-primary"
      : tone === "accent"
        ? "bg-accent"
        : tone === "success"
          ? "bg-positive"
          : "bg-ink-subtle";

  return (
    <Card
      className={cn(
        "surface-raised shadow-raise h-full overflow-hidden",
        "transition-colors hover:border-ink/30",
        className,
      )}
    >
      <div aria-hidden className={cn("h-0.5 w-full", hairlineCls)} />
      <CardContent className="p-5 flex items-start gap-4">
        {Icon && (
          <div
            className={cn(
              "size-10 rounded-md grid place-items-center shrink-0 border border-border",
              iconChipCls,
            )}
            aria-hidden
          >
            <Icon className="size-5" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-meta uppercase tracking-wide truncate">{label}</p>
          <p className="text-2xl font-bold tabular-nums mt-1 leading-none text-ink">
            {value}
          </p>
          {hint && (
            <p className="text-meta mt-2 truncate">{hint}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
