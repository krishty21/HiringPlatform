"use client";
import { useEffect, useState, useCallback, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/shared/AppShell";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { JobCard, type WorkerJobCardData } from "@/components/worker/JobCard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { useSavedJobs } from "@/hooks/use-saved-jobs";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import {
  Search, X, Zap, Bookmark, ArrowDownWideNarrow, MapPin, Briefcase,
  ChevronDown, Loader2, Compass, SlidersHorizontal,
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

type SortKey = "match" | "wage" | "newest";

const PAGE_SIZE = 9;

function JobBoard() {
  const { t } = useLanguage();
  const router = useRouter();
  const search = useSearchParams();
  const { data: session, status } = useSession();
  const { savedIds, savedCount } = useSavedJobs();

  // ---- URL-synced state (shareable deep links: /jobs?q=welder&city=...&sort=wage) ----
  const [query, setQuery] = useState(search.get("q") ?? "");
  const [tradeId, setTradeId] = useState(search.get("trade") ?? "");
  const [city, setCity] = useState(search.get("city") ?? "");
  const [shift, setShift] = useState<"day" | "night" | "any">((search.get("shift") as any) ?? "any");
  const [sort, setSort] = useState<SortKey>((search.get("sort") as SortKey) ?? "match");
  const [urgentOnly, setUrgentOnly] = useState(search.get("urgent") === "1");
  const [savedOnly, setSavedOnly] = useState(search.get("saved") === "1");

  // ---- data ----
  const [skills, setSkills] = useState<Skill[]>([]);
  const [jobs, setJobs] = useState<WorkerJobCardData[] | null>(null);
  const [hasNext, setHasNext] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [profileExists, setProfileExists] = useState<boolean | null>(null);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());

  // Skills taxonomy (for trade filter)
  useEffect(() => {
    fetch("/api/skills")
      .then(r => r.json())
      .then((d: { items: Skill[] }) => setSkills(d.items ?? []))
      .catch(() => setSkills([]));
  }, []);

  // Worker profile existence (redirect to onboarding when missing)
  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/worker/profile", { cache: "no-store" })
      .then(r => {
        if (r.status === 403 || r.status === 404) { setProfileExists(false); return null; }
        if (!r.ok) return null;
        return r.json();
      })
      .then(data => { if (data !== null) setProfileExists(true); })
      .catch(() => setProfileExists(false));
  }, [status]);

  useEffect(() => {
    if (profileExists === false && status === "authenticated") {
      const role = (session?.user as any)?.role;
      if (role === "worker") router.replace("/onboarding/worker");
    }
  }, [profileExists, status, session, router]);

  // Applied jobs (mark cards so the Apply button doesn't double-submit)
  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/applications/mine", { cache: "no-store" })
      .then(r => (r.ok ? r.json() : { items: [] }))
      .then((d: { items: { jobId: string }[] }) => {
        setAppliedIds(new Set((d.items ?? []).map(a => a.jobId)));
      })
      .catch(() => {});
  }, [status]);

  // Server-side query (trade/shift/urgent). Browse-all: distanceKm=200 overrides
  // the worker-radius filter so every open job on the platform is reachable here.
  const serverQuery = useMemo(() => {
    const p = new URLSearchParams();
    p.set("pageSize", String(PAGE_SIZE));
    p.set("distanceKm", "200");
    if (tradeId) p.set("tradeId", tradeId);
    if (shift !== "any") p.set("shift", shift);
    if (urgentOnly) p.set("urgentOnly", "true");
    return p.toString();
  }, [tradeId, shift, urgentOnly]);

  // Fetch page 1 (debounced) whenever server-side filters change
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

  // Load-more appends the next page
  const loadMore = useCallback(async () => {
    if (loadingMore || !jobs) return;
    setLoadingMore(true);
    try {
      // Infer next page from the items we already hold
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

  // ---- URL sync (replace, no scroll jump) ----
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
    const qs = p.toString();
    const target = qs ? `/jobs?${qs}` : "/jobs";
    if (window.location.pathname + window.location.search !== target) {
      router.replace(target, { scroll: false });
    }
  }, [query, tradeId, city, shift, sort, urgentOnly, savedOnly, router]);

  const tradeSkills = useMemo(() => skills.filter(s => TRADE_NAMES.has(s.nameEn)), [skills]);
  const tradeName = useMemo(
    () => tradeSkills.find(s => s.id === tradeId)?.nameEn ?? null,
    [tradeSkills, tradeId],
  );

  // Cities derived from loaded jobs (only cities that actually have jobs)
  const cities = useMemo(() => {
    if (!jobs) return [];
    return Array.from(new Set(jobs.map(j => j.city))).sort();
  }, [jobs]);

  // ---- client-side pipeline: text search → city → saved → sort ----
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
      return true;
    });
    out = [...out].sort((a, b) => {
      if (sort === "match") return (b.matchScore ?? -1) - (a.matchScore ?? -1);
      if (sort === "wage") return b.wageMax - a.wageMax;
      return +new Date(b.createdAt) - +new Date(a.createdAt);
    });
    return out;
  }, [jobs, query, city, savedOnly, savedIds, sort]);

  // ---- active filter chips ----
  interface Chip { key: string; label: string; clear: () => void }
  const chips: Chip[] = useMemo(() => {
    const out: Chip[] = [];
    if (query.trim()) out.push({ key: "q", label: `“${query.trim()}”`, clear: () => setQuery("") });
    if (tradeName) out.push({ key: "trade", label: tradeName, clear: () => setTradeId("") });
    if (city) out.push({ key: "city", label: city, clear: () => setCity("") });
    if (shift !== "any") out.push({ key: "shift", label: shift === "day" ? "Day" : "Night", clear: () => setShift("any") });
    if (urgentOnly) out.push({ key: "urgent", label: t("feedUrgent"), clear: () => setUrgentOnly(false) });
    if (savedOnly) out.push({ key: "saved", label: t("boardSavedOnly"), clear: () => setSavedOnly(false) });
    return out;
  }, [query, tradeName, city, shift, urgentOnly, savedOnly, t]);

  function clearAll() {
    setQuery("");
    setTradeId("");
    setCity("");
    setShift("any");
    setUrgentOnly(false);
    setSavedOnly(false);
    // keep sort — it's a view preference, not a filter
  }

  const hasActiveFilters = chips.length > 0;

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
        {/* ---------- Hero / search header ---------- */}
        <section className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-accent/10 p-4 sm:p-6">
          {/* decorative bridge arcs */}
          <div aria-hidden className="pointer-events-none absolute -right-10 -top-16 size-48 rounded-full border-[14px] border-primary/10" />
          <div aria-hidden className="pointer-events-none absolute -right-4 -top-10 size-28 rounded-full border-[10px] border-accent/15" />

          <div className="relative flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                  <Compass className="size-6 text-primary" />
                  {t("boardTitle")}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">{t("boardSubtitle")}</p>
              </div>
              {visible && (
                <Badge variant="secondary" className="tabular-nums px-3 py-1 text-xs shrink-0">
                  {t(visible.length === 1 ? "boardResultOne" : "boardResults", { count: visible.length })}
                </Badge>
              )}
            </div>

            {/* Search bar */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" aria-hidden />
              <Input
                type="search"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={t("boardSearchPlaceholder")}
                aria-label={t("boardSearchPlaceholder")}
                className="pl-10 pr-10 h-12 text-base rounded-xl bg-card shadow-sm border-border/80 focus-visible:ring-2"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label={t("boardClearAll")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 grid place-items-center size-7 rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
          </div>
        </section>

        {/* ---------- Sticky toolbar ---------- */}
        <div className="sticky top-14 z-20 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75 border-b border-border">
          <div className="flex items-center gap-2 flex-wrap">
            <SlidersHorizontal className="size-4 text-muted-foreground shrink-0" aria-hidden />

            <Select value={tradeId || "any"} onValueChange={v => setTradeId(v === "any" ? "" : v)}>
              <SelectTrigger className="h-9 w-auto min-w-28 gap-1 text-xs font-medium" aria-label={t("feedFilterTrade")}>
                <Briefcase className="size-3.5 text-muted-foreground" />
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
              <SelectTrigger className="h-9 w-auto min-w-24 gap-1 text-xs font-medium" aria-label={t("boardCity")}>
                <MapPin className="size-3.5 text-muted-foreground" />
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
              <SelectTrigger className="h-9 w-auto min-w-24 text-xs font-medium" aria-label={t("feedFilterShift")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">{t("feedFilterShift")}: any</SelectItem>
                <SelectItem value="day">Day</SelectItem>
                <SelectItem value="night">Night</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sort} onValueChange={v => setSort(v as SortKey)}>
              <SelectTrigger className="h-9 w-auto min-w-32 gap-1 text-xs font-medium sm:ml-auto" aria-label={t("boardSortLabel")}>
                <ArrowDownWideNarrow className="size-3.5 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="match">{t("boardSortMatch")}</SelectItem>
                <SelectItem value="wage">{t("boardSortWage")}</SelectItem>
                <SelectItem value="newest">{t("boardSortNewest")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Toggle chips row */}
          <div className="flex items-center gap-2 flex-wrap mt-2">
            <label
              className={`inline-flex items-center gap-2 h-9 rounded-full border px-3 cursor-pointer transition-colors ${urgentOnly ? "border-accent bg-accent/15 text-accent-foreground" : "border-border bg-card text-muted-foreground hover:border-accent/50"}`}
            >
              <Zap className="size-3.5" />
              <span className="text-xs font-medium">{t("feedUrgent")}</span>
              <Switch checked={urgentOnly} onCheckedChange={setUrgentOnly} className="scale-75 data-[state=checked]:bg-accent-foreground" aria-label={t("feedUrgent")} />
            </label>

            <label
              className={`inline-flex items-center gap-2 h-9 rounded-full border px-3 cursor-pointer transition-colors ${savedOnly ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:border-primary/50"}`}
            >
              <Bookmark className={`size-3.5 ${savedOnly ? "fill-primary" : ""}`} />
              <span className="text-xs font-medium">{t("boardSavedOnly")}</span>
              {savedCount > 0 && (
                <Badge variant="secondary" className="text-[10px] tabular-nums h-5 px-1.5">{savedCount}</Badge>
              )}
              <Switch checked={savedOnly} onCheckedChange={setSavedOnly} className="scale-75" aria-label={t("boardSavedOnly")} />
            </label>

            {hasActiveFilters && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearAll}
                className="h-9 rounded-full text-xs gap-1 ml-auto text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
                {t("boardClearAll")}
              </Button>
            )}
          </div>
        </div>

        {/* ---------- Active filter chips ---------- */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 flex-wrap" aria-label={t("boardClearAll")}>
            {chips.map(c => (
              <button
                key={c.key}
                type="button"
                onClick={c.clear}
                className="inline-flex items-center gap-1.5 h-8 rounded-full bg-primary/10 text-primary pl-3 pr-2 text-xs font-medium hover:bg-primary/15 transition-colors group"
                aria-label={`${c.label} — remove filter`}
              >
                {c.label}
                <X className="size-3.5 opacity-60 group-hover:opacity-100" />
              </button>
            ))}
          </div>
        )}

        {/* ---------- Results ---------- */}
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
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {visible.map((job, i) => (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: Math.min(i, 6) * 0.05, ease: "easeOut" }}
                >
                  <JobCard job={job} applied={appliedIds.has(job.id)} />
                </motion.div>
              ))}
            </div>

            {/* Footer: count + load more / end of list */}
            <div className="flex flex-col items-center gap-3 mt-2 pb-2">
              <p className="text-xs text-muted-foreground tabular-nums">
                {t("boardShowing", { shown: visible.length, total: jobs.length })}
              </p>
              {hasNext ? (
                <Button type="button" variant="outline" onClick={loadMore} disabled={loadingMore} className="gap-2 min-h-11 px-6">
                  {loadingMore
                    ? <Loader2 className="size-4 animate-spin" />
                    : <ChevronDown className="size-4" />}
                  {t("boardLoadMore")}
                </Button>
              ) : (
                <div className="flex items-center gap-3 w-full max-w-xs text-muted-foreground" aria-hidden>
                  <span className="h-px flex-1 bg-border" />
                  <span className="text-[10px] uppercase tracking-widest whitespace-nowrap">{t("boardEndOfList")}</span>
                  <span className="h-px flex-1 bg-border" />
                </div>
              )}
            </div>
          </>
        )}

        {/* Screen-reader summary of current filters */}
        <Card className="sr-only">
          <CardContent>
            {t(visible?.length === 1 ? "boardResultOne" : "boardResults", { count: visible?.length ?? 0 })}
            {hasActiveFilters ? ` · ${chips.map(c => c.label).join(", ")}` : ""}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

export default function JobBoardPage() {
  return (
    <Suspense fallback={<AppShell><LoadingSkeleton count={3} /></AppShell>}>
      <JobBoard />
    </Suspense>
  );
}
