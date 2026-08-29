import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ShieldQuestion, Shield, Crown } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

type Tier = "new" | "id_verified" | "skill_verified" | "top_pro";

const TIER_STYLES: Record<Tier, { bg: string; text: string; icon: typeof Shield }> = {
  new:           { bg: "bg-muted text-muted-foreground", icon: Shield },
  id_verified:   { bg: "bg-[var(--tier-id)]/15 text-[var(--tier-id)] border-[var(--tier-id)]/40", icon: ShieldQuestion },
  skill_verified:{ bg: "bg-[var(--tier-skill)]/15 text-[var(--tier-skill)] border-[var(--tier-skill)]/40", icon: ShieldCheck },
  top_pro:       { bg: "bg-[var(--tier-top)]/20 text-[var(--tier-top)] border-[var(--tier-top)]/50", icon: Crown },
};

const TIER_KEYS: Record<Tier, "passportTierNew" | "passportTierIdVerified" | "passportTierSkillVerified" | "passportTierTopPro"> = {
  new: "passportTierNew",
  id_verified: "passportTierIdVerified",
  skill_verified: "passportTierSkillVerified",
  top_pro: "passportTierTopPro",
};

export function TrustTierBadge({ tier, score, size = "md" }: { tier: Tier; score?: number; size?: "sm" | "md" | "lg" }) {
  const { t } = useLanguage();
  const s = TIER_STYLES[tier];
  const Icon = s.icon;
  const cls = size === "sm" ? "px-2 py-0.5 text-xs gap-1" : size === "lg" ? "px-3 py-1.5 text-sm gap-2" : "px-2.5 py-1 text-xs gap-1.5";
  return (
    <Badge variant="outline" className={`${s.bg} ${cls} font-semibold border`}>
      <Icon className={size === "sm" ? "size-3" : "size-4"} />
      {t(TIER_KEYS[tier])}
      {score != null && <span className="opacity-70">· {score}</span>}
    </Badge>
  );
}
