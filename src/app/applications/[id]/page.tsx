"use client";
import { useEffect, useState, use, useCallback } from "react";
import Link from "next/link";
import { AppShell } from "@/components/shared/AppShell";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { TrackerTimeline } from "@/components/worker/TrackerTimeline";
import { WageDisplay } from "@/components/shared/WageDisplay";
import { VerificationBadge } from "@/components/shared/VerificationBadge";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { toast } from "sonner";
import {
  ArrowLeft, MapPin, Briefcase, Users, Clock, Share2, Building2, RefreshCcw,
  Ban, CornerUpLeft, Loader2,
} from "lucide-react";
import { RatingDialog } from "@/components/ratings/RatingDialog";
import { ApplicationRatingsPanel } from "@/components/ratings/ApplicationRatingsPanel";
import { RatingSummary } from "@/components/ratings/RatingSummary";
import type { Application } from "@/lib/schemas";

interface ApplicationDetail extends Application {
  job: {
    id: string;
    title: string;
    tradeId: string | null;
    trade?: { id: string; nameEn: string; nameHi: string; nameTe: string; category: string } | null;
    headcount: number;
    wageMin: number;
    wageMax: number;
    city: string;
    lat: number;
    lng: number;
    shift: "day" | "night" | "any";
    isUrgent: boolean;
    description: string;
    employer?: { id: string; companyName: string; city: string; isVerified: boolean; industry: string };
  };
}

const STAGE_DOT: Record<string, "is-neutral" | "is-info" | "is-warning" | "is-positive" | "is-error"> = {
  applied: "is-neutral",
  shortlisted: "is-info",
  interview: "is-info",
  offer: "is-warning",
  hired: "is-positive",
  rejected: "is-error",
  withdrawn: "is-neutral",
};

export default function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t, lang } = useLanguage();
  const [app, setApp] = useState<ApplicationDetail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [ratingTick, setRatingTick] = useState(0);
  const [hasRated, setHasRated] = useState(false);
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);

  const WITHDRAWABLE = new Set(["applied", "shortlisted", "interview", "offer"]);

  async function withdrawApplication() {
    setBusy(true);
    try {
      const res = await fetch(`/api/applications/${id}/withdraw`, { method: "POST" });
      if (!res.ok) throw new Error();
      toast.success(t("withdrawSuccess"));
      setArmed(false);
      await load();
    } catch {
      toast.error(t("withdrawFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function reapply() {
    if (!app) return;
    setBusy(true);
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: app.job.id }),
      });
      if (!res.ok) throw new Error();
      toast.success(t("reapplySuccess"));
      await load();
    } catch {
      toast.error(t("applyFailed"));
    } finally {
      setBusy(false);
    }
  }

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/applications/${id}`, { cache: "no-store" });
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      if (!res.ok) return;
      const data = (await res.json()) as ApplicationDetail;
      setApp(data);
    } catch {}
  }, [id]);

  useEffect(() => {
    const id = setTimeout(load, 0);
    const pollId = setInterval(load, 5000);
    return () => { clearTimeout(id); clearInterval(pollId); };
  }, [load]);

  function shareWhatsApp() {
    if (!app) return;
    const text = `${t("trackerTitle")} — ${app.job.title}\n${t("jobPostedBy")}: ${app.job.employer?.companyName ?? ""}\n${t("trackerStageApplied")}: ${new Date(app.appliedAt).toLocaleDateString()}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  if (notFound) {
    return (
      <AppShell>
        <EmptyState
          icon={Briefcase}
          title={t("errNotFound")}
          description={t("trackerEmpty")}
          action={<Button asChild><Link href="/applications">{t("navApplications")}</Link></Button>}
        />
      </AppShell>
    );
  }

  if (!app) {
    return (
      <AppShell>
        <LoadingSkeleton count={3} />
      </AppShell>
    );
  }

  const tradeName = app.job.trade
    ? (lang === "hi" ? app.job.trade.nameHi : lang === "te" ? app.job.trade.nameTe : app.job.trade.nameEn)
    : null;

  const stageKey =
    app.status === "hired" ? "trackerStageHired" :
    app.status === "rejected" ? "trackerStageRejected" :
    app.status === "withdrawn" ? "trackerStageWithdrawn" :
    app.status === "offer" ? "trackerStageOffer" :
    app.status === "interview" ? "trackerStageInterview" :
    app.status === "shortlisted" ? "trackerStageShortlisted" :
    "trackerStageApplied";
  const dotClass = STAGE_DOT[app.status] ?? "is-neutral";
  const isTerminal = app.status === "hired" || app.status === "rejected" || app.status === "withdrawn";
  const isWithdrawn = app.status === "withdrawn";

  return (
    <AppShell>
      <div className="flex flex-col gap-4">
        <Link
          href="/applications"
          className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink w-fit min-h-11"
        >
          <ArrowLeft className="size-4" aria-hidden />
          {t("back")}
        </Link>

        {/* Status banner — color + shape, no gradient */}
        <section
          role="status"
          className={`rounded-md border px-4 py-3 flex items-center justify-between gap-3 flex-wrap ${
            isWithdrawn
              ? "border-dashed border-border bg-surface-sunken"
              : "border-border bg-surface"
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className={`status-dot ${dotClass}`} aria-hidden />
            <p className="text-sm font-semibold text-ink uppercase tracking-wide">
              {t(stageKey)}
            </p>
            {isWithdrawn && (
              <p className="text-meta text-ink-muted">
                · {t("withdrawBannerHint")}
              </p>
            )}
          </div>
          {isTerminal ? (
            <span className="text-meta text-ink-subtle inline-flex items-center gap-1.5 tabular-nums">
              <RefreshCcw className="size-3" aria-hidden />
              {t("livePollLabel")}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-meta font-medium text-ink-muted tabular-nums">
              <Loader2 className="size-3 animate-spin" aria-hidden />
              {t("livePollLabel")}
            </span>
          )}
        </section>

        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          {/* Job summary */}
          <article className="surface-raised rounded-md overflow-hidden flex flex-col">
            <header className="px-5 py-4 sm:px-6 border-b border-border flex flex-col gap-1.5">
              <p className="text-meta uppercase tracking-wider text-ink-subtle">
                {t("navApplications")}
              </p>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-ink text-balance">
                {app.job.title}
              </h1>
              <p className="text-meta text-ink-muted flex items-center gap-1.5 flex-wrap mt-1">
                {tradeName && <span>{tradeName}</span>}
                {tradeName && <span aria-hidden>·</span>}
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3.5" aria-hidden />
                  {app.job.city}
                </span>
                <span aria-hidden>·</span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3.5" aria-hidden />
                  {t("appliedOn", { date: new Date(app.appliedAt).toLocaleDateString() })}
                </span>
              </p>
            </header>

            {/* Meta — dl grid */}
            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-y-3 gap-x-4 px-5 py-4 sm:px-6 border-b border-border">
              <div className="flex flex-col gap-0.5">
                <dt className="text-meta uppercase tracking-wide text-ink-subtle">
                  {t("jobWage")}
                </dt>
                <dd className="text-ink font-medium tabular-nums">
                  <WageDisplay min={app.job.wageMin} max={app.job.wageMax} size="md" />
                </dd>
              </div>
              <div className="flex flex-col gap-0.5">
                <dt className="text-meta uppercase tracking-wide text-ink-subtle flex items-center gap-1">
                  <Users className="size-3" aria-hidden />
                  {t("jobHeadcount")}
                </dt>
                <dd className="text-ink font-medium tabular-nums">{app.job.headcount}</dd>
              </div>
              <div className="flex flex-col gap-0.5">
                <dt className="text-meta uppercase tracking-wide text-ink-subtle">
                  {t("jobShift")}
                </dt>
                <dd className="text-ink font-medium">
                  {t(app.job.shift === "day" ? "shiftDay" : app.job.shift === "night" ? "shiftNight" : "shiftAny")}
                </dd>
              </div>
            </dl>

            {/* Employer */}
            {app.job.employer && (
              <section className="px-5 py-4 sm:px-6 border-b border-border">
                <h2 className="text-sm font-semibold text-ink mb-2">
                  {t("jobPostedBy")}
                </h2>
                <div className="flex items-center gap-2 flex-wrap">
                  <Building2 className="size-4 text-ink-muted" aria-hidden />
                  <p className="text-sm font-semibold text-ink">
                    {app.job.employer.companyName}
                  </p>
                  {app.job.employer.isVerified && (
                    <VerificationBadge status="approved" label={t("feedVerifiedEmployer")} />
                  )}
                  <span className="text-meta text-ink-muted inline-flex items-center gap-1">
                    <MapPin className="size-3" aria-hidden />
                    {app.job.employer.city}
                  </span>
                  <span className="text-meta text-ink-subtle">· {app.job.employer.industry}</span>
                  <RatingSummary
                    endpoint="/api/ratings/employer"
                    userId={app.job.employer.id}
                    variant="compact"
                  />
                </div>
              </section>
            )}

            {app.job.description && (
              <section className="px-5 py-4 sm:px-6 border-b border-border">
                <h2 className="text-sm font-semibold text-ink mb-1.5">
                  {t("jobDescription")}
                </h2>
                <p className="text-sm text-ink-muted whitespace-pre-line text-pretty">
                  {app.job.description}
                </p>
              </section>
            )}

            <div className="px-5 py-4 sm:px-6 flex items-center gap-2 flex-wrap">
              <Button asChild variant="outline" className="gap-2 min-h-11">
                <Link href={`/jobs/${app.job.id}`}>
                  <Briefcase className="size-4" aria-hidden />
                  {t("boardTitle")}
                </Link>
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={shareWhatsApp}
                className="gap-2 min-h-11"
              >
                <Share2 className="size-4" aria-hidden />
                {t("feedShare")}
              </Button>
              {/* Worker-initiated actions */}
              {WITHDRAWABLE.has(app.status) && (
                <Button
                  type="button"
                  variant={armed ? "destructive" : "outline"}
                  size="sm"
                  onClick={() => {
                    if (!armed) {
                      setArmed(true);
                      setTimeout(() => setArmed(false), 4000);
                    } else {
                      withdrawApplication();
                    }
                  }}
                  disabled={busy}
                  className="gap-2 ml-auto min-h-11"
                  title={armed ? t("withdrawConfirmHint") : undefined}
                >
                  {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Ban className="size-4" aria-hidden />}
                  {armed ? t("withdrawConfirmHint") : t("withdrawAction")}
                </Button>
              )}
              {app.status === "withdrawn" && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={reapply}
                  disabled={busy}
                  className="gap-2 ml-auto min-h-11 border-positive/40 text-positive hover:bg-positive/10"
                >
                  {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <CornerUpLeft className="size-4" aria-hidden />}
                  {t("reapplyAction")}
                </Button>
              )}
            </div>
          </article>

          {/* Tracker timeline + rating panel */}
          <aside className="flex flex-col gap-4">
            <p className="text-meta text-ink-subtle inline-flex items-center gap-1.5 tabular-nums">
              <RefreshCcw className="size-3" aria-hidden />
              {t("livePollLabel")}
            </p>
            <TrackerTimeline application={app} />

            {/* Rating flow (R16): prompt after hired + 24h */}
            {app.status === "hired" && app.hiredAt && app.job.employer && !hasRated && (() => {
              const elapsed = Date.now() - new Date(app.hiredAt).getTime();
              const cooldownMs = 24 * 60 * 60 * 1000;
              const eligible = elapsed >= cooldownMs;
              const hoursLeft = Math.ceil((cooldownMs - elapsed) / (60 * 60 * 1000));
              return (
                <section
                  className={`rounded-md border p-4 ${
                    eligible
                      ? "border-accent/40 bg-accent/5"
                      : "border-dashed border-border bg-surface-sunken"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-surface text-ink-muted">
                      <Building2 className="size-4" aria-hidden />
                    </span>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-ink">
                        {t("ratingPromptWorkerTitle")}
                      </h3>
                      <p className="text-meta text-ink-muted mt-0.5">
                        {eligible
                          ? t("ratingPromptWorkerBody", { name: app.job.employer.companyName })
                          : t("ratingPromptCooldown", { hours: hoursLeft })}
                      </p>
                      {eligible && (
                        <div className="mt-3">
                          <RatingDialog
                            applicationId={app.id}
                            direction="worker_to_employer"
                            rateeName={app.job.employer.companyName}
                            triggerLabel={t("ratingPromptCta")}
                            triggerVariant="default"
                            triggerSize="sm"
                            onSubmitted={() => setRatingTick(prev => prev + 1)}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              );
            })()}

            {/* Ratings received on this application */}
            <ApplicationRatingsPanel
              key={ratingTick}
              applicationId={app.id}
              callerRole="worker"
              rateeDisplayName={app.job.employer?.companyName}
              onRatedByMe={setHasRated}
            />
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
