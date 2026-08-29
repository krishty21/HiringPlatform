"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/shared/AppShell";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { StatCard } from "@/components/shared/StatCard";
import { MatchScoreBadge } from "@/components/shared/MatchScoreBadge";
import { WageDisplay } from "@/components/shared/WageDisplay";
import { VerificationBadge } from "@/components/shared/VerificationBadge";
import { JobCard, type WorkerJobCardData } from "@/components/worker/JobCard";
import { NotificationsBell } from "@/components/worker/NotificationsBell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { useSavedJobs } from "@/hooks/use-saved-jobs";
import { useSession } from "next-auth/react";
import { Search, Briefcase, Eye, Sparkles, Zap, RefreshCcw, Filter, RotateCcw, MapPin, Bookmark, Compass } from "lucide-react";
import type { Skill } from "@/lib/schemas";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface DashboardData {
  inReviewCount: number;
  profileViews: number;
  topRecommendedJobs: (WorkerJobCardData & { topReason?: string })[];
}

interface FeedResponse {
  items: WorkerJobCardData[];
  total: number;
  page: number;
  pageSize: number;
  hasNext: boolean;
}

const TRADE_NAMES = new Set(["Electrician", "Plumber", "Welder", "CNC Operator", "Fitter", "Delivery Executive", "Carpenter", "Mason"]);

export default function WorkerHomePage() {
  const { t } = useLanguage();
  const router = useRouter();
  const { data: session, status } = useSession();
  const { savedIds, savedCount } = useSavedJobs();
  const [savedOnly, setSavedOnly] = useState(false);

  const [skills, setSkills] = useState<Skill[]>([]);
  const [feed, setFeed] = useState<WorkerJobCardData[] | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [profileExists, setProfileExists] = useState<boolean | null>(null);
  const [availableToday, setAvailableToday] = useState(false);

  const [filters, setFilters] = useState({
    tradeId: "",
    distanceKm: 30,
    wageMin: "",
    wageMax: "",
    shift: "any" as "day" | "night" | "any",
    urgentOnly: false,
  });

  // Fetch skills once
  useEffect(() => {
    fetch("/api/skills")
      .then(r => r.json())
      .then((d: { items: Skill[] }) => setSkills(d.items ?? []))
      .catch(() => setSkills([]));
  }, []);

  // Fetch worker profile (to determine if onboarding is needed + initial availableToday)
  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/worker/profile", { cache: "no-store" })
      .then(r => {
        if (r.status === 403 || r.status === 404) {
          setProfileExists(false);
          return null;
        }
        if (!r.ok) return null;
        return r.json();
      })
      .then(data => {
        if (data === null) return;
        setProfileExists(true);
        setAvailableToday(!!data.availableToday);
        // Use worker's maxRadiusKm as the default distance filter
        if (typeof data.maxRadiusKm === "number") {
          setFilters(prev => ({ ...prev, distanceKm: data.maxRadiusKm }));
        }
      })
      .catch(() => setProfileExists(false));
  }, [status]);

  // Redirect to onboarding if no profile
  useEffect(() => {
    if (profileExists === false && status === "authenticated") {
      const role = (session?.user as any)?.role;
      if (role === "worker") router.replace("/onboarding/worker");
    }
  }, [profileExists, status, session, router]);

  // Fetch dashboard
  const loadDashboard = useCallback(async () => {
    try {
      const res = await fetch("/api/worker/dashboard", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as DashboardData;
      setDashboard(data);
    } catch {}
  }, []);

  useEffect(() => {
    if (!profileExists) return;
    // Defer to avoid setState-in-effect anti-pattern.
    const id = setTimeout(loadDashboard, 0);
    return () => clearTimeout(id);
  }, [profileExists, loadDashboard]);

  // Build feed query
  const buildQuery = useCallback((f: typeof filters) => {
    const p = new URLSearchParams();
    if (f.tradeId) p.set("tradeId", f.tradeId);
    p.set("distanceKm", String(f.distanceKm));
    if (f.wageMin) p.set("wageMin", f.wageMin);
    if (f.wageMax) p.set("wageMax", f.wageMax);
    if (f.shift !== "any") p.set("shift", f.shift);
    if (f.urgentOnly) p.set("urgentOnly", "true");
    return p.toString();
  }, []);

  // Fetch feed (debounced)
  const loadFeed = useCallback(async () => {
    setFeed(null);
    const start = Date.now();
    try {
      const qs = buildQuery(filters);
      const res = await fetch(`/api/jobs?${qs}`, { cache: "no-store" });
      if (!res.ok) {
        setFeed([]);
        return;
      }
      const data = (await res.json()) as FeedResponse;
      setFeed(data.items ?? []);
      const elapsed = Date.now() - start;
      if (elapsed > 1500) {
        toast.warning("Feed slower than 1.5s target");
      }
    } catch {
      setFeed([]);
    }
  }, [filters, buildQuery]);

  useEffect(() => {
    if (!profileExists) return;
    const id = setTimeout(() => { loadFeed(); }, 250);
    return () => clearTimeout(id);
  }, [loadFeed, profileExists]);

  async function toggleAvailable(checked: boolean) {
    setAvailableToday(checked);
    try {
      await fetch("/api/worker/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ availableToday: checked }),
      });
      toast.success(checked ? "You're visible as available today" : "Available-today off");
    } catch {
      setAvailableToday(!checked);
      toast.error("Could not update. Try again.");
    }
  }

  function reset() {
    setFilters({
      tradeId: "",
      distanceKm: 20,
      wageMin: "",
      wageMax: "",
      shift: "any",
      urgentOnly: false,
    });
  }

  const tradeSkills = useMemo(() => skills.filter(s => TRADE_NAMES.has(s.nameEn)), [skills]);

  // Saved filter composes on top of the server-side filters (trade/distance/wage/shift/urgent).
  const visibleFeed = useMemo(() => {
    if (feed === null) return null;
    if (!savedOnly) return feed;
    return feed.filter(job => savedIds.has(job.id));
  }, [feed, savedOnly, savedIds]);

  // Wait for auth/profile to resolve before rendering content
  if (status === "loading" || profileExists === null) {
    return (
      <AppShell>
        <LoadingSkeleton count={3} />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <header className="mb-4 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("feedTitle")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("wdTitle")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/jobs"
            className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 h-9 text-xs font-medium text-primary hover:bg-primary/10 hover:border-primary/50 transition-colors"
          >
            <Compass className="size-3.5" />
            {t("boardTitle")}
          </Link>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => { loadFeed(); loadDashboard(); }}
            aria-label="Refresh feed"
            title="Refresh"
            className="size-9 min-h-9 min-w-9 active:animate-spin transition-transform"
          >
            <RefreshCcw className="size-4" />
          </Button>
          <NotificationsBell />
        </div>
      </header>

      {/* Available-today toggle (WRK-08) */}
      <Card className="mb-4 border-emerald-300/40 bg-emerald-50">
        <CardContent className="p-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="size-9 rounded-full bg-emerald-100 text-emerald-800 grid place-items-center">
              <Zap className="size-5" />
            </span>
            <div>
              <Label htmlFor="availableToday" className="text-sm font-semibold">{t("onboardAvailableToday")}</Label>
              <p className="text-xs text-muted-foreground">Surface to employers searching now.</p>
            </div>
          </div>
          <Switch
            id="availableToday"
            checked={availableToday}
            onCheckedChange={toggleAvailable}
          />
        </CardContent>
      </Card>

      {/* Worker dashboard DSH-02 */}
      {dashboard && (
        <div className="grid gap-3 sm:grid-cols-3 mb-4">
          <StatCard
            label={t("wdInReview")}
            value={dashboard.inReviewCount}
            icon={Briefcase}
            tone="primary"
          />
          <StatCard
            label={t("wdViews")}
            value={dashboard.profileViews}
            hint={t("passportViewsThisWeek")}
            icon={Eye}
            tone="accent"
          />
        </div>
      )}

      {/* Top recommended jobs */}
      {dashboard && dashboard.topRecommendedJobs.length > 0 && (
        <Card className="mb-4 relative overflow-hidden">
          {/* Subtle accent hairline */}
          <div aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-primary/15 via-accent/40 to-primary/15" />
          <CardContent className="p-4">
            <p className="text-sm font-semibold flex items-center gap-2 mb-3">
              <Sparkles className="size-4 text-accent-foreground" />
              {t("wdTopJobs")}
              <Link href="/jobs" className="ml-auto text-xs font-medium text-primary hover:underline inline-flex items-center gap-1">
                {t("boardTitle")} →
              </Link>
            </p>
            <div className="grid gap-2 sm:grid-cols-3">
              {dashboard.topRecommendedJobs.map((job, idx) => {
                const score = job.matchScore ?? 0;
                const isHighMatch = score >= 70;
                return (
                  <motion.div
                    key={job.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: idx * 0.05, ease: "easeOut" }}
                  >
                    <Link
                      href={`/jobs/${job.id}`}
                      className="group relative block rounded-lg border border-border p-3 hover:border-primary/40 hover:shadow-sm transition-all overflow-hidden"
                    >
                      {/* Top hairline — emerald for high matches, navy otherwise */}
                      <div
                        aria-hidden
                        className={`absolute inset-x-0 top-0 h-0.5 ${isHighMatch ? "bg-gradient-to-r from-primary to-emerald-500" : "bg-gradient-to-r from-primary/20 to-primary/5"}`}
                      />
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold line-clamp-2 flex-1 group-hover:text-primary transition-colors">{job.title}</p>
                        <MatchScoreBadge score={score} size="sm" />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <MapPin className="size-3" />{job.city}
                        {job.employer?.isVerified && (
                          <span className="ml-1"><VerificationBadge status="approved" label={t("feedVerifiedEmployer")} /></span>
                        )}
                      </p>
                      <div className="mt-2">
                        <WageDisplay min={job.wageMin} max={job.wageMax} size="sm" />
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters (WRK-05) */}
      <Card className="mb-4">
        <CardContent className="p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold flex items-center gap-2">
              <Filter className="size-4" />
              {t("search")}
            </p>
            <Button type="button" variant="ghost" size="sm" onClick={reset} className="text-xs gap-1">
              <RotateCcw className="size-3" />
              {t("cancel")}
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="grid gap-2">
              <Label className="text-xs">{t("feedFilterTrade")}</Label>
              <Select
                value={filters.tradeId || "any"}
                onValueChange={(v) => setFilters(f => ({ ...f, tradeId: v === "any" ? "" : v }))}
              >
                <SelectTrigger className="min-h-11 w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any trade</SelectItem>
                  {tradeSkills.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.nameEn}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label className="text-xs">
                {t("feedFilterDistance")}: <span className="font-semibold">{filters.distanceKm} {t("km")}</span>
              </Label>
              <Slider
                value={[filters.distanceKm]}
                min={1} max={200} step={5}
                onValueChange={(v) => setFilters(f => ({ ...f, distanceKm: v[0] ?? 30 }))}
                className="mt-3"
              />
            </div>

            <div className="grid gap-2">
              <Label className="text-xs">{t("feedFilterWage")} (₹/day)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number" min={0} step={50} placeholder="min"
                  value={filters.wageMin}
                  onChange={e => setFilters(f => ({ ...f, wageMin: e.target.value }))}
                  className="min-h-11"
                />
                <span className="text-muted-foreground">–</span>
                <Input
                  type="number" min={0} step={50} placeholder="max"
                  value={filters.wageMax}
                  onChange={e => setFilters(f => ({ ...f, wageMax: e.target.value }))}
                  className="min-h-11"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label className="text-xs">{t("feedFilterShift")}</Label>
              <Select
                value={filters.shift}
                onValueChange={(v) => setFilters(f => ({ ...f, shift: v as typeof filters.shift }))}
              >
                <SelectTrigger className="min-h-11 w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="day">Day</SelectItem>
                  <SelectItem value="night">Night</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-lg border border-accent/40 bg-accent/5 px-3 py-2.5">
            <Label htmlFor="urgentOnly" className="text-sm font-medium flex items-center gap-2">
              <Zap className="size-4 text-accent-foreground" />
              {t("feedUrgent")}
            </Label>
            <Switch
              id="urgentOnly"
              checked={filters.urgentOnly}
              onCheckedChange={(v) => setFilters(f => ({ ...f, urgentOnly: v }))}
            />
          </div>

          {/* Saved jobs filter (client-side, localStorage) */}
          <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/40 bg-primary/5 px-3 py-2.5">
            <Label htmlFor="savedOnly" className="text-sm font-medium flex items-center gap-2">
              <Bookmark className="size-4 text-primary" />
              Saved
              {savedCount > 0 && (
                <Badge variant="secondary" className="text-[10px] tabular-nums" aria-label={`${savedCount} saved jobs`}>
                  {savedCount}
                </Badge>
              )}
            </Label>
            <Switch
              id="savedOnly"
              checked={savedOnly}
              onCheckedChange={setSavedOnly}
              aria-label="Show saved jobs only"
            />
          </div>
        </CardContent>
      </Card>

      {/* Feed */}
      {feed === null && <LoadingSkeleton count={4} />}

      {feed && feed.length === 0 && (
        <EmptyState
          icon={Search}
          title={t("feedEmpty")}
          description="Try widening the distance or removing filters."
        />
      )}

      {feed && feed.length > 0 && visibleFeed && visibleFeed.length === 0 && (
        <EmptyState
          icon={Search}
          title="No saved jobs yet"
          description="Bookmark jobs from the feed to find them here."
        />
      )}

      {visibleFeed && visibleFeed.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visibleFeed.map(job => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}

      {/* Footer pagination hint */}
      {visibleFeed && visibleFeed.length > 0 && (
        <p className="text-xs text-muted-foreground text-center mt-4">
          Showing {visibleFeed.length}{savedOnly && feed ? ` of ${feed.length}` : ""} jobs · <Badge variant="outline" className="text-[10px]">{filters.shift} shift</Badge>
        </p>
      )}
    </AppShell>
  );
}
