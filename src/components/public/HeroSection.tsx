"use client";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Handshake, Briefcase, ArrowRight, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

export function HeroSection() {
  const { t } = useLanguage();

  return (
    <section className="relative text-center max-w-4xl mx-auto flex flex-col gap-6 sm:gap-8 px-2">
      {/* Decorative background: soft radial glows + dot grid (language-neutral) */}
      <div aria-hidden className="pointer-events-none absolute -inset-x-8 -top-16 -bottom-10 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-0 size-[420px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -left-20 top-24 size-56 rounded-full bg-accent/15 blur-3xl" />
        <div className="absolute -right-20 top-40 size-56 rounded-full bg-primary/8 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "radial-gradient(circle, color-mix(in oklab, var(--foreground) 14%, transparent) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
            maskImage:
              "radial-gradient(ellipse 70% 60% at 50% 30%, black 30%, transparent 75%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 70% 60% at 50% 30%, black 30%, transparent 75%)",
          }}
        />
      </div>

      {/* Eyebrow badge */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="flex justify-center"
      >
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/5 px-4 py-1.5 text-xs font-semibold tracking-wide text-primary shadow-sm">
          <ShieldCheck className="size-3.5" aria-hidden />
          Trust-first hiring platform
        </span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative"
      >
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-foreground leading-tight">
          {t("landingHeroTitle")}
        </h1>
        {/* Decorative underline swoosh */}
        <svg
          aria-hidden
          viewBox="0 0 220 12"
          className="mx-auto mt-3 h-2.5 w-44 sm:w-56 text-accent"
          preserveAspectRatio="none"
        >
          <path
            d="M3 9 C 60 2, 160 2, 217 8"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            opacity="0.85"
          />
        </svg>
      </motion.div>

      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
        className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed"
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
            className="relative border-2 border-accent/30 hover:border-accent hover:shadow-lg hover:shadow-accent/10 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer h-full overflow-hidden"
          >
            <div
              aria-hidden
              className="absolute -right-8 -top-8 size-28 rounded-full bg-accent/10 blur-2xl group-hover:bg-accent/20 transition-colors"
            />
            <CardContent className="relative p-6 flex flex-col gap-3 text-left min-h-44 justify-center">
              <div className="size-12 rounded-lg bg-accent/15 text-accent-foreground grid place-items-center group-hover:scale-105 group-hover:rotate-3 transition-transform">
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
            className="relative border-2 border-primary/30 hover:border-primary hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer h-full overflow-hidden"
          >
            <div
              aria-hidden
              className="absolute -right-8 -top-8 size-28 rounded-full bg-primary/10 blur-2xl group-hover:bg-primary/20 transition-colors"
            />
            <CardContent className="relative p-6 flex flex-col gap-3 text-left min-h-44 justify-center">
              <div className="size-12 rounded-lg bg-primary/10 text-primary grid place-items-center group-hover:scale-105 group-hover:rotate-3 transition-transform">
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

      {/* Language reach strip + login */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.35 }}
        className="flex flex-col items-center gap-4 mt-2"
      >
        <div className="flex flex-wrap items-center justify-center gap-2" aria-label="Supported languages">
          <span className="rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-medium text-muted-foreground shadow-sm">
            తెలుగు
          </span>
          <span className="rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-medium text-muted-foreground shadow-sm">
            हिंदी
          </span>
          <span className="rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-medium text-muted-foreground shadow-sm">
            English
          </span>
        </div>
        <Button asChild variant="ghost" size="sm" className="min-h-11">
          <Link href="/login">{t("navLogin")}</Link>
        </Button>
      </motion.div>
    </section>
  );
}
