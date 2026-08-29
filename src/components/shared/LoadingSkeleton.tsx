import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Briefcase } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

// Round 11: shimmer sheen overlay (component-level — no globals.css changes).
// Renders a diagonal gradient that sweeps left → right on top of each Skeleton,
// giving a richer "still loading" feel while preserving the existing pulse.
function ShimmerSheen({ delay = 0 }: { delay?: number }) {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
      style={{
        background:
          "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.18) 50%, transparent 100%)",
        backgroundSize: "200% 100%",
        animation: `shramsetu-sheen 1.6s ease-in-out ${delay}ms infinite`,
      }}
    >
      <style>{`@keyframes shramsetu-sheen { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
    </span>
  );
}

export function LoadingSkeleton({ count = 3, className, variant = "card" }: { count?: number; className?: string; variant?: "card" | "list" }) {
  const { t } = useLanguage();
  return (
    <div
      className={cn(variant === "list" ? "flex flex-col gap-2" : "flex flex-col gap-3", className)}
      role="status"
      aria-live="polite"
      aria-label={t("skeletonLoading")}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="relative rounded-xl border border-border bg-card p-4 flex flex-col gap-3 overflow-hidden"
        >
          <ShimmerSheen delay={i * 120} />
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="size-9 rounded-full bg-muted grid place-items-center text-muted-foreground/70">
                <Briefcase className="size-4" aria-hidden />
              </div>
              <div className="flex flex-col gap-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="h-5 w-12 rounded-full" />
          </div>
          <Skeleton className="h-4 w-3/4" />
          <div className="flex gap-2 flex-wrap">
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
          <div className="flex items-center justify-between mt-1">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-8 w-20 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}
