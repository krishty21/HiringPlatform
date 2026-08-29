"use client";
// /employer/candidates/[id] — Master Prompt §29: candidate profile as PROFESSIONAL DOSSIER.
// Primary hierarchy: 1. Identity 2. Verification 3. Skills 4. Experience
//   5. Availability 6. Wage expectation 7. Location 8. Match explanation
//   9. Reputation 10. Actions.
// Employer should answer "Should I shortlist this person?" in seconds.
//
// Slop removed: motion entrance on main + side rail, amber Star proficiency chips,
//   emerald available-today Badge, emerald/rose endorsements card backgrounds,
//   gradient amber rating-prompt card.
// Added: passport-card with passport-stamp (verified worker), border-t sectioned dl
//   dossier layout, status-dot primitives, surface-inset for side-rail panels.
import { useEffect, useState, use } from "react";
import Link from "next/link";
import { AppShell } from "@/components/shared/AppShell";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { TrustTierBadge } from "@/components/shared/TrustTierBadge";
import { WageDisplay } from "@/components/shared/WageDisplay";
import { EndorsementModal } from "@/components/employer/EndorsementModal";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft, MapPin, Briefcase, Eye, Clock, IndianRupee, Award,
  ShieldCheck, FileText, ChevronRight, ArrowRight,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { toast } from "sonner";
import { RatingDialog } from "@/components/ratings/RatingDialog";
import { ApplicationRatingsPanel } from "@/components/ratings/ApplicationRatingsPanel";
import { RatingSummary } from "@/components/ratings/RatingSummary";
import { TopRatedBadge } from "@/components/ratings/TopRatedBadge";
import type { Skill } from "@/lib/schemas";
import { cn } from "@/lib/utils";

interface CandidateDetail {
  id: string;
  fullName: string;
  tradeName: string | null;
  yearsExp: number;
  city: string;
  wageMin: number;
  wageMax: number;
  shiftPref: string;
  bio: string;
  availableToday: boolean;
  trustTier: "new" | "id_verified" | "skill_verified" | "top_pro";
  trustScore: number;
  profileViews: number;
  passportPublic: boolean;
  languages: string[];
  skills: { skillId: string; proficiency: number; nameEn: string; category: string }[];
  endorsements: {
    id: string;
    comment: string;
    createdAt: string;
    skillName: string;
    companyName: string;
    employerVerified: boolean;
  }[];
  distanceKm: number | null;
}

export default function CandidateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t } = useLanguage();
  const [candidate, setCandidate] = useState<CandidateDetail | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [jobs, setJobs] = useState<{ id: string; title: string }[]>([]);
  const [shortlistJobId, setShortlistJobId] = useState<string>("");
  const [shortlisting, setShortlisting] = useState(false);
  const [endorsementOpen, setEndorsementOpen] = useState(false);
  // Hired application (if any) for this candidate at this employer's jobs.
  const [hiredApp, setHiredApp] = useState<{ id: string; hiredAt: string | null; jobTitle: string } | null>(null);
  const [ratingTick, setRatingTick] = useState(0);
  const [hasRated, setHasRated] = useState(false);

  useEffect(() => {
    // Fetch candidate + bump profile_views atomically.
    Promise.all([
      fetch(`/api/worker/${id}`).then(r => r.json()),
      fetch(`/api/worker/${id}/view`, { method: "POST" }).catch(() => {}),
    ])
      .then(([data]) => setCandidate(data as CandidateDetail))
      .catch(() => setCandidate(null));

    fetch("/api/skills").then(r => r.json()).then((d: { items: Skill[] }) => setSkills(d.items ?? []));
    fetch("/api/employer/jobs").then(r => r.json()).then((d: { items: { id: string; title: string }[] }) => setJobs(d.items ?? []));
    // Look up any HIRED application for this worker at the caller's jobs.
    fetch(`/api/employer/applications`)
      .then(r => r.ok ? r.json() : { items: [] })
      .then(d => {
        const found = (d.items ?? []).find((a: { workerId: string; status: string; job: { title: string } }) =>
          a.workerId === id && a.status === "hired");
        if (found) {
          setHiredApp({ id: found.id, hiredAt: found.hiredAt ?? null, jobTitle: found.job.title });
        } else {
          setHiredApp(null);
        }
      })
      .catch(() => setHiredApp(null));
  }, [id]);

  async function shortlist() {
    if (!shortlistJobId) {
      toast.error(t("shortlistPickJobToast"));
      return;
    }
    setShortlisting(true);
    try {
      const res = await fetch("/api/employer/shortlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ workerId: id, jobId: shortlistJobId }),
      });
      if (!res.ok) throw new Error("FAILED");
      toast.success(t("shortlistSuccessToast"));
    } catch {
      toast.error(t("shortlistFailedToast"));
    } finally {
      setShortlisting(false);
    }
  }

  if (!candidate) {
    return (
      <AppShell>
        <LoadingSkeleton count={4} />
      </AppShell>
    );
  }

  const initials = candidate.fullName.split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase();
  const isVerified = candidate.trustTier === "skill_verified" || candidate.trustTier === "top_pro";

  return (
    <AppShell>
      <main className="flex flex-col gap-4">
        <Link
          href="/employer/candidates"
          className="inline-flex items-center gap-1 text-meta text-ink-subtle hover:text-ink w-fit"
        >
          <ArrowLeft className="size-4" aria-hidden />
          {t("candidatesBack")}
        </Link>

        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          {/* DOSSIER — left/main */}
          <article className="passport-card rounded-md h-full" aria-label={t("candidatesDossierAria")}>
            <div className="p-6 flex flex-col gap-0">
              {/* 1. Identity — border-b sectioned */}
              <header className="flex items-start gap-4 border-b border-border pb-4">
                <Avatar className="size-16 border border-border">
                  <AvatarFallback className="text-lg font-semibold bg-primary/10 text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-meta uppercase tracking-wide text-ink-subtle">
                    {t("candidatesIdentity")}
                  </p>
                  <h1 className="text-xl font-semibold tracking-tight text-ink mt-0.5">
                    {candidate.fullName}
                  </h1>
                  <p className="text-sm text-ink-muted flex items-center gap-1.5 mt-1">
                    <Briefcase className="size-3.5 text-ink-subtle" aria-hidden />
                    {candidate.tradeName ?? "—"} · {candidate.yearsExp} {t("passportYears")}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <TrustTierBadge tier={candidate.trustTier} score={candidate.trustScore} size="lg" />
                    <TopRatedBadge workerProfileId={id} size="md" />
                    {candidate.availableToday && (
                      <span className="inline-flex items-center gap-1 text-xs text-positive">
                        <span className="status-dot is-positive" aria-hidden />
                        {t("today")}
                      </span>
                    )}
                    {candidate.distanceKm != null && (
                      <span className="inline-flex items-center gap-1 text-xs text-ink-muted">
                        <MapPin className="size-3 text-ink-subtle" aria-hidden />
                        {candidate.distanceKm.toFixed(1)} {t("km")}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 text-xs text-ink-muted">
                      <Eye className="size-3 text-ink-subtle" aria-hidden />
                      {t("viewsCount", { count: candidate.profileViews })}
                    </span>
                  </div>
                </div>
                {isVerified && (
                  <span className="passport-stamp inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold">
                    <ShieldCheck className="size-3.5" aria-hidden />
                    {t("passportTierVerified")}
                  </span>
                )}
              </header>

              {/* 2. Verification — border-b sectioned dl */}
              <section className="border-b border-border py-4">
                <h2 className="text-meta uppercase tracking-wide text-ink-subtle mb-2">
                  {t("verifyStatusId")}
                </h2>
                <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="flex items-center gap-2 text-sm">
                    <dt className="text-ink-subtle">{t("verifyStatusId")}</dt>
                    <dd className="flex items-center gap-1.5 text-ink">
                      {isVerified ? (
                        <>
                          <span className="status-dot is-positive" aria-hidden />
                          {t("passportTierVerified")}
                        </>
                      ) : (
                        <>
                          <span className="status-dot is-warning" aria-hidden />
                          {t("passportTierPending")}
                        </>
                      )}
                    </dd>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <dt className="text-ink-subtle">{t("verifyStatusSkills")}</dt>
                    <dd className="flex items-center gap-1.5 text-ink">
                      <span className={`status-dot ${candidate.skills.length > 0 ? "is-positive" : "is-neutral"}`} aria-hidden />
                      {candidate.skills.length} {t("passportSkills").toLowerCase()}
                    </dd>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <dt className="text-ink-subtle">{t("passportTrustScore")}</dt>
                    <dd className="text-ink tabular-nums">{candidate.trustScore}</dd>
                  </div>
                </dl>
              </section>

              {/* 3. Skills — border-b sectioned dl */}
              <section className="border-b border-border py-4">
                <h2 className="text-meta uppercase tracking-wide text-ink-subtle mb-2">
                  {t("passportSkills")}
                </h2>
                <dl className="grid gap-2 sm:grid-cols-2">
                  {candidate.skills.length === 0 && (
                    <p className="text-sm text-ink-subtle">{t("candidatesNoSkills")}</p>
                  )}
                  {candidate.skills.map(s => (
                    <div key={s.skillId} className="flex items-center justify-between gap-2 text-sm">
                      <dt className="text-ink truncate">{s.nameEn}</dt>
                      <dd
                        className="flex items-center gap-0.5 shrink-0"
                        aria-label={t("proficiencyAria", { level: s.proficiency })}
                      >
                        {Array.from({ length: 5 }).map((_, i) => (
                          <span
                            key={i}
                            className={cn(
                              "size-1.5 rounded-full",
                              i < s.proficiency ? "bg-accent" : "bg-border",
                            )}
                            aria-hidden
                          />
                        ))}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>

              {/* 4. Experience / 5. Availability / 6. Wage / 7. Location — border-b sectioned dl grid */}
              <section className="border-b border-border py-4">
                <h2 className="text-meta uppercase tracking-wide text-ink-subtle mb-2">
                  {t("candidatesExperienceAvail")}
                </h2>
                <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <dt className="text-meta text-ink-subtle">{t("passportExperience")}</dt>
                    <dd className="text-sm text-ink mt-0.5 tabular-nums">
                      {candidate.yearsExp} {t("passportYears")}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-meta text-ink-subtle">{t("preferredShift")}</dt>
                    <dd className="text-sm text-ink mt-0.5">
                      {t(candidate.shiftPref === "day" ? "shiftDay" : candidate.shiftPref === "night" ? "shiftNight" : "shiftAny")}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-meta text-ink-subtle flex items-center gap-1">
                      <Clock className="size-3" aria-hidden />
                      {t("candidatesAvailable")}
                    </dt>
                    <dd className="text-sm text-ink mt-0.5 flex items-center gap-1.5">
                      <span className={`status-dot ${candidate.availableToday ? "is-positive" : "is-neutral"}`} aria-hidden />
                      {candidate.availableToday ? t("today") : t("candidatesNotToday")}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-meta text-ink-subtle flex items-center gap-1">
                      <MapPin className="size-3" aria-hidden />
                      {t("passportCity")}
                    </dt>
                    <dd className="text-sm text-ink mt-0.5">{candidate.city}</dd>
                  </div>
                </dl>
              </section>

              {/* 6. Wage expectation — border-b sectioned */}
              <section className="border-b border-border py-4">
                <h2 className="text-meta uppercase tracking-wide text-ink-subtle mb-2">
                  {t("passportWage")}
                </h2>
                <div className="flex items-center gap-3">
                  <IndianRupee className="size-4 text-ink-subtle" aria-hidden />
                  <WageDisplay min={candidate.wageMin} max={candidate.wageMax} size="md" />
                </div>
              </section>

              {/* 8. Match explanation — border-b sectioned (skipped if no distance/wage data) */}
              {candidate.distanceKm != null && (
                <section className="border-b border-border py-4">
                  <h2 className="text-meta uppercase tracking-wide text-ink-subtle mb-2">
                    {t("matchHeading")}
                  </h2>
                  <p className="text-sm text-ink-muted flex items-start gap-1.5">
                    <ChevronRight className="size-3 mt-0.5 shrink-0 text-ink-subtle" aria-hidden />
                    {t("candidatesMatchExplainer", { distance: candidate.distanceKm.toFixed(1), years: candidate.yearsExp })}
                  </p>
                </section>
              )}

              {/* 9. Reputation — endorsements */}
              {candidate.endorsements.length > 0 && (
                <section className="border-b border-border py-4">
                  <h2 className="text-meta uppercase tracking-wide text-ink-subtle mb-2 flex items-center gap-2">
                    <Award className="size-3.5 text-ink-subtle" aria-hidden />
                    {t("passportEndorsements")}
                    <span className="text-ink-muted tabular-nums">{candidate.endorsements.length}</span>
                  </h2>
                  <ul className="flex flex-col gap-2">
                    {candidate.endorsements.map(e => (
                      <li key={e.id} className="surface-inset rounded-md p-3">
                        <div className="flex items-center justify-between text-meta">
                          <span className="font-semibold text-ink">{e.companyName}</span>
                          {e.employerVerified && (
                            <span className="trust-pill is-verified text-[10px]">
                              <ShieldCheck className="size-3" aria-hidden />
                              {t("verifiedChip")}
                            </span>
                          )}
                        </div>
                        <p className="text-sm mt-1 text-ink-muted">{e.comment || t("endorsementFallback", { skill: e.skillName })}</p>
                        <p className="text-[10px] text-ink-subtle mt-1">
                          {new Date(e.createdAt).toLocaleDateString()}
                        </p>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Bio (if any) */}
              {candidate.bio && (
                <section className="py-4">
                  <h2 className="text-meta uppercase tracking-wide text-ink-subtle mb-2">
                    {t("aboutLabel")}
                  </h2>
                  <p className="text-sm text-ink-muted">{candidate.bio}</p>
                </section>
              )}
            </div>
          </article>

          {/* SIDE RAIL — 10. Actions */}
          <aside className="flex flex-col gap-4 lg:sticky lg:top-20 lg:self-start" aria-label={t("candidatesActionsAria")}>
            <div className="surface-raised shadow-raise rounded-md p-4 flex flex-col gap-3">
              <h2 className="text-base font-semibold text-ink">{t("shortlistForJob")}</h2>
              <div className="grid gap-2">
                <Label htmlFor="jobId" className="text-meta uppercase tracking-wide text-ink-subtle">
                  {t("pickJob")}
                </Label>
                <Select value={shortlistJobId} onValueChange={setShortlistJobId}>
                  <SelectTrigger id="jobId" className="min-h-11 w-full">
                    <SelectValue placeholder={t("chooseJob")} />
                  </SelectTrigger>
                  <SelectContent>
                    {jobs.map(j => (
                      <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={shortlist} disabled={shortlisting} className="min-h-11 gap-2">
                {shortlisting ? t("shortlistSubmitting") : t("shortlistCta")}
                <ArrowRight className="size-4" aria-hidden />
              </Button>
            </div>

            <div className="surface-raised shadow-raise rounded-md p-4">
              <h2 className="text-base font-semibold text-ink flex items-center gap-2 mb-3">
                <Award className="size-4 text-ink-subtle" aria-hidden />
                {t("pipelineEndorse")}
              </h2>
              <Button onClick={() => setEndorsementOpen(true)} variant="outline" className="min-h-11 w-full gap-2">
                <FileText className="size-4" aria-hidden />
                {t("pipelineEndorsePrompt")}
              </Button>
            </div>

            {/* Worker rating summary — avg received from all employers */}
            <RatingSummary
              endpoint="/api/ratings/worker"
              userId={id}
              title={t("ratingSummaryWorkerTitle")}
            />

            {/* Rate-this-worker prompt: appears only when there's a hired application + 24h cooldown */}
            {hiredApp && !hasRated && (() => {
              const elapsed = hiredApp.hiredAt ? Date.now() - new Date(hiredApp.hiredAt).getTime() : 0;
              const cooldownMs = 24 * 60 * 60 * 1000;
              const eligible = elapsed >= cooldownMs;
              const hoursLeft = Math.max(0, Math.ceil((cooldownMs - elapsed) / (60 * 60 * 1000)));
              return (
                <div
                  className={`rounded-md border p-4 ${
                    eligible
                      ? "border-accent/40 bg-accent/5"
                      : "border-dashed border-border bg-surface-sunken"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-surface text-ink-subtle" aria-hidden>
                      <Award className="size-4" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-ink">{t("ratingPromptEmployerTitle")}</h3>
                      <p className="text-meta text-ink-subtle mt-0.5">
                        {eligible
                          ? t("ratingPromptEmployerBody", { name: candidate?.fullName ?? "" })
                          : t("ratingPromptCooldown", { hours: hoursLeft })}
                      </p>
                      <p className="text-[10px] text-ink-subtle mt-1 italic">
                        {t("ratingPromptJobContext", { title: hiredApp.jobTitle })}
                      </p>
                      {eligible && candidate && (
                        <div className="mt-3">
                          <RatingDialog
                            applicationId={hiredApp.id}
                            direction="employer_to_worker"
                            rateeName={candidate.fullName}
                            triggerLabel={t("ratingPromptCta")}
                            triggerVariant="default"
                            triggerSize="sm"
                            onSubmitted={() => setRatingTick(prev => prev + 1)}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Ratings received on this application (refreshes when ratingTick bumps) */}
            {hiredApp && (
              <ApplicationRatingsPanel
                key={ratingTick}
                applicationId={hiredApp.id}
                callerRole="employer"
                rateeDisplayName={candidate?.fullName}
                onRatedByMe={setHasRated}
              />
            )}
          </aside>
        </div>

        {endorsementOpen && (
          <EndorsementModal
            open={endorsementOpen}
            onClose={() => setEndorsementOpen(false)}
            workerId={id}
            workerName={candidate.fullName}
            skills={skills}
          />
        )}
      </main>
    </AppShell>
  );
}
