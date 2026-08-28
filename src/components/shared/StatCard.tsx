import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

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
  const toneCls = {
    default: "bg-card text-foreground",
    primary: "bg-primary text-primary-foreground",
    accent: "bg-accent text-accent-foreground",
    success: "bg-emerald-100 text-emerald-900",
  }[tone];
  return (
    <Card className={cn(toneCls, "border", className)}>
      <CardContent className="p-5 flex items-start gap-4">
        {Icon && (
          <div className={cn("size-10 rounded-lg flex items-center justify-center shrink-0", tone === "default" ? "bg-primary/10 text-primary" : "bg-black/10")}>
            <Icon className="size-5" />
          </div>
        )}
        <div className="flex-1">
          <p className="text-xs font-medium opacity-80">{label}</p>
          <p className="text-2xl font-bold tabular-nums mt-1 leading-none">{value}</p>
          {hint && <p className="text-xs opacity-70 mt-2">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
