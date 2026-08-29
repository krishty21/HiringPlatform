"use client";
import { useEffect, useState, use } from "react";
import Link from "next/link";
import { AppShell } from "@/components/shared/AppShell";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { WageDisplay } from "@/components/shared/WageDisplay";
import { VerificationBadge } from "@/components/shared/VerificationBadge";
import { RatingStars } from "@/components/ratings/RatingStars";
import { SimilarJobs } from "@/components/jobs/SimilarJobs";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { toast } from "sonner";
import {
  ArrowLeft, ArrowRight, MapPin, Briefcase, Users, Share2, Loader2, Check, Clock,
  ShieldCheck, Gauge, IndianRupee, ChevronRight,
} from "lucide-react";
import { computeMatch } from "@/lib/matching/score";
import { explainMatch } from "@/lib/matching/explain";
import { haversineKm } from "@/lib/matching/haversine";

interface JobDetail {
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
  status: string;
  description: string;
  viewsCount?: number;
  employer?: { id: string; companyName: string; city: string; isVerified: boolean; ratingAvg?: number; ratingCount?: number };
  skills: { skillId: string; required: boolean; skill?: { nameEn: string; nameHi: string; nameTe: string } }[];
  matchScore: number | null;
  distanceKm: number | null;
  createdAt: string;
}

interface ApplicationExisting {
  id: string;
  status: string;
  alreadyApplied?: boolean;
}

interface WorkerProfileLite {
  id: string;
  tradeId: string | null;
  trade?: { id: string; nameEn: string; nameHi: string; nameTe: string; category: string } | null;
  yearsExp: number;
  city: string;
  lat: number;
  lng: number;
  wageMin: number;
  wageMax: number;
  shiftPref: "day" | "night" | "any";
  trustTier: "new" | "id_verified" | "skill_verified" | "top_pro";
  maxRadiusKm: number;
  skills: { skillId: string; proficiency: number; skill?: { nameEn: string } }[];
}

// Match-breakdown panel — premium, transparent, no "AI Match" label.
// Renders only when the worker's matchScore is available (i.e. the worker has
// at least one skill and the job has skills/trade). Mirrors the SRD §8.1
// weighting: Skills 35, Location 25, Experience 15, Wage 15, Trust 10.
function MatchExplanation({
  score,
  worker,
  job,
  distanceKm,
  t,
}: {
  score: number;
  worker: WorkerProfileLite;
  job: JobDetail;
  distanceKm: number;
  t: (k: any, v?: Record<string, string | number>) => string;
}) {
  // Re-compute the breakdown client-side using the same pure functions the
  // server uses. (computeMatch is pure TS; haversine is pure TS; both safe
  // for client use.)
  const result = computeMatch({
    worker: {
      id: worker.id, tradeId: worker.tradeId, yearsExp: worker.yearsExp,
      lat: worker.lat, lng: worker.lng, wageMin: worker.wageMin, wageMax: worker.wageMax,
      shiftPref: worker.shiftPref, trustTier: worker.trustTier, maxRadiusKm: worker.maxRadiusKm,
      skills: worker.skills.map(s => ({ skillId: s.skillId, proficiency: s.proficiency })),
    },
    job: {
      id: job.id, tradeId: job.tradeId, wageMin: job.wageMin, wageMax: job.wageMax,
      lat: job.lat, lng: job.lng, shift: job.shift, isUrgent: job.isUrgent,
      skills: job.skills.map(s => ({ skillId: s.skillId, required: s.required })),
    },
  });
  const b = result.breakdown;

  // Component weights → /xxx denominators (per Master Prompt §22).
  const rows: { key: string; label: string; value: number; denom: number }[] = [
    { key: "skills", label: t("landingS5Skills"), value: Math.round(b.S * 35), denom: 35 },
    { key: "location", label: t("landingS5Location"), value: Math.round(b.D * 25), denom: 25 },
    { key: "experience", label: t("landingS5Experience"), value: Math.round(b.E * 15), denom: 15 },
    { key: "wage", label: t("landingS5Wage"), value: Math.round(b.W * 15), denom: 15 },
    { key: "trust", label: t("landingS5Trust"), value: Math.round(b.T * 10), denom: 10 },
  ];

  // Top 3 plain-language reasons — uses the established explainMatch helper.
  const tradeName = worker.trade?.nameEn ?? null;
  const reasons = explainMatch({
    score: result,
    worker: { yearsExp: worker.yearsExp, tradeName, skillCount: worker.skills.length },
    job: { skillCount: job.skills.length, tradeName: job.trade?.nameEn ?? null, city: job.city, wageMin: job.wageMin, wageMax: job.wageMax },
    distanceKm,
  });

  return (
    <section
      aria-labelledby="match-explanation-heading"
      className="surface-raised rounded-md p-4 sm:p-5 flex flex-col gap-4 shadow-raise"
    >
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-3 min-w-0">
          <span className="text-3xl sm:text-4xl font-semibold tabular-nums text-ink leading-none">
            {score}
          </span>
          <span className="text-meta uppercase tracking-wider text-ink-subtle">
            {t("matchHeading")}
          </span>
        </div>
      </div>

      <dl className="flex flex-col gap-1.5 border-t border-border pt-3">
        {rows.map(r => (
          <div
            key={r.key}
            className="flex items-center justify-between gap-3 text-sm"
          >
            <dt className="text-ink-muted">{r.label}</dt>
            <dd className="tabular-nums text-ink font-medium">
              {r.value}
              <span className="text-ink-subtle">/{r.denom}</span>
            </dd>
          </div>
        ))}
      </dl>

      {reasons.length > 0 && (
        <ul className="flex flex-col gap-1.5 border-t border-border pt-3">
          {reasons.map((reason, i) => (
            <li
              key={i}
              className="flex items-start gap-2 text-sm text-ink leading-relaxed"
            >
              <Check className="size-3.5 text-positive shrink-0 mt-0.5" aria-hidden />
              <span className="text-pretty">{reason}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t, lang } = useLanguage();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [worker, setWorker] = useState<WorkerProfileLite | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [existingApp, setExistingApp] = useState<ApplicationExisting | null>(null);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    fetch(`/api/jobs/${encodeURIComponent(id)}`, { cache: "no-store" })
      .then(r => {
        if (r.status === 404) { setNotFound(true); return null; }
        if (!r.ok) throw new Error("fetch failed");
        return r.json();
      })
      .then((data: JobDetail | null) => { if (data) setJob(data); })
      .catch(() => setNotFound(true));

    // Fetch the worker's profile in parallel — needed for client-side
    // match-breakdown computation (we don't ship it from the API to keep
    // the contract frozen; the worker already trusts their own profile).
    fetch("/api/worker/profile", { cache: "no-store" })
      .then(r => {
        if (r.status === 403 || r.status === 404) return null;
        if (!r.ok) return null;
        return r.json();
      })
      .then((data: WorkerProfileLite | null) => { if (data) setWorker(data); })
      .catch(() => {});
  }, [id]);

  async function apply() {
    setApplying(true);
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jobId: id }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        if (j?.error === "JOB_CLOSED") throw new Error("job-closed");
        throw new Error("apply-failed");
      }
      const data = (await res.json()) as ApplicationExisting;
      setExistingApp(data);
      setApplied(true);
      toast.success(t("jobApplied"));
    } catch (e) {
      toast.error(
        e instanceof Error && e.message === "job-closed"
          ? t("jobClosedBanner")
          : t("errGeneric"),
      );
    } finally {
      setApplying(false);
    }
  }

  function shareWhatsApp() {
    if (!job) return;
    const tradeName = job.trade
      ? (lang === "hi" ? job.trade.nameHi : lang === "te" ? job.trade.nameTe : job.trade.nameEn)
      : job.title;
    const text = `${job.title}\n${tradeName} · ${job.city}\n₹${job.wageMin}-${job.wageMax}${t("perDay")} · ${t(job.shift === "day" ? "shiftDay" : job.shift === "night" ? "shiftNight" : "shiftAny")} ${t("jobShift")}\n${t("feedVerifiedEmployer")}: ${job.employer?.companyName ?? ""}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  if (notFound) {
    return (
      <AppShell>
        <EmptyState
          icon={Briefcase}
          title={t("jobNotFoundTitle")}
          description={t("jobNotFoundHint")}
          action={
            <Button asChild className="gap-2 min-h-11">
              <Link href="/jobs">{t("boardTitle")}</Link>
            </Button>
          }
        />
      </AppShell>
    );
  }

  if (!job) {
    return (
      <AppShell>
        <LoadingSkeleton count={4} />
      </AppShell>
    );
  }

  const tradeName = job.trade
    ? (lang === "hi" ? job.trade.nameHi : lang === "te" ? job.trade.nameTe : job.trade.nameEn)
    : null;
  const isApplied = applied || !!existingApp;
  const isClosed = job.status !== "open";
  const employerRating = job.employer?.ratingCount && job.employer.ratingCount > 0
    ? { avg: job.employer.ratingAvg ?? 0, count: job.employer.ratingCount }
    : null;
  const highlyRatedEmployer = !!employerRating && employerRating.avg >= 4.5 && employerRating.count >= 3;
  const hasMatch = job.matchScore != null && job.matchScore > 0 && worker;
  const distKm = job.distanceKm != null ? job.distanceKm : (worker ? haversineKm(worker.lat, worker.lng, job.lat, job.lng) : 0);

  return (
    <AppShell>
      <div className="flex flex-col gap-4">
        <Link
          href="/home"
          className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink w-fit min-h-11"
        >
          <ArrowLeft className="size-4" aria-hidden />
          {t("back")}
        </Link>

        <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
          {/* Main column — job summary + match breakdown + similar jobs */}
          <div className="flex flex-col gap-4">
            {/* Job summary — border-t sectioned, no gradient hairline */}
            <article className="surface-raised rounded-md overflow-hidden">
              <header className="px-5 py-4 sm:px-6 sm:py-5 flex flex-col gap-2 border-b border-border">
                {job.isUrgent && (
                  <p className="inline-flex items-center gap-1.5 text-meta font-medium text-warning-foreground">
                    <span className="status-dot is-warning" aria-hidden />
                    {t("feedUrgent")}
                  </p>
                )}
                <h1
                  className={`text-2xl sm:text-3xl font-semibold tracking-tight text-ink text-balance ${
                    isClosed ? "text-ink-subtle" : ""
                  }`}
                >
                  {job.title}
                </h1>
                {isClosed && (
                  <p className="inline-flex items-center gap-1.5 text-meta font-medium text-ink-muted">
                    <span className="status-dot is-neutral" aria-hidden />
                    {t("jobClosedBadge")}
                  </p>
                )}
                <p className="text-meta text-ink-muted flex items-center gap-1.5 flex-wrap">
                  {tradeName && <span>{tradeName}</span>}
                  {tradeName && <span aria-hidden>·</span>}
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-3.5" aria-hidden />
                    {job.city}
                    {job.distanceKm != null && (
                      <span className="text-ink-subtle"> · {job.distanceKm.toFixed(1)} {t("km")}</span>
                    )}
                  </span>
                  <span aria-hidden>·</span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="size-3.5" aria-hidden />
                    {new Date(job.createdAt).toLocaleDateString()}
                  </span>
                </p>
              </header>

              {/* Meta — dl grid with tabular numerals */}
              <dl className="grid grid-cols-2 sm:grid-cols-4 gap-y-3 gap-x-4 px-5 py-4 sm:px-6 sm:py-4 border-b border-border">
                <div className="flex flex-col gap-0.5">
                  <dt className="text-meta uppercase tracking-wide text-ink-subtle">
                    {t("jobWage")}
                  </dt>
                  <dd className="text-ink font-medium tabular-nums">
                    <WageDisplay min={job.wageMin} max={job.wageMax} size="md" />
                  </dd>
                </div>
                <div className="flex flex-col gap-0.5">
                  <dt className="text-meta uppercase tracking-wide text-ink-subtle flex items-center gap-1">
                    <Users className="size-3" aria-hidden />
                    {t("jobHeadcount")}
                  </dt>
                  <dd className="text-ink font-medium tabular-nums">
                    {job.headcount}
                  </dd>
                </div>
                <div className="flex flex-col gap-0.5">
                  <dt className="text-meta uppercase tracking-wide text-ink-subtle">
                    {t("jobShift")}
                  </dt>
                  <dd className="text-ink font-medium">
                    {t(job.shift === "day" ? "shiftDay" : job.shift === "night" ? "shiftNight" : "shiftAny")}
                  </dd>
                </div>
                <div className="flex flex-col gap-0.5">
                  <dt className="text-meta uppercase tracking-wide text-ink-subtle">
                    {t("jobLocation")}
                  </dt>
                  <dd className="text-ink font-medium">{job.city}</dd>
                </div>
              </dl>

              {/* Description */}
              {job.description && (
                <section className="px-5 py-4 sm:px-6 sm:py-4 border-b border-border">
                  <h2 className="text-sm font-semibold text-ink mb-1.5">
                    {t("jobDescription")}
                  </h2>
                  <p className="text-sm text-ink-muted whitespace-pre-line text-pretty">
                    {job.description}
                  </p>
                </section>
              )}

              {/* Skills — inline text, no chips */}
              {job.skills.length > 0 && (
                <section className="px-5 py-4 sm:px-6 sm:py-4 border-b border-border">
                  <h2 className="text-sm font-semibold text-ink mb-1.5 flex items-center gap-1.5">
                    <Briefcase className="size-4 text-ink-muted" aria-hidden />
                    {t("jobSkills")}
                  </h2>
                  <p className="text-sm text-ink-muted leading-relaxed">
                    {job.skills.map(s => {
                      const name = s.skill
                        ? (lang === "hi" ? s.skill.nameHi : lang === "te" ? s.skill.nameTe : s.skill.nameEn)
                        : "—";
                      return name + (s.required ? ` (${t("skillRequired").toLowerCase()})` : "");
                    }).join(", ")}
                  </p>
                </section>
              )}

              {/* Posted by */}
              {job.employer && (
                <section className="px-5 py-4 sm:px-6 sm:py-4">
                  <h2 className="text-sm font-semibold text-ink mb-2">
                    {t("jobPostedBy")}
                  </h2>
                  <div className="flex items-center gap-3 flex-wrap">
                    <p className="text-sm font-semibold text-ink">
                      {job.employer.companyName}
                    </p>
                    {job.employer.isVerified && (
                      <span className="trust-pill is-employer">
                        <ShieldCheck className="size-3.5" aria-hidden />
                        {t("feedVerifiedEmployer")}
                      </span>
                    )}
                    <span className="text-meta text-ink-muted inline-flex items-center gap-1">
                      <MapPin className="size-3" aria-hidden />
                      {job.employer.city}
                    </span>
                    {employerRating && (
                      <span
                        className="ml-auto inline-flex items-center gap-1.5 text-meta text-ink-muted shrink-0 tabular-nums"
                        aria-label={t("employerRatingAria", { avg: employerRating.avg, count: employerRating.count })}
                        title={highlyRatedEmployer ? t("employerRatingHighly") : undefined}
                      >
                        <RatingStars value={employerRating.avg} size="sm" readOnly />
                        <span className="font-medium text-ink">{employerRating.avg.toFixed(1)}</span>
                        <span className="text-ink-subtle">
                          · {employerRating.count === 1 ? t("ratingCountOne") : t("ratingCountMany", { count: employerRating.count })}
                        </span>
                      </span>
                    )}
                  </div>
                </section>
              )}
            </article>

            {/* Match explanation — premium, only when worker has a real score */}
            {hasMatch && (
              <MatchExplanation
                score={job.matchScore as number}
                worker={worker as WorkerProfileLite}
                job={job}
                distanceKm={distKm}
                t={t}
              />
            )}

            {/* Similar jobs discovery rail */}
            <SimilarJobs
              currentJobId={job.id}
              tradeId={job.tradeId}
              city={job.city}
              currentEmployerId={job.employer?.id}
              limit={3}
            />
          </div>

          {/* Apply rail — sticky on desktop, neutral */}
          <aside className="flex flex-col gap-3 lg:sticky lg:top-20 lg:self-start">
            <section className="surface-raised rounded-md p-4 flex flex-col gap-3 shadow-raise">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-ink">
                  {isApplied ? t("jobApplied") : isClosed ? t("jobClosedBadge") : t("jobApply")}
                </h2>
                {isApplied && (
                  <span className="trust-pill is-verified">
                    <Check className="size-3.5" aria-hidden />
                    {t("applied")}
                  </span>
                )}
              </div>

              {isClosed && !isApplied && (
                <div className="surface-inset rounded-md p-3 flex flex-col gap-1">
                  <p className="text-meta font-medium text-ink flex items-center gap-1.5">
                    <span className="status-dot is-neutral" aria-hidden />
                    {t("jobClosedBanner")}
                  </p>
                  <p className="text-meta text-ink-muted">{t("jobClosedHint")}</p>
                </div>
              )}

              {!isApplied && !isClosed && (
                <p className="text-meta text-ink-muted leading-relaxed">
                  {t("jobApplyConfirm")}
                </p>
              )}

              <Button
                type="button"
                onClick={apply}
                disabled={isApplied || applying || isClosed}
                className="min-h-12 gap-2 w-full"
                variant={isApplied ? "secondary" : isClosed ? "outline" : "default"}
                size="lg"
              >
                {applying ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : isApplied ? (
                  <Check className="size-5" aria-hidden />
                ) : isClosed ? (
                  <Briefcase className="size-5" aria-hidden />
                ) : (
                  <Briefcase className="size-5" aria-hidden />
                )}
                {isApplied ? t("applied") : isClosed ? t("jobClosedApplyDisabled") : t("jobApply")}
              </Button>

              <Button
                type="button"
                onClick={shareWhatsApp}
                variant="outline"
                className="min-h-11 gap-2 w-full"
              >
                <Share2 className="size-4" aria-hidden />
                {t("feedShare")}
              </Button>

              {existingApp && (
                <Link
                  href={`/applications/${existingApp.id}`}
                  className="inline-flex items-center justify-center gap-1.5 min-h-11 px-4 rounded-md border border-border bg-surface text-sm font-medium text-ink hover:bg-surface-sunken transition-colors"
                >
                  {t("trackerTitle")}
                  <ChevronRight className="size-4" aria-hidden />
                </Link>
              )}
            </section>

            {/* Compact wage strip — high-signal, low-noise */}
            <section className="surface-raised rounded-md p-4 flex flex-col gap-2">
              <p className="text-meta uppercase tracking-wide text-ink-subtle flex items-center gap-1.5">
                <IndianRupee className="size-3.5" aria-hidden />
                {t("passportWage")}
              </p>
              <p className="text-2xl font-semibold tabular-nums text-ink leading-none">
                <WageDisplay min={job.wageMin} max={job.wageMax} size="lg" />
              </p>
              <p className="text-meta text-ink-subtle">{t("perDay")}</p>
            </section>
          </aside>
        </div>
      </div>

      {/* r15: Sticky mobile apply bar — sits above the bottom tab bar.
       * Shows wage + match score compactly + the primary Apply CTA so the
       * user never has to scroll to the bottom to apply. Hidden on closed
       * jobs (CTA disabled anyway) and after applied (tracker link shown). */}
      {!isApplied && !isClosed && (
        <div
          className="md:hidden fixed left-0 right-0 bottom-16 z-20 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/85 px-4 py-3 flex items-center gap-3"
          aria-label={t("jobApply")}
        >
          <div className="flex flex-col gap-0 min-w-0 flex-1">
            <p className="text-sm font-semibold tabular-nums text-ink leading-tight">
              ₹{job.wageMin}–₹{job.wageMax}
              <span className="text-meta text-ink-subtle font-normal ml-1">{t("perDay")}</span>
            </p>
            {typeof job.matchScore === "number" && job.matchScore > 0 && (
              <p className="text-meta text-ink-muted leading-tight">
                {job.matchScore} {t("matchHeading")}
              </p>
            )}
          </div>
          <Button
            type="button"
            onClick={apply}
            disabled={applying}
            className="min-h-11 gap-2 bg-accent text-accent-foreground hover:opacity-90"
          >
            {applying ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Briefcase className="size-4" aria-hidden />
            )}
            {t("jobApply")}
          </Button>
        </div>
      )}
    </AppShell>
  );
}
