import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

export function WageDisplay({
  min,
  max,
  size = "md",
  className,
}: {
  min: number;
  max: number;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const { t } = useLanguage();
  const sizeCls = {
    sm: "text-base",
    md: "text-lg",
    lg: "text-2xl",
    xl: "text-4xl",
  }[size];
  const numCls = "tabular-nums font-bold";
  const txt = min === max
    ? `₹${min.toLocaleString("en-IN")}`
    : `₹${min.toLocaleString("en-IN")}–₹${max.toLocaleString("en-IN")}`;
  return (
    <span className={cn("inline-flex items-baseline gap-1", className)}>
      <span className={cn(sizeCls, numCls, "text-foreground")}>{txt}</span>
      <span className="text-xs text-muted-foreground font-medium">{t("perDay")}</span>
    </span>
  );
}
