"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WageDisplay } from "@/components/shared/WageDisplay";
import { MatchScoreBadge } from "@/components/shared/MatchScoreBadge";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { useSavedJobs } from "@/hooks/use-saved-jobs";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  MapPin, Zap, Briefcase, Users, Share2, Loader2, Check, Clock,
  Bookmark, BookmarkCheck, Star, ShieldCheck,
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

  // Employer reputation (round 8) — from the feed API's rating summary
  const employerRating = job.employer?.ratingCount && job.employer.ratingCount > 0
    ? { avg: job.employer.ratingAvg ?? 0, count: job.employer.ratingCount }
    : null;
  const highlyRatedEmployer = !!employerRating && employerRating.avg >= 4.5 && employerRating.count >= 3;
  const employerInitials = job.employer?.companyName
    ?.split(" ").filter(Boolean).map(p => p[0]).slice(0, 2).join("").toUpperCase() ?? "";

  function toggleSave(e: React.MouseEvent) {
    // MUST come first — the whole card is clickable, so stop the event before
    // it bubbles up to the card's onClick (which navigates to the job detail).
    e.preventDefault();
    e.stopPropagation();
    const wasSaved = isSaved(job.id);
    toggle(job.id);
    if (wasSaved) toast.success(t("jobUnsavedToast"));
    else toast.success(t("jobSavedToast"));
  }

  function stopCardKeypress(e: React.KeyboardEvent) {
    // Keyboard equivalent of stopPropagation: the card's onKeyDown handler
    // opens the job on Enter/Space — swallow those when focus is on the button.
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
    const text = `🛠️ ${job.title}\n${tradeName} · ${job.city}\n₹${job.wageMin}-${job.wageMax}${t("perDay")} · ${t(job.shift === "day" ? "shiftDay" : job.shift === "night" ? "shiftNight" : "shiftAny")} ${t("jobShift")}\n${t("feedVerifiedEmployer")}: ${job.employer?.companyName ?? ""}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function open() {
    router.push(`/jobs/${job.id}`);
  }

  const tradeName = job.trade
    ? (lang === "hi" ? job.trade.nameHi : lang === "te" ? job.trade.nameTe : job.trade.nameEn)
    : null;

  return (
    <Card
      className={`relative cursor-pointer transition-all hover:shadow-lg hover:-translate-y-0.5 ${job.isUrgent ? "border-accent/60" : highlyRatedEmployer ? "border-amber-300/60" : "hover:border-primary/40"}`}
      onClick={open}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } }}
    >
      {/* Top gradient hairline — urgent (saffron) > highly-rated employer (amber) > subtle */}
      <div
        aria-hidden
        className={`absolute inset-x-0 top-0 h-1 rounded-t-xl ${job.isUrgent ? "bg-gradient-to-r from-accent to-rose-400" : highlyRatedEmployer ? "bg-gradient-to-r from-amber-400 to-amber-300" : "bg-gradient-to-r from-primary/25 to-primary/5"}`}
      />
      <CardContent className="p-4 flex flex-col gap-3 pt-5">
        {/* Urgent ribbon */}
        {job.isUrgent && (
          <div className="self-start inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-accent-foreground">
            <Zap className="size-3" />
            {t("feedUrgent")}
          </div>
        )}

        {/* Title + match + bookmark */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-base leading-tight line-clamp-2">{job.title}</p>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5 flex-wrap">
              {tradeName && <span>{tradeName}</span>}
              {tradeName && <span aria-hidden>·</span>}
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3" />
                {job.city}
                {job.distanceKm != null && <span className="text-muted-foreground"> · {job.distanceKm.toFixed(1)} {t("km")}</span>}
              </span>
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <motion.button
              type="button"
              whileTap={{ scale: 0.85 }}
              onClick={toggleSave}
              onKeyDown={stopCardKeypress}
              aria-pressed={saved}
              aria-label={saved ? t("unsaveJobLabel") : t("saveJobLabel")}
              title={saved ? t("unsaveJobLabel") : t("saveJobLabel")}
              className={`grid place-items-center size-8 rounded-full transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                saved
                  ? "text-primary bg-primary/10 hover:bg-primary/15"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              }`}
            >
              {saved
                ? <BookmarkCheck className="size-[18px] fill-primary" />
                : <Bookmark className="size-[18px] fill-none" />}
            </motion.button>
            {job.matchScore != null && <MatchScoreBadge score={job.matchScore} size="md" />}
          </div>
        </div>

        {/* Employer row (round 8 redesign): avatar + name + verified + rating chip */}
        {job.employer && (
          <div className="flex items-center gap-2 min-w-0">
            <span
              aria-hidden
              className={`size-7 shrink-0 rounded-full grid place-items-center text-[10px] font-bold ${highlyRatedEmployer ? "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300" : "bg-primary/10 text-primary"}`}
            >
              {employerInitials || <Briefcase className="size-3.5" />}
            </span>
            <span className="text-xs text-muted-foreground truncate font-medium">{job.employer.companyName}</span>
            {job.employer.isVerified && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 shrink-0">
                <ShieldCheck className="size-3.5" aria-hidden />
                <span className="sr-only">{t("feedVerifiedEmployer")}</span>
              </span>
            )}
            {employerRating && (
              <span
                className={`ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums shrink-0 border ${highlyRatedEmployer ? "border-amber-400/50 bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300" : "border-amber-300/30 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"}`}
                aria-label={t("employerRatingAria", { avg: employerRating.avg, count: employerRating.count })}
                title={highlyRatedEmployer ? t("employerRatingHighly") : t("employerRatingAria", { avg: employerRating.avg, count: employerRating.count })}
              >
                <Star className="size-3 fill-amber-400 text-amber-500" aria-hidden />
                {employerRating.avg.toFixed(1)}
                <span className="opacity-70">({employerRating.count})</span>
              </span>
            )}
          </div>
        )}

        {/* Meta row: wage, headcount, shift */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Briefcase className="size-3" />
            <WageDisplay min={job.wageMin} max={job.wageMax} size="sm" />
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground justify-end">
            <Users className="size-3" />
            {job.headcount} {t("jobHeadcount").toLowerCase()}
          </div>
        </div>

        {/* Skills chips */}
        {job.skills.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {job.skills.slice(0, 4).map(s => (
              <Badge key={s.skillId} variant={s.required ? "default" : "secondary"} className="text-[10px]">
                {s.skill?.nameEn ?? "—"}
              </Badge>
            ))}
            {job.skills.length > 4 && (
              <Badge variant="outline" className="text-[10px]">+{job.skills.length - 4}</Badge>
            )}
          </div>
        )}

        {/* Action row */}
        <div className="flex items-center gap-2 border-t border-border pt-3">
          <Button
            type="button"
            onClick={apply}
            disabled={applied || submitting}
            className="flex-1 gap-2 min-h-11"
            variant={applied ? "secondary" : "default"}
            aria-label={applied ? t("jobApplied") : t("jobApply")}
          >
            {submitting ? <Loader2 className="size-4 animate-spin" /> : applied ? <Check className="size-4" /> : <Briefcase className="size-4" />}
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
            <Share2 className="size-4" />
          </Button>
        </div>

        {/* Posted time */}
        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Clock className="size-3" />
          {new Date(job.createdAt).toLocaleDateString()}
        </p>
      </CardContent>
    </Card>
  );
}
