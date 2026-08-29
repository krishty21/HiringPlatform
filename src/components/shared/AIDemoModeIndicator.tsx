// Demo-mode indicator — per directive P0.8: "a small unobtrusive 'AI: demo mode' indicator in the app shell".
// Visible only when AI_PROVIDER !== "zai".
"use client";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { Sparkles } from "lucide-react";

export function AIDemoModeIndicator() {
  const { t } = useLanguage();
  // The flag is set at build time via NEXT_PUBLIC_AI_DEMO_MODE env var.
  // Default to true unless explicitly disabled.
  const demo = process.env.NEXT_PUBLIC_AI_DEMO_MODE !== "false";
  if (!demo) return null;
  return (
    <Badge variant="outline" className="bg-accent/15 text-accent-foreground border-accent/40 gap-1 text-[10px] px-1.5 py-0">
      <Sparkles className="size-3" />
      {t("aiDemoBadge")}
    </Badge>
  );
}
