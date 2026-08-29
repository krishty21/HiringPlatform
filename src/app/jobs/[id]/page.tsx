"use client";
import { useEffect, useState, use } from "react";
import Link from "next/link";
import { AppShell } from "@/components/shared/AppShell";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { WageDisplay } from "@/components/shared/WageDisplay";
import { MatchScoreBadge } from "@/components/shared/MatchScoreBadge";
import { VerificationBadge } from "@/components/shared/VerificationBadge";
import { RatingStars } from "@/components/ratings/RatingStars";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { toast } from "sonner";
import {
  ArrowLeft, MapPin, Briefcase, Users, Share2, Loader2, Check, Zap, Clock, Sparkles, Star,
} from "lucide-react";
import { motion } from "framer-motion";

interface JobDetail {
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

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t, lang } = useLanguage();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [existingApp, setExistingApp] = useState<ApplicationExisting | null>(null);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    // We use the feed endpoint to get the same enriched payload (no separate /api/jobs/:id GET).
    // Fall back to first page if jobId isn't in the default feed.
    fetch(`/api/jobs?pageSize=100`, { cache: "no-store" })
      .then(r => r.json())
      .then((data: { items: JobDetail[] }) => {
        const found = data.items?.find(j => j.id === id) ?? null;
        setJob(found);
      })
      .catch(() => setJob(null));
  }, [id]);

  async function apply() {
    setApplying(true);
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jobId: id }),
      });
      if (!res.ok) throw new Error("apply-failed");
      const data = (await res.json()) as ApplicationExisting;
      setExistingApp(data);
      setApplied(true);
      toast.success(t("jobApplied"));
    } catch {
      toast.error(t("errGeneric"));
    } finally {
      setApplying(false);
    }
  }

  function shareWhatsApp() {
    if (!job) return;
    const tradeName = job.trade
      ? (lang === "hi" ? job.trade.nameHi : lang === "te" ? job.trade.nameTe : job.trade.nameEn)
      : job.title;
    const text = `🛠️ ${job.title}\n${tradeName} · ${job.city}\n₹${job.wageMin}-${job.wageMax}${t("perDay")} · ${job.shift} ${t("jobShift")}\n${t("feedVerifiedEmployer")}: ${job.employer?.companyName ?? ""}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
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
  // Round 8: employer reputation
  const employerRating = job.employer?.ratingCount && job.employer.ratingCount > 0
    ? { avg: job.employer.ratingAvg ?? 0, count: job.employer.ratingCount }
    : null;
  const highlyRatedEmployer = !!employerRating && employerRating.avg >= 4.5 && employerRating.count >= 3;
  const employerInitials = job.employer?.companyName
    ?.split(" ").filter(Boolean).map(p => p[0]).slice(0, 2).join("").toUpperCase() ?? "";

  return (
    <AppShell>
      <div className="flex flex-col gap-4">
        <Link href="/home" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground w-fit">
          <ArrowLeft className="size-4" />
          {t("back")}
        </Link>

        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="h-full"
          >
          <Card className={`relative overflow-hidden h-full ${job.isUrgent ? "border-accent/60" : ""}`}>
            {job.isUrgent && (
              <div aria-hidden className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-accent via-accent/70 to-transparent" />
            )}
            <CardContent className="p-6 flex flex-col gap-4">
              {/* Header */}
              <div>
                {job.isUrgent && (
                  <div className="self-start inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-accent-foreground mb-2">
                    <Zap className="size-3" />
                    {t("feedUrgent")}
                  </div>
                )}
                <h1 className="text-2xl font-bold tracking-tight">{job.title}</h1>
                <p className="text-sm text-muted-foreground mt-2 flex items-center gap-1.5 flex-wrap">
                  {tradeName && <span>{tradeName}</span>}
                  {tradeName && <span aria-hidden>·</span>}
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-3.5" />
                    {job.city}
                    {job.distanceKm != null && <span className="text-muted-foreground"> · {job.distanceKm.toFixed(1)} {t("km")}</span>}
                  </span>
                  <span aria-hidden>·</span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="size-3.5" />
                    {new Date(job.createdAt).toLocaleDateString()}
                  </span>
                </p>
              </div>

              {/* Match score */}
              {job.matchScore != null && (
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <MatchScoreBadge score={job.matchScore} size="lg" />
                    <span className="text-xs text-muted-foreground">{t("feedWhy", { score: job.matchScore })}</span>
                  </div>
                  <div className="h-1.5 w-full max-w-xs rounded-full bg-muted overflow-hidden" aria-hidden>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${job.matchScore}%` }}
                      transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                      className={`h-full rounded-full ${job.matchScore >= 70 ? "bg-emerald-500" : job.matchScore >= 50 ? "bg-accent" : "bg-muted-foreground/50"}`}
                    />
                  </div>
                </div>
              )}

              <Separator />

              {/* Meta grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">{t("jobWage")}</p>
                  <WageDisplay min={job.wageMin} max={job.wageMax} size="md" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Users className="size-3" />{t("jobHeadcount")}
                  </p>
                  <p className="text-lg font-bold tabular-nums mt-1">{job.headcount}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("jobShift")}</p>
                  <Badge variant="outline" className="mt-1 uppercase">{job.shift}</Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("jobLocation")}</p>
                  <p className="text-sm font-semibold mt-1">{job.city}</p>
                </div>
              </div>

              <Separator />

              {/* Description */}
              {job.description && (
                <div>
                  <h2 className="font-semibold text-sm mb-1">{t("jobDescription")}</h2>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">{job.description}</p>
                </div>
              )}

              {/* Skills */}
              {job.skills.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h2 className="font-semibold text-sm mb-2 flex items-center gap-2">
                      <Briefcase className="size-4" />
                      {t("jobSkills")}
                    </h2>
                    <div className="flex flex-wrap gap-1.5">
                      {job.skills.map(s => (
                        <Badge
                          key={s.skillId}
                          variant={s.required ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {s.skill ? (lang === "hi" ? s.skill.nameHi : lang === "te" ? s.skill.nameTe : s.skill.nameEn) : "—"}
                          {s.required && <span className="ml-1 text-[10px] opacity-70">required</span>}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Posted by */}
              {job.employer && (
                <>
                  <Separator />
                  <div>
                    <h2 className="font-semibold text-sm mb-2">{t("jobPostedBy")}</h2>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span
                        aria-hidden
                        className={`size-10 shrink-0 rounded-full grid place-items-center text-xs font-bold ${highlyRatedEmployer ? "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300" : "bg-primary/10 text-primary"}`}
                      >
                        {employerInitials || <Briefcase className="size-4" />}
                      </span>
                      <div className="flex flex-col gap-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold">{job.employer.companyName}</p>
                          {job.employer.isVerified && (
                            <VerificationBadge status="approved" label={t("feedVerifiedEmployer")} />
                          )}
                          <Badge variant="outline" className="text-xs gap-1">
                            <MapPin className="size-3" />
                            {job.employer.city}
                          </Badge>
                        </div>
                        {employerRating && (
                          <div
                            className="flex items-center gap-1.5 text-xs"
                            aria-label={t("employerRatingAria", { avg: employerRating.avg, count: employerRating.count })}
                          >
                            <RatingStars value={employerRating.avg} size="sm" readOnly />
                            <span className="font-semibold text-amber-700 dark:text-amber-400 tabular-nums">{employerRating.avg.toFixed(1)}</span>
                            <span className="text-muted-foreground">· {t("ratingSummaryCount", { count: employerRating.count, s: employerRating.count === 1 ? "" : "s" })}</span>
                            {highlyRatedEmployer && (
                              <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/50 bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                                <Star className="size-3 fill-amber-400 text-amber-500" aria-hidden />
                                {t("employerRatingHighly")}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
          </motion.div>

          {/* Apply rail — sticky on desktop */}
          <aside className="flex flex-col gap-4 lg:sticky lg:top-20 lg:self-start">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
            >
            <Card className="border-primary/30 shadow-sm">
              <CardContent className="p-4 flex flex-col gap-3">
                <p className="text-sm font-semibold flex items-center gap-2">
                  <Sparkles className="size-4 text-accent-foreground" />
                  {isApplied ? t("jobApplied") : t("jobApply")}
                </p>
                {!isApplied && (
                  <p className="text-xs text-muted-foreground">{t("jobApplyConfirm")}</p>
                )}
                <Button
                  type="button"
                  onClick={apply}
                  disabled={isApplied || applying}
                  className="min-h-12 gap-2"
                  variant={isApplied ? "secondary" : "default"}
                  size="lg"
                >
                  {applying ? <Loader2 className="size-4 animate-spin" /> : isApplied ? <Check className="size-5" /> : <Briefcase className="size-5" />}
                  {isApplied ? t("applied") : t("jobApply")}
                </Button>
                <Button
                  type="button"
                  onClick={shareWhatsApp}
                  variant="outline"
                  className="min-h-11 gap-2"
                >
                  <Share2 className="size-4" />
                  {t("feedShare")}
                </Button>
                {existingApp && (
                  <Button asChild variant="ghost" size="sm" className="mt-1 gap-1 min-h-11">
                    <Link href={`/applications/${existingApp.id}`}>{t("trackerTitle")}</Link>
                  </Button>
                )}
              </CardContent>
            </Card>
            </motion.div>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
