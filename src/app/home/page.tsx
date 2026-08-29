"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/shared/AppShell";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { MatchScoreBadge } from "@/components/shared/MatchScoreBadge";
import { WageDisplay } from "@/components/shared/WageDisplay";
import { VerificationBadge } from "@/components/shared/VerificationBadge";
import { JobCard, type WorkerJobCardData } from "@/components/worker/JobCard";
import { NotificationsBell } from "@/components/worker/NotificationsBell";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { useSavedJobs } from "@/hooks/use-saved-jobs";
import { useSession } from "next-auth/react";
import {
  Search,
  Briefcase,
  Eye,
  Gauge,
  RefreshCcw,
  Filter,
  RotateCcw,
  MapPin,
  Bookmark,
  Compass,
  Clock,
  Check,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import type { Skill } from "@/lib/schemas";
import { toast } from "sonner";

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
  const [trustTier, setTrustTier] = useState<"new" | "id_verified" | "skill_verified" | "top_pro" | null>(null);

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
        if (data.trustTier) setTrustTier(data.trustTier);
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
      toast.success(checked ? t("boardAvailableTodayOn") : t("boardAvailableTodayOff"));
    } catch {
      setAvailableToday(!checked);
      toast.error(t("errGeneric"));
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

  const visibleFeed = useMemo(() => {
    if (feed === null) return null;
    if (!savedOnly) return feed;
    return feed.filter(job => savedIds.has(job.id));
  }, [feed, savedOnly, savedIds]);

  if (status === "loading" || profileExists === null) {
    return (
      <AppShell>
        <LoadingSkeleton count={3} />
      </AppShell>
    );
  }

  return (
    <AppShell>
      {/* Page header */}
      <header className="flex items-start justify-between gap-3 flex-wrap mb-6">
        <div className="flex flex-col gap-1">
          <p className="text-meta uppercase tracking-wider text-ink-subtle">
            {t("wdTitle")}
          </p>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-ink text-balance">
            {t("feedTitle")}
          </h1>
        </div>
        <div className="flex items-center gap-1.5">
          <Link
            href="/jobs"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 h-9 text-sm font-medium text-ink hover:bg-surface-sunken transition-colors"
          >
            <Compass className="size-4" aria-hidden />
            {t("boardTitle")}
          </Link>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => { loadFeed(); loadDashboard(); }}
            aria-label={t("refreshFeedAria")}
            title={t("refresh")}
            className="size-9 min-h-9 min-w-9"
          >
            <RefreshCcw className="size-4" aria-hidden />
          </Button>
          <NotificationsBell />
        </div>
      </header>

      {/* Available-today toggle — neutral panel, NOT emerald-warm */}
      <section
        aria-labelledby="availableToday"
        className="mb-4 rounded-md border border-border bg-surface px-4 py-3 flex items-center justify-between gap-3"
      >
        <div className="flex items-start gap-3">
          <span className="size-9 grid place-items-center rounded-md border border-border bg-surface-sunken text-ink-muted shrink-0">
            <Clock className="size-4" aria-hidden />
          </span>
          <div className="flex flex-col gap-0.5 min-w-0">
            <Label htmlFor="availableToday" className="text-sm font-semibold text-ink">
              {t("onboardAvailableToday")}
            </Label>
            <p className="text-meta text-ink-muted leading-relaxed">
              {t("boardAvailableTodayHint")}
            </p>
          </div>
        </div>
        <Switch
          id="availableToday"
          checked={availableToday}
          onCheckedChange={toggleAvailable}
          aria-label={t("onboardAvailableToday")}
        />
      </section>

      {/* Next trust step — r15 new feature: actionable credential progression */}
      {trustTier && trustTier !== "top_pro" && (
        <NextTrustStep trustTier={trustTier} />
      )}

      {/* Compact status strip — replaces stat-card grid */}
      {dashboard && (
        <dl className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-md border border-border bg-surface px-3.5 py-2.5 flex items-center gap-2.5">
            <span className="size-7 grid place-items-center rounded-md border border-border bg-surface-sunken text-ink-muted">
              <Briefcase className="size-3.5" aria-hidden />
            </span>
            <div className="flex flex-col min-w-0">
              <dt className="text-meta uppercase tracking-wide text-ink-subtle">
                {t("wdInReview")}
              </dt>
              <dd className="text-lg font-semibold tabular-nums text-ink leading-tight">
                {dashboard.inReviewCount}
              </dd>
            </div>
          </div>
          <div className="rounded-md border border-border bg-surface px-3.5 py-2.5 flex items-center gap-2.5">
            <span className="size-7 grid place-items-center rounded-md border border-border bg-surface-sunken text-ink-muted">
              <Eye className="size-3.5" aria-hidden />
            </span>
            <div className="flex flex-col min-w-0">
              <dt className="text-meta uppercase tracking-wide text-ink-subtle truncate">
                {t("wdViews")}
              </dt>
              <dd className="text-lg font-semibold tabular-nums text-ink leading-tight">
                {dashboard.profileViews}
              </dd>
            </div>
          </div>
        </dl>
      )}

      {/* Top recommended jobs — semantic, no Sparkles */}
      {dashboard && dashboard.topRecommendedJobs.length > 0 && (
        <section className="mb-6 rounded-md border border-border bg-surface overflow-hidden">
          <div className="px-4 py-3 flex items-center justify-between border-b border-border">
            <h2 className="text-sm font-semibold text-ink flex items-center gap-2">
              <Gauge className="size-4 text-ink-muted" aria-hidden />
              {t("wdTopJobs")}
            </h2>
            <Link
              href="/jobs"
              className="text-meta font-medium text-primary hover:underline inline-flex items-center gap-1"
            >
              {t("boardTitle")} <span aria-hidden>→</span>
            </Link>
          </div>
          <div className="grid sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border">
            {dashboard.topRecommendedJobs.map((job) => {
              const score = job.matchScore ?? 0;
              return (
                <Link
                  key={job.id}
                  href={`/jobs/${job.id}`}
                  className="group relative block p-3.5 hover:bg-surface-sunken transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-ink line-clamp-2 flex-1 text-pretty">
                      {job.title}
                    </p>
                    <MatchScoreBadge score={score} size="sm" />
                  </div>
                  <p className="text-meta text-ink-muted mt-1.5 flex items-center gap-1.5 flex-wrap">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="size-3" aria-hidden />
                      {job.city}
                    </span>
                    {job.employer?.isVerified && (
                      <VerificationBadge status="approved" label={t("feedVerifiedEmployer")} />
                    )}
                  </p>
                  <div className="mt-2">
                    <WageDisplay min={job.wageMin} max={job.wageMax} size="sm" />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Filters — single panel, no tinted sub-panels */}
      <section className="mb-4 rounded-md border border-border bg-surface px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-ink flex items-center gap-2">
            <Filter className="size-4 text-ink-muted" aria-hidden />
            {t("search")}
          </h2>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={reset}
            className="text-meta text-ink-muted hover:text-ink"
          >
            <RotateCcw className="size-3" aria-hidden />
            {t("cancel")}
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="grid gap-1.5">
            <Label className="text-meta text-ink-subtle uppercase tracking-wide">
              {t("feedFilterTrade")}
            </Label>
            <Select
              value={filters.tradeId || "any"}
              onValueChange={(v) => setFilters(f => ({ ...f, tradeId: v === "any" ? "" : v }))}
            >
              <SelectTrigger className="min-h-11 w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">{t("anyTrade")}</SelectItem>
                {tradeSkills.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.nameEn}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label className="text-meta text-ink-subtle uppercase tracking-wide">
              {t("feedFilterDistance")}{" "}
              <span className="tabular-nums text-ink font-medium">{filters.distanceKm} {t("km")}</span>
            </Label>
            <Slider
              value={[filters.distanceKm]}
              min={1} max={200} step={5}
              onValueChange={(v) => setFilters(f => ({ ...f, distanceKm: v[0] ?? 30 }))}
              className="mt-3"
              aria-label={t("feedFilterDistance")}
            />
          </div>

          <div className="grid gap-1.5">
            <Label className="text-meta text-ink-subtle uppercase tracking-wide">
              {t("feedFilterWage")} (₹/day)
            </Label>
            <div className="flex items-center gap-2">
              <Input
                type="number" min={0} step={50} placeholder="min"
                value={filters.wageMin}
                onChange={e => setFilters(f => ({ ...f, wageMin: e.target.value }))}
                className="min-h-11"
                aria-label={t("feedFilterWage") + " min"}
              />
              <span className="text-ink-subtle">–</span>
              <Input
                type="number" min={0} step={50} placeholder="max"
                value={filters.wageMax}
                onChange={e => setFilters(f => ({ ...f, wageMax: e.target.value }))}
                className="min-h-11"
                aria-label={t("feedFilterWage") + " max"}
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label className="text-meta text-ink-subtle uppercase tracking-wide">
              {t("feedFilterShift")}
            </Label>
            <Select
              value={filters.shift}
              onValueChange={(v) => setFilters(f => ({ ...f, shift: v as typeof filters.shift }))}
            >
              <SelectTrigger className="min-h-11 w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">{t("shiftAny")}</SelectItem>
                <SelectItem value="day">{t("shiftDay")}</SelectItem>
                <SelectItem value="night">{t("shiftNight")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Urgent + saved filters — plain rows with hairline separators */}
        <div className="mt-3 pt-3 border-t border-border flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="urgentOnly" className="text-sm font-medium text-ink flex items-center gap-2">
              <Clock className="size-4 text-ink-muted" aria-hidden />
              {t("feedUrgent")}
            </Label>
            <Switch
              id="urgentOnly"
              checked={filters.urgentOnly}
              onCheckedChange={(v) => setFilters(f => ({ ...f, urgentOnly: v }))}
              aria-label={t("feedUrgent")}
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="savedOnly" className="text-sm font-medium text-ink flex items-center gap-2">
              <Bookmark className="size-4 text-ink-muted" aria-hidden />
              {t("savedOnlyAria")}
              {savedCount > 0 && (
                <span
                  className="text-meta tabular-nums text-ink-subtle"
                  aria-label={`${savedCount} saved jobs`}
                >
                  ({savedCount})
                </span>
              )}
            </Label>
            <Switch
              id="savedOnly"
              checked={savedOnly}
              onCheckedChange={setSavedOnly}
              aria-label={t("savedOnlyAria")}
            />
          </div>
        </div>
      </section>

      {/* Feed */}
      {feed === null && <LoadingSkeleton count={4} />}

      {feed && feed.length === 0 && (
        <EmptyState
          icon={Search}
          title={t("feedEmpty")}
          description={t("feedEmptyDesc")}
        />
      )}

      {feed && feed.length > 0 && visibleFeed && visibleFeed.length === 0 && (
        <EmptyState
          icon={Search}
          title={t("noSavedTitle")}
          description={t("noSavedDesc")}
        />
      )}

      {visibleFeed && visibleFeed.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visibleFeed.map(job => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}

      {visibleFeed && visibleFeed.length > 0 && (
        <p className="text-meta text-ink-subtle text-center mt-4">
          Showing {visibleFeed.length}{savedOnly && feed ? ` of ${feed.length}` : ""} jobs
        </p>
      )}
    </AppShell>
  );
}

/* r15: Next trust step — actionable credential progression panel.
 * Surfaces the single most important action a worker can take to advance
 * their trust tier. Hides once they reach Top Pro.
 * Maps the trust ladder (New → ID Verified → Skill Verified → Top Pro)
 * to the next required action.
 */
function NextTrustStep({
  trustTier,
}: {
  trustTier: "new" | "id_verified" | "skill_verified" | "top_pro";
}) {
  const { t } = useLanguage();

  // Map current tier → next step copy + CTA target
  const step = (() => {
    switch (trustTier) {
      case "new":
        return {
          tier: t("passportTierIdVerified"),
          title: t("trustStepNewTitle"),
          body: t("trustStepNewBody"),
          cta: t("trustStepNewCta"),
          href: "/verify",
        };
      case "id_verified":
        return {
          tier: t("passportTierSkillVerified"),
          title: t("trustStepIdTitle"),
          body: t("trustStepIdBody"),
          cta: t("trustStepIdCta"),
          href: "/verify",
        };
      case "skill_verified":
        return {
          tier: t("passportTierTopPro"),
          title: t("trustStepSkillTitle"),
          body: t("trustStepSkillBody"),
          cta: t("trustStepSkillCta"),
          href: "/profile",
        };
      default:
        return null;
    }
  })();

  if (!step) return null;

  return (
    <section
      aria-labelledby="next-trust-step"
      className="accent-spine mb-4 rounded-md border border-border bg-surface pl-5 pr-4 py-3 flex items-start justify-between gap-3 flex-wrap"
    >
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <span className="size-9 grid place-items-center rounded-md border border-border bg-surface-sunken text-accent shrink-0">
          <ShieldCheck className="size-4" aria-hidden />
        </span>
        <div className="flex flex-col gap-0.5 min-w-0">
          <p className="eyebrow text-ink-subtle">
            {t("trustStepEyebrow")}
            <span className="text-ink-muted normal-case tracking-normal font-normal mx-1.5">·</span>
            <span className="text-accent normal-case tracking-normal">{step.tier}</span>
          </p>
          <p id="next-trust-step" className="text-sm font-semibold text-ink">
            {step.title}
          </p>
          <p className="text-meta text-ink-muted leading-relaxed">
            {step.body}
          </p>
        </div>
      </div>
      <Link
        href={step.href}
        className="inline-flex items-center gap-1.5 min-h-11 px-4 rounded-md bg-accent text-accent-foreground text-sm font-medium hover:opacity-90 transition-opacity shrink-0"
      >
        {step.cta}
        <ChevronRight className="size-4" aria-hidden />
      </Link>
    </section>
  );
}
