"use client";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { LandingHeader } from "@/components/public/LandingHeader";
import { HeroSection } from "@/components/public/HeroSection";
import { TrustPillar } from "@/components/public/TrustPillar";
import { HowItWorksStep } from "@/components/public/HowItWorksStep";
import { PublicFooter } from "@/components/public/PublicFooter";
import { Mic, ShieldCheck, Sparkles, Handshake } from "lucide-react";
import { motion } from "framer-motion";

export default function LandingPage() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-secondary/40 via-background to-background">
      <LandingHeader />

      <main className="flex-1 flex flex-col items-center justify-start px-4 sm:px-6 py-10 sm:py-16 gap-14 sm:gap-20">
        <HeroSection />

        {/* Trust pillars */}
        <section className="grid md:grid-cols-3 gap-5 sm:gap-6 max-w-5xl w-full">
          <TrustPillar
            icon={Mic}
            titleKey="landingPillar1Title"
            bodyKey="landingPillar1Body"
            accent="border-accent/30"
            iconColor="bg-accent/15 text-accent-foreground"
            delay={0}
          />
          <TrustPillar
            icon={ShieldCheck}
            titleKey="landingPillar2Title"
            bodyKey="landingPillar2Body"
            accent="border-primary/30"
            iconColor="bg-primary/10 text-primary"
            delay={0.08}
          />
          <TrustPillar
            icon={Sparkles}
            titleKey="landingPillar3Title"
            bodyKey="landingPillar3Body"
            accent="border-emerald-500/30"
            iconColor="bg-emerald-100 text-emerald-700"
            delay={0.16}
          />
        </section>

        {/* How it works */}
        <section className="max-w-5xl w-full flex flex-col gap-8 sm:gap-10">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="text-center flex flex-col gap-2"
          >
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              {t("landingHowItWorksTitle")}
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
              {t("landingHowItWorksSubtitle")}
            </p>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-5 sm:gap-6">
            <HowItWorksStep
              number={1}
              icon={Mic}
              titleKey="landingStep1Title"
              bodyKey="landingStep1Body"
              delay={0}
            />
            <HowItWorksStep
              number={2}
              icon={ShieldCheck}
              titleKey="landingStep2Title"
              bodyKey="landingStep2Body"
              delay={0.08}
            />
            <HowItWorksStep
              number={3}
              icon={Handshake}
              titleKey="landingStep3Title"
              bodyKey="landingStep3Body"
              delay={0.16}
            />
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
