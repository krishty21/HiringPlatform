"use client";
import { useEffect, useState, use } from "react";
import Link from "next/link";
import { AppShell } from "@/components/shared/AppShell";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { TrustTierBadge } from "@/components/shared/TrustTierBadge";
import { WageDisplay } from "@/components/shared/WageDisplay";
import { EndorsementModal } from "@/components/employer/EndorsementModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ArrowLeft, MapPin, Briefcase, Star, Languages, Eye, Zap } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { RatingDialog } from "@/components/ratings/RatingDialog";
import { ApplicationRatingsPanel } from "@/components/ratings/ApplicationRatingsPanel";
import { RatingSummary } from "@/components/ratings/RatingSummary";
import { TopRatedBadge } from "@/components/ratings/TopRatedBadge";
import type { Skill } from "@/lib/schemas";

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

  return (
    <AppShell>
      <div className="flex flex-col gap-4">
        <Link href="/employer/candidates" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground w-fit">
          <ArrowLeft className="size-4" />
          {t("back")}
        </Link>

        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          {/* Skill Passport — left/main */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="h-full"
          >
          <Card className="passport-card h-full">
            <CardContent className="p-6 flex flex-col gap-4">
              <div className="flex items-start gap-4">
                <Avatar className="size-16 border-2 border-primary/30">
                  <AvatarFallback className="text-lg font-bold bg-primary/5 text-primary">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <h2 className="text-xl font-bold tracking-tight">{candidate.fullName}</h2>
                      <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                        <Briefcase className="size-3.5" />
                        {candidate.tradeName ?? "—"} · {candidate.yearsExp} {t("passportYears")}
                      </p>
                    </div>
                    <TrustTierBadge tier={candidate.trustTier} score={candidate.trustScore} size="lg" />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <TopRatedBadge workerProfileId={id} size="md" />
                    {candidate.availableToday && (
                      <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-300 gap-1 text-xs">
                        <Zap className="size-3" />
                        {t("today")}
                      </Badge>
                    )}
                    {candidate.distanceKm != null && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <MapPin className="size-3" />
                        {candidate.distanceKm.toFixed(1)} {t("km")}
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs gap-1">
                      <Eye className="size-3" />
                      {t("viewsCount", { count: candidate.profileViews })}
                    </Badge>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">{t("passportWage")}</p>
                  <WageDisplay min={candidate.wageMin} max={candidate.wageMax} size="md" />
                  <p className="text-xs text-muted-foreground mt-2">{t("preferredShift")}: <span className="font-medium">{t(candidate.shiftPref === "day" ? "shiftDay" : candidate.shiftPref === "night" ? "shiftNight" : "shiftAny")}</span></p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><Languages className="size-3" />{t("languagesLabel")}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {candidate.languages.map(l => (
                      <Badge key={l} variant="secondary" className="text-xs uppercase">{l}</Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">{t("passportCity")}: <span className="font-medium">{candidate.city}</span></p>
                </div>
              </div>

              <Separator />

              {/* Skills */}
              <div>
                <h3 className="font-semibold text-sm mb-2">{t("passportSkills")}</h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {candidate.skills.map(s => (
                    <div key={s.skillId} className="flex items-center justify-between gap-2 rounded-md border border-border bg-card/50 px-3 py-2">
                      <span className="text-sm font-medium">{s.nameEn}</span>
                      <div className="flex items-center gap-1" aria-label={t("proficiencyAria", { level: s.proficiency })}>
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`size-3 ${i < s.proficiency ? "fill-accent text-accent-foreground" : "text-muted-foreground/30"}`}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {candidate.bio && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold text-sm mb-1">{t("aboutLabel")}</h3>
                    <p className="text-sm text-muted-foreground">{candidate.bio}</p>
                  </div>
                </>
              )}

              {/* Endorsements */}
              {candidate.endorsements.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                      <Star className="size-4 text-accent-foreground" />
                      {t("passportEndorsements")}
                      <Badge variant="outline" className="text-xs">{candidate.endorsements.length}</Badge>
                    </h3>
                    <div className="grid gap-2">
                      {candidate.endorsements.map(e => (
                        <div key={e.id} className="rounded-md border border-accent/30 bg-accent/5 p-3">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold">{e.companyName}</span>
                            {e.employerVerified && (
                              <Badge variant="outline" className="text-[10px] bg-emerald-100 text-emerald-800 border-emerald-300">{t("verifiedChip")}</Badge>
                            )}
                          </div>
                          <p className="text-sm mt-1">{e.comment || t("endorsementFallback", { skill: e.skillName })}</p>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {new Date(e.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
          </motion.div>

          {/* Side rail — actions */}
          <aside className="flex flex-col gap-4 lg:sticky lg:top-20 lg:self-start">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("shortlistForJob")}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="jobId">{t("pickJob")}</Label>
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
                  {shortlisting ? t("shortlistSubmitting") : `${t("shortlistCta")} →`}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Star className="size-4 text-accent-foreground" />
                  {t("pipelineEndorse")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button onClick={() => setEndorsementOpen(true)} variant="outline" className="min-h-11 w-full gap-2">
                  <Star className="size-4" />
                  {t("pipelineEndorsePrompt")}
                </Button>
              </CardContent>
            </Card>

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
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  className={`rounded-xl border p-4 ${
                    eligible
                      ? "border-amber-500/30 bg-gradient-to-br from-amber-50/60 via-card to-card dark:from-amber-950/15"
                      : "border-dashed border-border bg-muted/30"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950/40">
                      <Star className="size-4 text-amber-500 fill-amber-400" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold">{t("ratingPromptEmployerTitle")}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {eligible
                          ? t("ratingPromptEmployerBody", { name: candidate?.fullName ?? "" })
                          : t("ratingPromptCooldown", { hours: hoursLeft })}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1 italic">
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
                </motion.div>
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
      </div>
    </AppShell>
  );
}
