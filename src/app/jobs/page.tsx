"use client";
import { useEffect, useState, useCallback, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/shared/AppShell";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { JobCard, type WorkerJobCardData } from "@/components/worker/JobCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { useSavedJobs } from "@/hooks/use-saved-jobs";
import { useSession } from "next-auth/react";
import {
  Search, X, Zap, Bookmark, ArrowDownWideNarrow, MapPin, Briefcase,
  ChevronDown, Loader2, Compass, Clock, Gauge,
} from "lucide-react";
import type { Skill } from "@/lib/schemas";
import { toast } from "sonner";

const TRADE_NAMES = new Set(["Electrician", "Plumber", "Welder", "CNC Operator", "Fitter", "Delivery Executive", "Carpenter", "Mason"]);

interface FeedResponse {
  items: WorkerJobCardData[];
  total: number;
  page: number;
  pageSize: number;
  hasNext: boolean;
}

type SortKey = "match" | "wage" | "newest" | "nearest";

const PAGE_SIZE = 9;

function JobBoard() {
  const { t } = useLanguage();
  const router = useRouter();
  const search = useSearchParams();
  const { data: session, status } = useSession();
  const { savedIds, savedCount } = useSavedJobs();

  // URL-synced state
  const [query, setQuery] = useState(search.get("q") ?? "");
  const [tradeId, setTradeId] = useState(search.get("trade") ?? "");
  const [city, setCity] = useState(search.get("city") ?? "");
  const [shift, setShift] = useState<"day" | "night" | "any">((search.get("shift") as any) ?? "any");
  const [sort, setSort] = useState<SortKey>((search.get("sort") as SortKey) ?? "match");
  const [urgentOnly, setUrgentOnly] = useState(search.get("urgent") === "1");
  const [savedOnly, setSavedOnly] = useState(search.get("saved") === "1");
  const [topEmployersOnly, setTopEmployersOnly] = useState(search.get("top") === "1");

  const [skills, setSkills] = useState<Skill[]>([]);
  const [jobs, setJobs] = useState<WorkerJobCardData[] | null>(null);
  const [hasNext, setHasNext] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [profileExists, setProfileExists] = useState<boolean | null>(null);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());

  const [availableToday, setAvailableToday] = useState<boolean | null>(null);
  const [availableSaving, setAvailableSaving] = useState(false);

  useEffect(() => {
    fetch("/api/skills")
      .then(r => r.json())
      .then((d: { items: Skill[] }) => setSkills(d.items ?? []))
      .catch(() => setSkills([]));
  }, []);

  useEffect(() => {
    if (status !== "authenticated") return;
    const role = (session?.user as { role?: string } | undefined)?.role;
    if (role && role !== "worker") { setProfileExists(true); return; }
    fetch("/api/worker/profile", { cache: "no-store" })
      .then(r => {
        if (r.status === 403 || r.status === 404) { setProfileExists(false); return null; }
        if (!r.ok) return null;
        return r.json();
      })
      .then(data => {
        if (data === null) return;
        setProfileExists(true);
        if (typeof data.availableToday === "boolean") {
          setAvailableToday(data.availableToday);
        }
      })
      .catch(() => setProfileExists(false));
  }, [status, session]);

  async function toggleAvailableToday(checked: boolean) {
    if (availableToday === null) return;
    setAvailableToday(checked);
    setAvailableSaving(true);
    try {
      const res = await fetch("/api/worker/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ availableToday: checked }),
      });
      if (!res.ok) throw new Error("patch-failed");
      toast.success(checked ? t("boardAvailableTodayOn") : t("boardAvailableTodayOff"));
    } catch {
      setAvailableToday(!checked);
      toast.error(t("errGeneric"));
    } finally {
      setAvailableSaving(false);
    }
  }

  useEffect(() => {
    if (profileExists === false && status === "authenticated") {
      const role = (session?.user as any)?.role;
      if (role === "worker") router.replace("/onboarding/worker");
    }
  }, [profileExists, status, session, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/applications/mine", { cache: "no-store" })
      .then(r => (r.ok ? r.json() : { items: [] }))
      .then((d: { items: { jobId: string; status: string }[] }) => {
        setAppliedIds(new Set(
          (d.items ?? []).filter(a => a.status !== "withdrawn").map(a => a.jobId),
        ));
      })
      .catch(() => {});
  }, [status]);

  const serverQuery = useMemo(() => {
    const p = new URLSearchParams();
    p.set("pageSize", String(PAGE_SIZE));
    p.set("distanceKm", "200");
    if (tradeId) p.set("tradeId", tradeId);
    if (shift !== "any") p.set("shift", shift);
    if (urgentOnly) p.set("urgentOnly", "true");
    return p.toString();
  }, [tradeId, shift, urgentOnly]);

  const loadFirstPage = useCallback(async () => {
    setJobs(null);
    try {
      const res = await fetch(`/api/jobs?${serverQuery}&page=1`, { cache: "no-store" });
      if (!res.ok) { setJobs([]); setHasNext(false); return; }
      const data = (await res.json()) as FeedResponse;
      setJobs(data.items ?? []);
      setHasNext(!!data.hasNext);
    } catch {
      setJobs([]);
      setHasNext(false);
    }
  }, [serverQuery]);

  useEffect(() => {
    if (!profileExists) return;
    const id = setTimeout(loadFirstPage, 250);
    return () => clearTimeout(id);
  }, [loadFirstPage, profileExists]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !jobs) return;
    setLoadingMore(true);
    try {
      const nextPage = Math.floor(jobs.length / PAGE_SIZE) + 1;
      const res = await fetch(`/api/jobs?${serverQuery}&page=${nextPage}`, { cache: "no-store" });
      if (!res.ok) { toast.error(t("errGeneric")); return; }
      const data = (await res.json()) as FeedResponse;
      setJobs(prev => {
        const seen = new Set((prev ?? []).map(j => j.id));
        const fresh = (data.items ?? []).filter(j => !seen.has(j.id));
        return [...(prev ?? []), ...fresh];
      });
      setHasNext(!!data.hasNext);
    } catch {
      toast.error(t("errGeneric"));
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, jobs, serverQuery, t]);

  // URL sync
  useEffect(() => {
    if (typeof window === "undefined") return;
    const p = new URLSearchParams();
    if (query.trim()) p.set("q", query.trim());
    if (tradeId) p.set("trade", tradeId);
    if (city) p.set("city", city);
    if (shift !== "any") p.set("shift", shift);
    if (sort !== "match") p.set("sort", sort);
    if (urgentOnly) p.set("urgent", "1");
    if (savedOnly) p.set("saved", "1");
    if (topEmployersOnly) p.set("top", "1");
    const qs = p.toString();
    const target = qs ? `/jobs?${qs}` : "/jobs";
    if (window.location.pathname + window.location.search !== target) {
      router.replace(target, { scroll: false });
    }
  }, [query, tradeId, city, shift, sort, urgentOnly, savedOnly, topEmployersOnly, router]);

  const tradeSkills = useMemo(() => skills.filter(s => TRADE_NAMES.has(s.nameEn)), [skills]);
  const tradeName = useMemo(
    () => tradeSkills.find(s => s.id === tradeId)?.nameEn ?? null,
    [tradeSkills, tradeId],
  );

  const cities = useMemo(() => {
    if (!jobs) return [];
    return Array.from(new Set(jobs.map(j => j.city))).sort();
  }, [jobs]);

  const visible = useMemo(() => {
    if (!jobs) return null;
    const q = query.trim().toLowerCase();
    let out = jobs.filter(j => {
      if (q) {
        const hay = [
          j.title,
          j.employer?.companyName ?? "",
          j.trade?.nameEn ?? "",
          j.city,
          ...j.skills.map(s => s.skill?.nameEn ?? ""),
        ].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (city && j.city !== city) return false;
      if (savedOnly && !savedIds.has(j.id)) return false;
      if (topEmployersOnly) {
        const r = j.employer;
        if (!r?.ratingAvg || !r.ratingCount || r.ratingAvg < 4.5 || r.ratingCount < 3) return false;
      }
      return true;
    });
    out = [...out].sort((a, b) => {
      if (sort === "match") return (b.matchScore ?? -1) - (a.matchScore ?? -1);
      if (sort === "wage") return b.wageMax - a.wageMax;
      if (sort === "nearest") return (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity);
      return +new Date(b.createdAt) - +new Date(a.createdAt);
    });
    return out;
  }, [jobs, query, city, savedOnly, savedIds, sort, topEmployersOnly]);

  interface Chip { key: string; label: string; clear: () => void }
  const chips: Chip[] = useMemo(() => {
    const out: Chip[] = [];
    if (query.trim()) out.push({ key: "q", label: `"${query.trim()}"`, clear: () => setQuery("") });
    if (tradeName) out.push({ key: "trade", label: tradeName, clear: () => setTradeId("") });
    if (city) out.push({ key: "city", label: city, clear: () => setCity("") });
    if (shift !== "any") out.push({ key: "shift", label: t(shift === "day" ? "shiftDay" : "shiftNight"), clear: () => setShift("any") });
    if (urgentOnly) out.push({ key: "urgent", label: t("feedUrgent"), clear: () => setUrgentOnly(false) });
    if (savedOnly) out.push({ key: "saved", label: t("boardSavedOnly"), clear: () => setSavedOnly(false) });
    if (topEmployersOnly) out.push({ key: "top", label: t("boardTopEmployers"), clear: () => setTopEmployersOnly(false) });
    return out;
  }, [query, tradeName, city, shift, urgentOnly, savedOnly, topEmployersOnly, t]);

  function clearAll() {
    setQuery("");
    setTradeId("");
    setCity("");
    setShift("any");
    setUrgentOnly(false);
    setSavedOnly(false);
    setTopEmployersOnly(false);
  }

  const hasActiveFilters = chips.length > 0;
  const isWorker = (session?.user as { role?: string } | undefined)?.role === "worker";

  if (status === "loading" || profileExists === null) {
    return (
      <AppShell>
        <LoadingSkeleton count={3} />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex flex-col gap-4">
        {/* Page header — no gradient, no decorative arcs */}
        <section className="border-b border-border pb-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex flex-col gap-1">
              <p className="text-meta uppercase tracking-wider text-ink-subtle">
                {t("boardSubtitle")}
              </p>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-ink flex items-center gap-2.5 text-balance">
                <Compass className="size-5 text-ink-muted" aria-hidden />
                {t("boardTitle")}
              </h1>
            </div>
            {visible && (
              <p className="text-meta text-ink-muted tabular-nums shrink-0 pt-2">
                {t(visible.length === 1 ? "boardResultOne" : "boardResults", { count: visible.length })}
              </p>
            )}
          </div>

          {/* Search bar — plain, no shadow */}
          <div className="relative mt-3">
            <Search
              className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-ink-subtle"
              aria-hidden
            />
            <Input
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={t("boardSearchPlaceholder")}
              aria-label={t("boardSearchPlaceholder")}
              className="pl-10 pr-10 h-11 text-base bg-surface"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label={t("boardClearAll")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 grid place-items-center size-7 rounded-md text-ink-subtle hover:bg-surface-sunken hover:text-ink transition-colors"
              >
                <X className="size-4" aria-hidden />
              </button>
            )}
          </div>

          {/* Available-today toggle — plain row, no emerald pulse */}
          {isWorker && availableToday !== null && (
            <div
              className={`mt-3 flex items-center gap-3 rounded-md border px-4 py-2.5 ${
                availableToday
                  ? "border-positive/40 bg-positive/5"
                  : "border-border bg-surface"
              }`}
            >
              <span
                aria-hidden
                className="grid size-7 place-items-center rounded-md border border-border bg-surface text-ink-muted"
              >
                <Clock className="size-3.5" aria-hidden />
              </span>
              <div className="flex flex-col min-w-0 flex-1">
                <p
                  className={`text-sm font-medium leading-tight ${
                    availableToday ? "text-positive" : "text-ink"
                  }`}
                >
                  {availableToday ? t("boardAvailableTodayOn") : t("boardAvailableTodayOff")}
                </p>
                <p className="text-meta text-ink-muted truncate">
                  {t("boardAvailableTodayHint")}
                </p>
              </div>
              <Switch
                checked={availableToday}
                disabled={availableSaving}
                onCheckedChange={toggleAvailableToday}
                aria-label={t("boardAvailableToday")}
              />
            </div>
          )}
        </section>

        {/* Sticky toolbar — neutral selects, neutral toggle rows */}
        <div className="sticky top-14 z-20 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2 bg-background/95 backdrop-blur-[6px] supports-[backdrop-filter]:bg-background/80 border-b border-border">
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={tradeId || "any"} onValueChange={v => setTradeId(v === "any" ? "" : v)}>
              <SelectTrigger className="h-9 w-auto min-w-28 gap-1 text-sm font-medium" aria-label={t("feedFilterTrade")}>
                <Briefcase className="size-3.5 text-ink-subtle" aria-hidden />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">{t("feedFilterTrade")}: any</SelectItem>
                {tradeSkills.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.nameEn}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={city || "any"} onValueChange={v => setCity(v === "any" ? "" : v)}>
              <SelectTrigger className="h-9 w-auto min-w-24 gap-1 text-sm font-medium" aria-label={t("boardCity")}>
                <MapPin className="size-3.5 text-ink-subtle" aria-hidden />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">{t("boardAnyCity")}</SelectItem>
                {cities.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={shift} onValueChange={v => setShift(v as typeof shift)}>
              <SelectTrigger className="h-9 w-auto min-w-24 text-sm font-medium" aria-label={t("feedFilterShift")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">{t("feedFilterShift")}: {t("shiftAny").toLowerCase()}</SelectItem>
                <SelectItem value="day">{t("shiftDay")}</SelectItem>
                <SelectItem value="night">{t("shiftNight")}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sort} onValueChange={v => setSort(v as SortKey)}>
              <SelectTrigger className="h-9 w-auto min-w-32 gap-1 text-sm font-medium sm:ml-auto" aria-label={t("boardSortLabel")}>
                <ArrowDownWideNarrow className="size-3.5 text-ink-subtle" aria-hidden />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="match">{t("boardSortMatch")}</SelectItem>
                <SelectItem value="wage">{t("boardSortWage")}</SelectItem>
                <SelectItem value="nearest">{t("boardSortNearest")}</SelectItem>
                <SelectItem value="newest">{t("boardSortNewest")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Toggle rows — neutral bordered, status-dot for active state */}
          <div className="flex items-center gap-2 flex-wrap mt-2">
            <label
              className={`inline-flex items-center gap-2 h-9 rounded-md border px-3 cursor-pointer transition-colors ${
                urgentOnly
                  ? "border-warning/40 bg-warning/5 text-warning-foreground"
                  : "border-border bg-surface text-ink-muted hover:text-ink hover:bg-surface-sunken"
              }`}
            >
              <span
                className={`status-dot ${urgentOnly ? "is-warning" : "is-neutral"}`}
                aria-hidden
              />
              <span className="text-sm font-medium">{t("feedUrgent")}</span>
              <Switch
                checked={urgentOnly}
                onCheckedChange={setUrgentOnly}
                className="scale-75"
                aria-label={t("feedUrgent")}
              />
            </label>

            <label
              className={`inline-flex items-center gap-2 h-9 rounded-md border px-3 cursor-pointer transition-colors ${
                savedOnly
                  ? "border-primary/40 bg-primary/5 text-primary"
                  : "border-border bg-surface text-ink-muted hover:text-ink hover:bg-surface-sunken"
              }`}
            >
              <Bookmark className={`size-3.5 ${savedOnly ? "fill-primary" : ""}`} aria-hidden />
              <span className="text-sm font-medium">{t("boardSavedOnly")}</span>
              {savedCount > 0 && (
                <span className="text-meta tabular-nums text-ink-subtle">({savedCount})</span>
              )}
              <Switch
                checked={savedOnly}
                onCheckedChange={setSavedOnly}
                className="scale-75"
                aria-label={t("boardSavedOnly")}
              />
            </label>

            <label
              className={`inline-flex items-center gap-2 h-9 rounded-md border px-3 cursor-pointer transition-colors ${
                topEmployersOnly
                  ? "border-primary/40 bg-primary/5 text-primary"
                  : "border-border bg-surface text-ink-muted hover:text-ink hover:bg-surface-sunken"
              }`}
            >
              <Gauge className="size-3.5" aria-hidden />
              <span className="text-sm font-medium">{t("boardTopEmployers")}</span>
              <Switch
                checked={topEmployersOnly}
                onCheckedChange={setTopEmployersOnly}
                className="scale-75"
                aria-label={t("boardTopEmployers")}
              />
            </label>

            {hasActiveFilters && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearAll}
                className="h-9 rounded-md text-meta text-ink-muted hover:text-ink ml-auto gap-1"
              >
                <X className="size-3.5" aria-hidden />
                {t("boardClearAll")}
              </Button>
            )}
          </div>
        </div>

        {/* Active filter chips — neutral with X */}
        {hasActiveFilters && (
          <div className="flex items-center gap-1.5 flex-wrap" aria-label={t("boardClearAll")}>
            {chips.map(c => (
              <button
                key={c.key}
                type="button"
                onClick={c.clear}
                className="inline-flex items-center gap-1.5 h-8 rounded-md border border-border bg-surface pl-2.5 pr-2 text-meta font-medium text-ink hover:bg-surface-sunken transition-colors"
                aria-label={`${c.label} — remove filter`}
              >
                {c.label}
                <X className="size-3 text-ink-subtle" aria-hidden />
              </button>
            ))}
          </div>
        )}

        {/* Results */}
        {jobs === null && <LoadingSkeleton count={4} />}

        {jobs !== null && visible !== null && visible.length === 0 && query.trim() !== "" && (
          <EmptyState
            icon={Search}
            title={t("boardSearchEmpty")}
            description={t("boardSearchEmptyHint")}
            action={
              <Button type="button" variant="outline" size="sm" onClick={() => { setQuery(""); setCity(""); }}>
                {t("boardClearAll")}
              </Button>
            }
          />
        )}

        {jobs !== null && visible !== null && visible.length === 0 && query.trim() === "" && savedOnly && (
          <EmptyState
            icon={Bookmark}
            title={t("boardNoSaved")}
            description={t("boardNoSavedHint")}
            action={
              <Button type="button" variant="outline" size="sm" onClick={() => setSavedOnly(false)}>
                {t("boardClearAll")}
              </Button>
            }
          />
        )}

        {jobs !== null && visible !== null && visible.length === 0 && query.trim() === "" && !savedOnly && (
          <EmptyState
            icon={Search}
            title={t("feedEmpty")}
            description={t("boardSearchEmptyHint")}
            action={
              <Button type="button" variant="outline" size="sm" onClick={clearAll}>
                {t("boardClearAll")}
              </Button>
            }
          />
        )}

        {visible !== null && visible.length > 0 && (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {visible.map((job) => (
                <JobCard key={job.id} job={job} applied={appliedIds.has(job.id)} />
              ))}
            </div>

            <div className="flex flex-col items-center gap-3 mt-2 pb-2">
              <p className="text-meta text-ink-subtle tabular-nums">
                {t("boardShowing", { shown: visible.length, total: jobs.length })}
              </p>
              {hasNext ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="gap-2 min-h-11 px-6"
                >
                  {loadingMore
                    ? <Loader2 className="size-4 animate-spin" aria-hidden />
                    : <ChevronDown className="size-4" aria-hidden />}
                  {t("boardLoadMore")}
                </Button>
              ) : (
                <div className="flex items-center gap-3 w-full max-w-xs text-ink-subtle" aria-hidden>
                  <span className="h-px flex-1 bg-border" />
                  <span className="text-meta uppercase tracking-widest whitespace-nowrap">
                    {t("boardEndOfList")}
                  </span>
                  <span className="h-px flex-1 bg-border" />
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

export default function JobsPage() {
  return (
    <Suspense fallback={<AppShell><LoadingSkeleton count={3} /></AppShell>}>
      <JobBoard />
    </Suspense>
  );
}
