"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { WageDisplay } from "@/components/shared/WageDisplay";
import { MatchScoreBadge } from "@/components/shared/MatchScoreBadge";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { useSavedJobs } from "@/hooks/use-saved-jobs";
import { toast } from "sonner";
import {
  MapPin,
  Briefcase,
  Users,
  Share2,
  Loader2,
  Check,
  Clock,
  Bookmark,
  BookmarkCheck,
  ShieldCheck,
  Gauge,
} from "lucide-react";

export interface WorkerJobCardData {
  id: string;
  title: string;
  tradeId: string | null;
  trade?: { id: string; nameEn: string; nameHi: string; nameTe: string; category: string } | null;
  headcount: number;
  wageMin: number;
  wageMax: number;
  city: string;
  shift: "day" | "night" | "any";
  isUrgent: boolean;
  description: string;
  employer?: { id: string; companyName: string; city: string; isVerified: boolean; ratingAvg?: number; ratingCount?: number };
  skills: { skillId: string; required: boolean; skill?: { nameEn: string } }[];
  matchScore: number | null;
  distanceKm: number | null;
  createdAt: string;
  applied?: boolean;
}

export function JobCard({ job, applied: initialApplied = false }: { job: WorkerJobCardData; applied?: boolean }) {
  const { t, lang } = useLanguage();
  const router = useRouter();
  const [applied, setApplied] = useState(initialApplied);
  const [submitting, setSubmitting] = useState(false);
  const { isSaved, toggle } = useSavedJobs();
  const saved = isSaved(job.id);

  const employerRating = job.employer?.ratingCount && job.employer.ratingCount > 0
    ? { avg: job.employer.ratingAvg ?? 0, count: job.employer.ratingCount }
    : null;
  const highlyRatedEmployer = !!employerRating && employerRating.avg >= 4.5 && employerRating.count >= 3;

  function toggleSave(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const wasSaved = isSaved(job.id);
    toggle(job.id);
    if (wasSaved) toast.success(t("jobUnsavedToast"));
    else toast.success(t("jobSavedToast"));
  }

  function stopCardKeypress(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") e.stopPropagation();
  }

  async function apply(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (applied || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jobId: job.id }),
      });
      if (!res.ok) throw new Error("apply-failed");
      setApplied(true);
      toast.success(t("jobApplied"));
    } catch {
      toast.error(t("errGeneric"));
    } finally {
      setSubmitting(false);
    }
  }

  function shareWhatsApp(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const tradeName = job.trade
      ? (lang === "hi" ? job.trade.nameHi : lang === "te" ? job.trade.nameTe : job.trade.nameEn)
      : job.title;
    const text = `${job.title}\n${tradeName} · ${job.city}\n₹${job.wageMin}-${job.wageMax}${t("perDay")} · ${t(job.shift === "day" ? "shiftDay" : job.shift === "night" ? "shiftNight" : "shiftAny")} ${t("jobShift")}\n${t("feedVerifiedEmployer")}: ${job.employer?.companyName ?? ""}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function open() {
    router.push(`/jobs/${job.id}`);
  }

  const tradeName = job.trade
    ? (lang === "hi" ? job.trade.nameHi : lang === "te" ? job.trade.nameTe : job.trade.nameEn)
    : null;

  // Localize shift label
  const shiftLabel = job.shift === "day" ? t("shiftDay") : job.shift === "night" ? t("shiftNight") : t("shiftAny");

  return (
    <Card
      className={`cursor-pointer transition-colors hover:bg-surface-sunken ${
        job.isUrgent ? "border-warning/40" : ""
      }`}
      onClick={open}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } }}
      aria-label={job.title}
    >
      <CardContent className="p-4 flex flex-col gap-3">
        {/* Row 1 — Urgent flag (small, no ribbon) */}
        {job.isUrgent && (
          <p className="inline-flex items-center gap-1.5 text-meta font-medium text-warning-foreground">
            <span className="status-dot is-warning" aria-hidden />
            {t("feedUrgent")}
          </p>
        )}

        {/* Row 2 — Title + bookmark + match */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0 flex flex-col gap-1">
            <h3 className="text-base font-semibold text-ink leading-tight line-clamp-2 text-pretty">
              {job.title}
            </h3>
            <p className="text-meta text-ink-muted flex items-center gap-1.5 flex-wrap">
              {tradeName && <span>{tradeName}</span>}
              {tradeName && <span aria-hidden>·</span>}
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3" aria-hidden />
                {job.city}
                {job.distanceKm != null && (
                  <span className="text-ink-subtle"> · {job.distanceKm.toFixed(1)} {t("km")}</span>
                )}
              </span>
            </p>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <button
              type="button"
              onClick={toggleSave}
              onKeyDown={stopCardKeypress}
              aria-pressed={saved}
              aria-label={saved ? t("unsaveJobLabel") : t("saveJobLabel")}
              title={saved ? t("unsaveJobLabel") : t("saveJobLabel")}
              className={`grid place-items-center size-8 rounded-md border border-border bg-surface hover:bg-surface-sunken transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                saved ? "text-primary" : "text-ink-muted"
              }`}
            >
              {saved
                ? <BookmarkCheck className="size-4" aria-hidden />
                : <Bookmark className="size-4" aria-hidden />}
            </button>
            {job.matchScore != null && <MatchScoreBadge score={job.matchScore} size="md" />}
          </div>
        </div>

        {/* Row 3 — Employer + verified + rating (semantic) */}
        {job.employer && (
          <div className="flex items-center gap-2 min-w-0 text-sm">
            <span className="text-ink-muted truncate">{job.employer.companyName}</span>
            {job.employer.isVerified && (
              <span className="trust-pill is-employer shrink-0">
                <ShieldCheck className="size-3.5" aria-hidden />
                <span className="text-meta">{t("feedVerifiedEmployer")}</span>
              </span>
            )}
            {employerRating && (
              <span
                className="ml-auto inline-flex items-center gap-1 text-meta text-ink-muted shrink-0 tabular-nums"
                aria-label={t("employerRatingAria", { avg: employerRating.avg, count: employerRating.count })}
                title={highlyRatedEmployer ? t("employerRatingHighly") : undefined}
              >
                <Gauge className="size-3.5 text-ink-subtle" aria-hidden />
                {employerRating.avg.toFixed(1)} ({employerRating.count})
              </span>
            )}
          </div>
        )}

        {/* Row 4 — Meta: wage, headcount, shift — semantic grid, no chips */}
        <dl className="grid grid-cols-3 gap-2 text-sm border-t border-border pt-2.5">
          <div className="flex flex-col gap-0.5">
            <dt className="text-meta uppercase tracking-wide text-ink-subtle">
              {t("feedFilterWage")}
            </dt>
            <dd className="text-ink font-medium tabular-nums">
              <WageDisplay min={job.wageMin} max={job.wageMax} size="sm" />
            </dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-meta uppercase tracking-wide text-ink-subtle">
              {t("jobHeadcount")}
            </dt>
            <dd className="text-ink font-medium tabular-nums flex items-center gap-1">
              <Users className="size-3 text-ink-subtle" aria-hidden />
              {job.headcount}
            </dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-meta uppercase tracking-wide text-ink-subtle">
              {t("feedFilterShift")}
            </dt>
            <dd className="text-ink font-medium">{shiftLabel}</dd>
          </div>
        </dl>

        {/* Row 5 — Skills as inline text (no chips) */}
        {job.skills.length > 0 && (
          <p className="text-meta text-ink-muted leading-relaxed">
            <span className="text-ink-subtle uppercase tracking-wide mr-1.5">
              {t("onboardSkills")}:
            </span>
            {job.skills.slice(0, 4).map((s, i) => (
              <span key={s.skillId}>
                {s.skill?.nameEn ?? "—"}
                {i < Math.min(4, job.skills.length) - 1 ? ", " : ""}
              </span>
            ))}
            {job.skills.length > 4 && (
              <span className="text-ink-subtle"> +{job.skills.length - 4}</span>
            )}
          </p>
        )}

        {/* Row 6 — Actions */}
        <div className="flex items-center gap-2 pt-1">
          <Button
            type="button"
            onClick={apply}
            disabled={applied || submitting}
            className="flex-1 gap-2 min-h-11"
            variant={applied ? "secondary" : "default"}
            aria-label={applied ? t("jobApplied") : t("jobApply")}
          >
            {submitting ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : applied ? (
              <Check className="size-4" aria-hidden />
            ) : (
              <Briefcase className="size-4" aria-hidden />
            )}
            {applied ? t("applied") : t("jobApply")}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={shareWhatsApp}
            aria-label={t("feedShare")}
            className="size-11 p-0"
          >
            <Share2 className="size-4" aria-hidden />
          </Button>
        </div>

        {/* Row 7 — Posted time, meta */}
        <p className="text-meta text-ink-subtle flex items-center gap-1">
          <Clock className="size-3" aria-hidden />
          {new Date(job.createdAt).toLocaleDateString()}
        </p>
      </CardContent>
    </Card>
  );
}
