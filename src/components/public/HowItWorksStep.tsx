"use client";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

export function HowItWorksStep({
  number,
  icon: Icon,
  titleKey,
  bodyKey,
  delay,
}: {
  number: number;
  icon: LucideIcon;
  titleKey: "landingStep1Title" | "landingStep2Title" | "landingStep3Title";
  bodyKey: "landingStep1Body" | "landingStep2Body" | "landingStep3Body";
  delay: number;
}) {
  const { t } = useLanguage();
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: "easeOut" }}
      className="h-full"
    >
      <Card className="border border-border hover:shadow-md transition-all duration-200 h-full relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-accent" aria-hidden />
        <CardContent className="p-6 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span
              className="size-9 rounded-full bg-primary text-primary-foreground grid place-items-center font-bold text-sm"
              aria-hidden
            >
              {number}
            </span>
            <div className="size-11 rounded-lg bg-accent/15 text-accent-foreground grid place-items-center">
              <Icon className="size-5" aria-hidden />
            </div>
          </div>
          <h3 className="font-semibold text-lg text-foreground">
            {t(titleKey)}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t(bodyKey)}
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
