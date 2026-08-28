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
  }, [id]);

  async function shortlist() {
    if (!shortlistJobId) {
      toast.error("Pick a job to shortlist for.");
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
      toast.success("Shortlisted ✓ Worker notified.");
    } catch {
      toast.error("Could not shortlist. Try again.");
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
                      {candidate.profileViews} views
                    </Badge>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">{t("passportWage")}</p>
                  <WageDisplay min={candidate.wageMin} max={candidate.wageMax} size="md" />
                  <p className="text-xs text-muted-foreground mt-2">Preferred shift: <span className="font-medium">{candidate.shiftPref}</span></p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><Languages className="size-3" />Languages</p>
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
                      <div className="flex items-center gap-1" aria-label={`Proficiency ${s.proficiency} of 5`}>
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
                    <h3 className="font-semibold text-sm mb-1">About</h3>
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
                              <Badge variant="outline" className="text-[10px] bg-emerald-100 text-emerald-800 border-emerald-300">Verified</Badge>
                            )}
                          </div>
                          <p className="text-sm mt-1">{e.comment || `"Skilled in ${e.skillName}."`}</p>
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
                <CardTitle className="text-base">Shortlist for a job</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="jobId">Pick a job</Label>
                  <Select value={shortlistJobId} onValueChange={setShortlistJobId}>
                    <SelectTrigger id="jobId" className="min-h-11 w-full">
                      <SelectValue placeholder="Choose job" />
                    </SelectTrigger>
                    <SelectContent>
                      {jobs.map(j => (
                        <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={shortlist} disabled={shortlisting} className="min-h-11 gap-2">
                  {shortlisting ? "Shortlisting…" : `Shortlist → ${t("trackerStageShortlisted")}`}
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
