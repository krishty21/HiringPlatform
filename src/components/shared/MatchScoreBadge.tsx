import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export function MatchScoreBadge({ score, size = "md" }: { score: number; size?: "sm" | "md" | "lg" }) {
  const tone =
    score >= 80 ? "bg-emerald-100 text-emerald-800 border-emerald-300"
    : score >= 60 ? "bg-amber-100 text-amber-800 border-amber-300"
    : score >= 40 ? "bg-orange-100 text-orange-800 border-orange-300"
    : "bg-rose-100 text-rose-800 border-rose-300";
  const cls = size === "sm" ? "px-2 py-0.5 text-xs" : size === "lg" ? "px-3 py-1.5 text-base" : "px-2.5 py-1 text-sm";
  return (
    <Badge variant="outline" className={cn(tone, "border font-bold tabular-nums", cls)}>
      <Sparkles className={size === "sm" ? "size-3" : "size-4"} />
      {score}%
    </Badge>
  );
}
