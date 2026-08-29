"use client";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { LandingHeader } from "@/components/public/LandingHeader";
import { HeroSection } from "@/components/public/HeroSection";
import { TrustPillar } from "@/components/public/TrustPillar";
import { HowItWorksStep } from "@/components/public/HowItWorksStep";
import { PublicFooter } from "@/components/public/PublicFooter";
import Link from "next/link";
import {
  Mic,
  ShieldCheck,
  Gauge,
  Handshake,
  HardHat,
  Briefcase,
  Check,
  MapPin,
  IndianRupee,
  Clock,
  ArrowRight,
} from "lucide-react";

/* tiny inline helpers — restrained, no decorative effects */

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="eyebrow text-ink-subtle">
      {children}
    </p>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="h-section">
      {children}
    </h2>
  );
}

function SectionBody({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-base text-ink-muted leading-relaxed text-pretty max-w-2xl">
      {children}
    </p>
  );
}

/* Section 3 — Product proof: a representative job card + passport */
function ProductProofJobCard() {
  const { t } = useLanguage();
  return (
    <div className="rounded-md border border-border bg-surface p-4 sm:p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-meta uppercase tracking-wide text-ink-subtle">
          {t("landingS3JobCardLabel")}
        </span>
        <span className="inline-flex items-center gap-1.5 text-meta font-medium text-positive">
          <span className="status-dot is-positive" aria-hidden />
          {t("landingS3JobCardVerified")}
        </span>
      </div>
      <h3 className="text-lg font-semibold text-ink leading-tight">
        {t("landingS3JobCardTrade")}
      </h3>
      <p className="text-meta text-ink-muted">{t("landingS3JobCardEmployer")}</p>
      <div className="grid grid-cols-2 gap-y-2 gap-x-4 pt-1">
        <div className="flex items-center gap-1.5 text-sm text-ink">
          <IndianRupee className="size-3.5 text-ink-subtle" aria-hidden />
          {t("landingS3JobCardWage")}
        </div>
        <div className="flex items-center gap-1.5 text-sm text-ink">
          <MapPin className="size-3.5 text-ink-subtle" aria-hidden />
          {t("landingS3JobCardDistance")}
        </div>
        <div className="flex items-center gap-1.5 text-sm text-ink">
          <Clock className="size-3.5 text-ink-subtle" aria-hidden />
          {t("landingS3JobCardShift")}
        </div>
        <div className="flex items-center gap-1.5 text-sm text-ink">
          <Gauge className="size-3.5 text-ink-subtle" aria-hidden />
          {t("landingS3JobCardMatch")}
        </div>
      </div>
      <p className="text-meta text-ink-muted border-t border-border pt-2 mt-1">
        {t("landingS3JobCardSkills")}
      </p>
    </div>
  );
}

function ProductProofPassport() {
  const { t } = useLanguage();
  return (
    <div className="passport-card rounded-md p-4 sm:p-5 flex flex-col gap-3 relative overflow-hidden">
      {/* Credential seal — top-right decorative श्र mark */}
      <span className="passport-seal" aria-hidden />
      <div className="flex items-center justify-between gap-2 relative">
        <span className="eyebrow text-ink-subtle flex items-center gap-2">
          {t("landingS3PassportLabel")}
          <span aria-hidden className="size-1 rounded-full bg-ink-subtle/40" />
          <span className="tabular-nums normal-case tracking-normal text-ink-muted">
            ID · SHRM-2025
          </span>
        </span>
        <span className="trust-pill is-verified">
          <Check className="size-3.5" aria-hidden />
          {t("landingS3PassportTier")}
        </span>
      </div>
      <div>
        <h3 className="text-lg font-semibold text-ink-strong leading-tight">
          {t("landingS3PassportName")}
        </h3>
        <p className="text-meta text-ink-muted">{t("landingS3PassportTrade")}</p>
      </div>
      <dl className="grid grid-cols-3 gap-y-2 gap-x-3 border-t border-border pt-3">
        <div className="flex flex-col gap-0.5">
          <dt className="eyebrow text-ink-subtle">Identity</dt>
          <dd className="text-sm text-positive font-semibold flex items-center gap-1">
            <span className="status-dot is-positive" aria-hidden />
            Verified
          </dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="eyebrow text-ink-subtle">Skills</dt>
          <dd className="text-sm text-positive font-semibold flex items-center gap-1">
            <span className="status-dot is-positive" aria-hidden />
            Verified
          </dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="eyebrow text-ink-subtle">Tier</dt>
          <dd className="text-sm text-ink font-semibold">Top Pro</dd>
        </div>
      </dl>
    </div>
  );
}

/* Section 4 — three-layer trust primitives */
function TrustLayerRow({
  icon: Icon,
  label,
  body,
}: {
  icon: LucideIcon;
  label: string;
  body: string;
}) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border last:border-b-0 last:pb-0">
      <span className="size-7 grid place-items-center rounded-md border border-border bg-surface text-ink-muted shrink-0">
        <Icon className="size-3.5" aria-hidden />
      </span>
      <div className="flex flex-col gap-0.5 min-w-0">
        <p className="text-sm font-semibold text-ink">{label}</p>
        <p className="text-meta text-ink-muted leading-relaxed text-pretty">
          {body}
        </p>
      </div>
    </div>
  );
}

/* Section 5 — match explanation block */
function MatchExplanationBlock() {
  const { t } = useLanguage();
  const rows: { key: string; label: string; score: string }[] = [
    { key: "skills", label: t("landingS5Skills"), score: "35/35" },
    { key: "location", label: t("landingS5Location"), score: "24/25" },
    { key: "experience", label: t("landingS5Experience"), score: "14/15" },
    { key: "wage", label: t("landingS5Wage"), score: "14/15" },
    { key: "trust", label: t("landingS5Trust"), score: "7/10" },
  ];
  return (
    <div className="rounded-md border border-border bg-surface p-4 sm:p-5 flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-2xl sm:text-3xl font-semibold tabular-nums text-ink">
          94
        </span>
        <span className="text-meta uppercase tracking-wider text-ink-subtle">
          match
        </span>
      </div>
      <dl className="flex flex-col gap-1.5 border-t border-border pt-3">
        {rows.map((r) => (
          <div
            key={r.key}
            className="flex items-center justify-between gap-3 text-sm"
          >
            <dt className="text-ink-muted">{r.label}</dt>
            <dd className="tabular-nums text-ink font-medium">{r.score}</dd>
          </div>
        ))}
      </dl>
      <ul className="flex flex-col gap-1.5 border-t border-border pt-3">
        {[
          t("landingS5Reason1"),
          t("landingS5Reason2"),
          t("landingS5Reason3"),
        ].map((reason, i) => (
          <li
            key={i}
            className="flex items-start gap-2 text-sm text-ink leading-relaxed"
          >
            <Check
              className="size-3.5 text-positive shrink-0 mt-0.5"
              aria-hidden
            />
            <span className="text-pretty">{reason}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* Section 6 — pipeline row */
function PipelineStage({ label, n }: { label: string; n: number }) {
  return (
    <div className="flex flex-col items-center gap-1.5 text-center min-w-0">
      <span className="text-2xl font-semibold tabular-nums text-ink">{n}</span>
      <span className="text-meta text-ink-muted leading-tight">{label}</span>
    </div>
  );
}

function PipelineArrow() {
  return (
    <span
      aria-hidden
      className="hidden sm:block self-start mt-2 text-ink-subtle"
    >
      →
    </span>
  );
}

export default function LandingPage() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen flex flex-col bg-background overflow-x-clip">
      <LandingHeader />

      <main className="flex-1 flex flex-col">
        {/* Hero — Section 1 narrative hook */}
        <HeroSection />

        {/* Section 1 — The problem */}
        <section className="border-t border-border">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 py-12 sm:py-16 flex flex-col gap-4">
            <SectionEyebrow>{t("landingS1Eyebrow")}</SectionEyebrow>
            <SectionHeading>{t("landingS1Title")}</SectionHeading>
            <SectionBody>{t("landingS1Body")}</SectionBody>
          </div>
        </section>

        {/* Section 2 — Two-sided solution */}
        <section className="border-t border-border bg-surface-sunken">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 py-12 sm:py-16 flex flex-col gap-8">
            <div className="flex flex-col gap-2">
              <SectionEyebrow>{t("landingS2Eyebrow")}</SectionEyebrow>
              <SectionHeading>{t("landingS2Title")}</SectionHeading>
            </div>
            <div className="grid sm:grid-cols-2 gap-6 sm:gap-10">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 text-accent">
                  <HardHat className="size-4" aria-hidden />
                  <h3 className="text-base font-semibold text-ink">
                    {t("landingS2WorkerTitle")}
                  </h3>
                </div>
                <ul className="flex flex-col gap-2 pl-6">
                  {[t("landingS2WorkerL1"), t("landingS2WorkerL2"), t("landingS2WorkerL3")].map((l, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-ink leading-relaxed">
                      <span className="text-ink-subtle mt-1.5 size-1.5 rounded-full bg-ink-subtle shrink-0" aria-hidden />
                      <span className="text-pretty">{l}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 text-primary">
                  <Briefcase className="size-4" aria-hidden />
                  <h3 className="text-base font-semibold text-ink">
                    {t("landingS2EmployerTitle")}
                  </h3>
                </div>
                <ul className="flex flex-col gap-2 pl-6">
                  {[t("landingS2EmployerL1"), t("landingS2EmployerL2"), t("landingS2EmployerL3")].map((l, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-ink leading-relaxed">
                      <span className="text-ink-subtle mt-1.5 size-1.5 rounded-full bg-ink-subtle shrink-0" aria-hidden />
                      <span className="text-pretty">{l}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3 — Product proof */}
        <section className="border-t border-border">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 py-12 sm:py-16 flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <SectionEyebrow>{t("landingS3Eyebrow")}</SectionEyebrow>
              <SectionHeading>{t("landingS3Title")}</SectionHeading>
            </div>
            <div className="grid sm:grid-cols-2 gap-4 sm:gap-5">
              <ProductProofJobCard />
              <ProductProofPassport />
            </div>
          </div>
        </section>

        {/* Section 4 — Trust system */}
        <section className="border-t border-border bg-surface-sunken">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 py-12 sm:py-16 flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <SectionEyebrow>{t("landingS4Eyebrow")}</SectionEyebrow>
              <SectionHeading>{t("landingS4Title")}</SectionHeading>
              <SectionBody>{t("landingS4Body")}</SectionBody>
            </div>
            <div className="rounded-md border border-border bg-surface px-4 sm:px-5 divide-y divide-border">
              <TrustLayerRow icon={ShieldCheck} label={t("landingS4Identity")} body={t("landingS4IdentityBody")} />
              <TrustLayerRow icon={Gauge} label={t("landingS4Skills")} body={t("landingS4SkillsBody")} />
              <TrustLayerRow icon={Clock} label={t("landingS4Reliability")} body={t("landingS4ReliabilityBody")} />
            </div>
          </div>
        </section>

        {/* Section 5 — Transparent matching */}
        <section className="border-t border-border">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 py-12 sm:py-16 flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <SectionEyebrow>{t("landingS5Eyebrow")}</SectionEyebrow>
              <SectionHeading>{t("landingS5Title")}</SectionHeading>
              <SectionBody>{t("landingS5Body")}</SectionBody>
            </div>
            <div className="max-w-md">
              <MatchExplanationBlock />
            </div>
          </div>
        </section>

        {/* Section 6 — Hiring pipeline */}
        <section className="border-t border-border bg-surface-sunken">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 py-12 sm:py-16 flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <SectionEyebrow>{t("landingS6Eyebrow")}</SectionEyebrow>
              <SectionHeading>{t("landingS6Title")}</SectionHeading>
              <SectionBody>{t("landingS6Body")}</SectionBody>
            </div>
            <div className="rounded-md border border-border bg-surface p-4 sm:p-5">
              <div className="grid grid-cols-5 sm:grid-cols-9 items-start gap-2 sm:gap-3">
                <PipelineStage label={t("landingS6StageApplied")} n={12} />
                <PipelineArrow />
                <PipelineStage label={t("landingS6StageShortlisted")} n={5} />
                <PipelineArrow />
                <PipelineStage label={t("landingS6StageInterview")} n={3} />
                <PipelineArrow />
                <PipelineStage label={t("landingS6StageOffer")} n={2} />
                <PipelineArrow />
                <PipelineStage label={t("landingS6StageHired")} n={2} />
              </div>
            </div>
          </div>
        </section>

        {/* Section 7 — Impact */}
        <section className="border-t border-border">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 py-12 sm:py-16 flex flex-col gap-4">
            <SectionEyebrow>{t("landingS7Eyebrow")}</SectionEyebrow>
            <SectionHeading>{t("landingS7Title")}</SectionHeading>
            <SectionBody>{t("landingS7Body")}</SectionBody>
          </div>
        </section>

        {/* Trust pillars (3-column, demoted to supporting role) */}
        <section className="border-t border-border bg-surface-sunken">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 py-12 sm:py-16 flex flex-col gap-6">
            <div className="grid sm:grid-cols-3 gap-5 sm:gap-6">
              <TrustPillar icon={Mic} titleKey="landingPillar1Title" bodyKey="landingPillar1Body" accent="" iconColor="" delay={0} />
              <TrustPillar icon={ShieldCheck} titleKey="landingPillar2Title" bodyKey="landingPillar2Body" accent="" iconColor="" delay={0.08} />
              <TrustPillar icon={Gauge} titleKey="landingPillar3Title" bodyKey="landingPillar3Body" accent="" iconColor="" delay={0.16} />
            </div>
          </div>
        </section>

        {/* How it works — vertical narrative */}
        <section className="border-t border-border">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 py-12 sm:py-16 flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <SectionEyebrow>{t("landingHowItWorksTitle")}</SectionEyebrow>
              <SectionHeading>{t("landingHowItWorksSubtitle")}</SectionHeading>
            </div>
            <div className="flex flex-col">
              <HowItWorksStep number={1} icon={Mic} titleKey="landingStep1Title" bodyKey="landingStep1Body" delay={0} />
              <HowItWorksStep number={2} icon={ShieldCheck} titleKey="landingStep2Title" bodyKey="landingStep2Body" delay={0.08} />
              <HowItWorksStep number={3} icon={Handshake} titleKey="landingStep3Title" bodyKey="landingStep3Body" delay={0.16} isLast />
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="border-t border-border bg-primary text-primary-foreground">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 py-12 sm:py-16 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
            <div className="flex flex-col gap-2">
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-balance">
                {t("landingFinalCtaTitle")}
              </h2>
              <p className="text-base text-primary-foreground/80 text-pretty max-w-lg">
                {t("landingFinalCtaBody")}
              </p>
            </div>
            <div className="flex flex-col sm:items-end gap-2 shrink-0">
              <Link
                href="/login?demo=demo-worker"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-accent text-accent-foreground font-medium text-sm hover:opacity-90 transition-opacity"
              >
                {t("landingFinalCtaWorker")}
                <ArrowRight className="size-4" aria-hidden />
              </Link>
              <Link
                href="/login?demo=demo-employer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md border border-primary-foreground/30 text-primary-foreground font-medium text-sm hover:bg-primary-foreground/5 transition-colors"
              >
                {t("landingFinalCtaEmployer")}
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
