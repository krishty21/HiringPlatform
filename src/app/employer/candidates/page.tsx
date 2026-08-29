"use client";
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
import { Search, Zap } from "lucide-react";
import type { Skill } from "@/lib/schemas";

function CandidatesPageBody() {
  const { t } = useLanguage();
  const search = useSearchParams();
  const urgentJobId = search.get("urgentJobId") ?? undefined;

  const [skills, setSkills] = useState<Skill[]>([]);
  const [filters, setFilters] = useState<CandidateFiltersValue>(DEFAULT_FILTERS);
  const [results, setResults] = useState<CandidateCardData[] | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch skills for filter dropdown
  useEffect(() => {
    fetch("/api/skills")
      .then(r => r.json())
      .then((data: { items: Skill[] }) => setSkills(data.items ?? []))
      .catch(() => setSkills([]));
  }, []);

  // Build query string from filters
  const buildQuery = useCallback((f: CandidateFiltersValue) => {
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
    if (urgentJobId) p.set("urgentJobId", urgentJobId);
    return p.toString();
  }, [urgentJobId]);

  const runSearch = useCallback(async () => {
    setLoading(true);
    try {
      const qs = buildQuery(filters);
      const res = await fetch(`/api/candidates/search?${qs}`);
      const data = await res.json() as { items: CandidateCardData[] };
      setResults(data.items ?? []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [filters, buildQuery]);

  // Auto-run search on filter changes (debounced via simple effect)
  useEffect(() => {
    const id = setTimeout(() => { runSearch(); }, 250);
    return () => clearTimeout(id);
  }, [runSearch]);

  return (
    <AppShell>
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("candidatesTitle")}</h1>
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
            Ranked by match score
            {urgentJobId && (
              <span className="inline-flex items-center gap-1 text-rose-700 text-xs font-medium">
                <Zap className="size-3" />
                Urgent job — available-today workers first
              </span>
            )}
          </p>
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
              description={filters.topRated ? t("candidatesTopRatedEmpty") : "Try widening the distance or removing the experience filter."}
            />
          )}

          {!loading && results && results.length > 0 && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {results.map(c => <CandidateCard key={c.id} candidate={c} />)}
            </div>
          )}
        </section>
      </div>
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
