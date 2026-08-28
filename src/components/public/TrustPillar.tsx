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
    >
      <Card
        className={`border-2 ${accent} hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 h-full`}
      >
        <CardContent className="p-6 flex flex-col gap-3">
          <div
            className={`size-12 rounded-lg grid place-items-center ${iconColor}`}
          >
            <Icon className="size-6" aria-hidden />
          </div>
          <h3 className="font-semibold text-lg text-foreground">
            {t(titleKey)}
          </h3>
          <p className="text-sm text-muted-foreground">{t(bodyKey)}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
