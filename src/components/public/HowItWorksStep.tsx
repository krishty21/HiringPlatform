"use client";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";

export function HowItWorksStep({
  number,
  icon: Icon,
  titleKey,
  bodyKey,
  delay,
  isLast = false,
}: {
  number: number;
  icon: LucideIcon;
  titleKey: "landingStep1Title" | "landingStep2Title" | "landingStep3Title";
  bodyKey: "landingStep1Body" | "landingStep2Body" | "landingStep3Body";
  delay: number;
  isLast?: boolean;
}) {
  const { t } = useLanguage();
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: "easeOut" }}
      className="h-full relative"
    >
      {/* Step connector arrow (desktop only) */}
      {!isLast && (
        <div
          aria-hidden
          className="hidden md:flex absolute top-1/2 -right-[22px] -translate-y-1/2 z-10 size-9 items-center justify-center rounded-full border border-border bg-card shadow-sm text-muted-foreground"
        >
          <ChevronRight className="size-4" />
        </div>
      )}
      <Card className="group border border-border hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 h-full relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-accent" aria-hidden />
        {/* Giant watermark number */}
        <span
          aria-hidden
          className="absolute -right-2 -bottom-6 text-[110px] font-black leading-none text-foreground/[0.045] select-none pointer-events-none group-hover:text-foreground/[0.07] transition-colors"
        >
          {number}
        </span>
        <CardContent className="relative p-6 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span
              className="size-9 rounded-full bg-primary text-primary-foreground grid place-items-center font-bold text-sm shadow-sm ring-4 ring-primary/10"
              aria-hidden
            >
              {number}
            </span>
            <div className="size-11 rounded-lg bg-accent/15 text-accent-foreground grid place-items-center group-hover:scale-105 transition-transform">
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
