"use client";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

type PillarKey =
  | "landingPillar1Title"
  | "landingPillar2Title"
  | "landingPillar3Title"
  | "landingPillar1Body"
  | "landingPillar2Body"
  | "landingPillar3Body";

export function TrustPillar({
  icon: Icon,
  titleKey,
  bodyKey,
  accent,
  iconColor,
  delay,
}: {
  icon: LucideIcon;
  titleKey: PillarKey;
  bodyKey: PillarKey;
  accent: string;
  iconColor: string;
  delay: number;
}) {
  const { t } = useLanguage();
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: "easeOut" }}
      className="h-full"
    >
      <Card
        className={`group relative border-2 ${accent} hover:shadow-lg hover:-translate-y-1 transition-all duration-200 h-full overflow-hidden`}
      >
        {/* Top gradient hairline */}
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-foreground/15 to-transparent opacity-60 group-hover:opacity-100 transition-opacity"
        />
        {/* Corner glow */}
        <div
          aria-hidden
          className="absolute -right-10 -top-10 size-32 rounded-full bg-foreground/[0.04] blur-2xl group-hover:bg-foreground/[0.07] transition-colors"
        />
        <CardContent className="relative p-6 flex flex-col gap-3">
          <div
            className={`size-12 rounded-lg grid place-items-center ${iconColor} shadow-sm group-hover:scale-105 transition-transform`}
          >
            <Icon className="size-6" aria-hidden />
          </div>
          <h3 className="font-semibold text-lg text-foreground">
            {t(titleKey)}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{t(bodyKey)}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
