"use client";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Handshake, Briefcase, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export function HeroSection() {
  const { t } = useLanguage();

  return (
    <section className="text-center max-w-4xl mx-auto flex flex-col gap-6 sm:gap-8 px-2">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-foreground leading-tight">
          {t("landingHeroTitle")}
        </h1>
      </motion.div>
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
        className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto"
      >
        {t("landingHeroSubtitle")}
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
        className="grid sm:grid-cols-2 gap-4 sm:gap-6 max-w-3xl w-full mx-auto mt-4"
      >
        <Link
          href="/login?demo=demo-worker"
          aria-label={t("landingCtaWorker")}
          className="group block"
        >
          <Card
            className="border-2 border-accent/30 hover:border-accent hover:shadow-lg transition-all duration-200 cursor-pointer h-full"
          >
            <CardContent className="p-6 flex flex-col gap-3 text-left min-h-44 justify-center">
              <div className="size-12 rounded-lg bg-accent/15 text-accent-foreground grid place-items-center group-hover:scale-105 transition-transform">
                <Handshake className="size-6" aria-hidden />
              </div>
              <div className="text-xl font-bold text-foreground">
                {t("landingCtaWorker")}
              </div>
              <div className="text-sm text-muted-foreground">
                {t("landingCtaWorkerSublabel")}
              </div>
              <div className="inline-flex items-center gap-1.5 text-sm font-medium text-primary mt-1">
                {t("continue")}
                <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" aria-hidden />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link
          href="/login?demo=demo-employer"
          aria-label={t("landingCtaEmployer")}
          className="group block"
        >
          <Card
            className="border-2 border-primary/30 hover:border-primary hover:shadow-lg transition-all duration-200 cursor-pointer h-full"
          >
            <CardContent className="p-6 flex flex-col gap-3 text-left min-h-44 justify-center">
              <div className="size-12 rounded-lg bg-primary/10 text-primary grid place-items-center group-hover:scale-105 transition-transform">
                <Briefcase className="size-6" aria-hidden />
              </div>
              <div className="text-xl font-bold text-foreground">
                {t("landingCtaEmployer")}
              </div>
              <div className="text-sm text-muted-foreground">
                {t("landingCtaEmployerSublabel")}
              </div>
              <div className="inline-flex items-center gap-1.5 text-sm font-medium text-primary mt-1">
                {t("continue")}
                <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" aria-hidden />
              </div>
            </CardContent>
          </Card>
        </Link>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.35 }}
        className="flex justify-center mt-2"
      >
        <Button asChild variant="ghost" size="sm" className="min-h-11">
          <Link href="/login">{t("navLogin")}</Link>
        </Button>
      </motion.div>
    </section>
  );
}
