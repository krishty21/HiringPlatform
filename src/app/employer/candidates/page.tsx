"use client";
// /employer/candidates — Master Prompt §28: ATS-style candidate list.
// Rows like "94 Ravi Kumar Skill Verified" — easy comparison.
// Removed: amber "urgent boost" pill, rounded-full count badge, gradient hairline.
// Added: border-b sectioned header, surface-raised filter rail, ATS row grid.
import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/shared/AppShell";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { CandidateCard, type CandidateCardData } from "@/components/employer/CandidateCard";
import {
  CandidateFilters,
  DEFAULT_FILTERS,
  type CandidateFiltersValue,
} from "@/components/employer/CandidateFilters";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { Search, ArrowDownWideNarrow, ChevronRight } from "lucide-react";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import type { Skill } from "@/lib/schemas";

type SortValue = "match" | "rating" | "distance" | "experience";

function CandidatesPageBody() {
  const { t } = useLanguage();
  const search = useSearchParams();
  const urgentJobId = search.get("urgentJobId") ?? undefined;

  const [skills, setSkills] = useState<Skill[]>([]);
  const [filters, setFilters] = useState<CandidateFiltersValue>(DEFAULT_FILTERS);
  const [sort, setSort] = useState<SortValue>("match");
  const [results, setResults] = useState<CandidateCardData[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  // Fetch skills for filter dropdown
  useEffect(() => {
    fetch("/api/skills")
      .then(r => r.json())
      .then((data: { items: Skill[] }) => setSkills(data.items ?? []))
      .catch(() => setSkills([]));
  }, []);

  // Build query string from filters + sort
  const buildQuery = useCallback((f: CandidateFiltersValue, s: SortValue) => {
    const p = new URLSearchParams();
    if (f.tradeId) p.set("tradeId", f.tradeId);
    if (f.experienceMin) p.set("experienceMin", f.experienceMin);
    if (f.experienceMax) p.set("experienceMax", f.experienceMax);
    if (f.distanceKm) p.set("distanceKm", String(f.distanceKm));
    if (f.trustTier) p.set("trustTier", f.trustTier);
    if (f.wageMin) p.set("wageMin", f.wageMin);
    if (f.wageMax) p.set("wageMax", f.wageMax);
    if (f.availableToday) p.set("availableToday", "true");
    if (f.language) p.set("language", f.language);
    if (f.topRated) p.set("topRated", "true");
    if (s !== "match") p.set("sort", s);
    if (urgentJobId) p.set("urgentJobId", urgentJobId);
    return p.toString();
  }, [urgentJobId]);

  const runSearch = useCallback(async () => {
    setLoading(true);
    try {
      const qs = buildQuery(filters, sort);
      const res = await fetch(`/api/candidates/search?${qs}`);
      const data = await res.json() as { items: CandidateCardData[]; total: number };
      setResults(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch {
      setResults([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [filters, sort, buildQuery]);

  // Auto-run search on filter changes (debounced via simple effect)
  useEffect(() => {
    const id = setTimeout(() => { runSearch(); }, 250);
    return () => clearTimeout(id);
  }, [runSearch]);

  return (
    <AppShell>
      <main className="flex flex-col gap-6">
        {/* Header — border-b sectioned */}
        <header className="border-b border-border pb-4 flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p className="text-meta uppercase tracking-wide text-ink-subtle">
              {t("candidatesEyebrow")}
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-ink">
              {t("candidatesTitle")}
            </h1>
            <p className="text-meta text-ink-subtle mt-1 flex items-center gap-2 flex-wrap">
              {t("candidatesRankedBy")}
              {urgentJobId && (
                <span className="inline-flex items-center gap-1 text-warning-foreground text-xs font-medium">
                  <ChevronRight className="size-3" aria-hidden />
                  {t("candidatesUrgentBoost")}
                </span>
              )}
              {results && results.length > 0 && (
                <span className="tabular-nums text-ink-muted">
                  ·{" "}
                  {total === 1
                    ? t("candidatesCountOne")
                    : t("candidatesCountMany", { count: total })}
                </span>
              )}
            </p>
          </div>
          {/* Sort selector — Master Prompt §28: filter-heavy, comparison-oriented */}
          <div className="flex items-center gap-2">
            <label
              htmlFor="sortSelect"
              className="hidden sm:inline-flex items-center gap-1.5 text-meta uppercase tracking-wide text-ink-subtle"
            >
              <ArrowDownWideNarrow className="size-3.5" aria-hidden />
              {t("candidatesSortLabel")}
            </label>
            <Select value={sort} onValueChange={(v) => setSort(v as SortValue)}>
              <SelectTrigger id="sortSelect" className="h-9 min-w-[160px] gap-1.5 text-xs">
                <SelectValue placeholder={t("candidatesSortMatch")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="match">{t("candidatesSortMatch")}</SelectItem>
                <SelectItem value="rating">{t("candidatesSortRating")}</SelectItem>
                <SelectItem value="distance">{t("candidatesSortDistance")}</SelectItem>
                <SelectItem value="experience">{t("candidatesSortExperience")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
          <aside className="lg:sticky lg:top-20 lg:self-start">
            <CandidateFilters
              skills={skills}
              value={filters}
              onChange={setFilters}
            />
          </aside>

          <section>
            {loading && <LoadingSkeleton count={4} />}

            {!loading && results && results.length === 0 && (
              <EmptyState
                icon={Search}
                title={t("candidatesEmpty")}
                description={filters.topRated ? t("candidatesTopRatedEmpty") : t("candidatesEmptyHint")}
              />
            )}

            {!loading && results && results.length > 0 && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {results.map(c => <CandidateCard key={c.id} candidate={c} />)}
              </div>
            )}
          </section>
        </div>
      </main>
    </AppShell>
  );
}

export default function CandidatesPage() {
  return (
    <Suspense fallback={<LoadingSkeleton count={3} />}>
      <CandidatesPageBody />
    </Suspense>
  );
}
