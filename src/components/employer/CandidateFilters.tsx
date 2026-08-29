"use client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Filter, RotateCcw, Gauge } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import type { Skill } from "@/lib/schemas";

export interface CandidateFiltersValue {
  tradeId: string;
  experienceMin: string;
  experienceMax: string;
  distanceKm: number;
  trustTier: "" | "new" | "id_verified" | "skill_verified" | "top_pro";
  wageMin: string;
  wageMax: string;
  availableToday: boolean;
  language: "" | "en" | "hi" | "te";
  topRated: boolean;
}

export const DEFAULT_FILTERS: CandidateFiltersValue = {
  tradeId: "",
  experienceMin: "",
  experienceMax: "",
  distanceKm: 50,
  trustTier: "",
  wageMin: "",
  wageMax: "",
  availableToday: false,
  language: "",
  topRated: false,
};

/**
 * CandidateFilters — ATS-style filter rail.
 * Removed: emerald/amber-tinted toggle row backgrounds, Star icon on top-rated.
 * Added: surface-inset neutral toggle rows, Gauge icon (semantic), status-dot on toggle.
 */
export function CandidateFilters({
  skills,
  value,
  onChange,
}: {
  skills: Skill[];
  value: CandidateFiltersValue;
  onChange: (next: CandidateFiltersValue) => void;
}) {
  const { t } = useLanguage();

  function update<K extends keyof CandidateFiltersValue>(key: K, v: CandidateFiltersValue[K]) {
    onChange({ ...value, [key]: v });
  }

  // Build a list of unique categories from skills for grouping
  const categories = Array.from(new Set(skills.map(s => s.category))).sort();

  return (
    <Card className="surface-raised shadow-raise">
      <CardContent className="p-4 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold text-ink">
            <Filter className="size-4 text-ink-subtle" aria-hidden />
            {t("candidatesFiltersTitle")}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange(DEFAULT_FILTERS)}
            className="text-xs gap-1 min-h-9"
          >
            <RotateCcw className="size-3" aria-hidden />
            {t("candidatesFiltersReset")}
          </Button>
        </div>

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {/* Trade */}
          <div className="grid gap-2">
            <Label className="text-meta uppercase tracking-wide text-ink-subtle">{t("feedFilterTrade")}</Label>
            <Select value={value.tradeId} onValueChange={(v) => update("tradeId", v === "any" ? "" : v)}>
              <SelectTrigger className="min-h-11 w-full">
                <SelectValue placeholder={t("anyTrade")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">{t("anyTrade")}</SelectItem>
                {categories.map(cat => (
                  <SelectGroupFilter key={cat} cat={cat} skills={skills} />
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Experience range */}
          <div className="grid gap-2">
            <Label className="text-meta uppercase tracking-wide text-ink-subtle">
              {t("candidatesFilterExperience")} ({t("unitYears")})
            </Label>
            <div className="flex items-center gap-2">
              <Input
                type="number" min={0} max={50} placeholder="min"
                value={value.experienceMin}
                onChange={e => update("experienceMin", e.target.value)}
                className="min-h-11"
                aria-label={t("candidatesFilterExpMin")}
              />
              <span className="text-ink-subtle" aria-hidden>–</span>
              <Input
                type="number" min={0} max={50} placeholder="max"
                value={value.experienceMax}
                onChange={e => update("experienceMax", e.target.value)}
                className="min-h-11"
                aria-label={t("candidatesFilterExpMax")}
              />
            </div>
          </div>

          {/* Distance slider */}
          <div className="grid gap-2">
            <Label className="text-meta uppercase tracking-wide text-ink-subtle">
              {t("candidatesFilterDistance")}: <span className="font-semibold text-ink tabular-nums">{value.distanceKm} {t("km")}</span>
            </Label>
            <Slider
              value={[value.distanceKm]}
              min={1} max={200} step={5}
              onValueChange={(v) => update("distanceKm", v[0] ?? 50)}
              className="mt-3"
              aria-label={t("candidatesFilterDistance")}
            />
          </div>

          {/* Trust tier */}
          <div className="grid gap-2">
            <Label className="text-meta uppercase tracking-wide text-ink-subtle">{t("candidatesFilterTrustTier")}</Label>
            <Select value={value.trustTier || "any"} onValueChange={(v) => update("trustTier", v === "any" ? "" : v as CandidateFiltersValue["trustTier"])}>
              <SelectTrigger className="min-h-11 w-full">
                <SelectValue placeholder={t("anyTier")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">{t("anyTier")}</SelectItem>
                <SelectItem value="new">{t("passportTierNew")}</SelectItem>
                <SelectItem value="id_verified">{t("passportTierIdVerified")}</SelectItem>
                <SelectItem value="skill_verified">{t("passportTierSkillVerified")}</SelectItem>
                <SelectItem value="top_pro">{t("passportTierTopPro")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Wage range */}
          <div className="grid gap-2">
            <Label className="text-meta uppercase tracking-wide text-ink-subtle">
              {t("candidatesFilterWage")} (₹/{t("unitDay")})
            </Label>
            <div className="flex items-center gap-2">
              <Input
                type="number" min={0} step={50} placeholder="min"
                value={value.wageMin}
                onChange={e => update("wageMin", e.target.value)}
                className="min-h-11"
                aria-label={t("candidatesFilterWageMin")}
              />
              <span className="text-ink-subtle" aria-hidden>–</span>
              <Input
                type="number" min={0} step={50} placeholder="max"
                value={value.wageMax}
                onChange={e => update("wageMax", e.target.value)}
                className="min-h-11"
                aria-label={t("candidatesFilterWageMax")}
              />
            </div>
          </div>

          {/* Language */}
          <div className="grid gap-2">
            <Label className="text-meta uppercase tracking-wide text-ink-subtle">{t("candidatesFilterLanguage")}</Label>
            <Select value={value.language || "any"} onValueChange={(v) => update("language", v === "any" ? "" : v as CandidateFiltersValue["language"])}>
              <SelectTrigger className="min-h-11 w-full">
                <SelectValue placeholder={t("anyLanguage")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">{t("anyLanguage")}</SelectItem>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="hi">हिन्दी</SelectItem>
                <SelectItem value="te">తెలుగు</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Available today toggle — neutral surface-inset */}
        <div className="surface-inset rounded-md flex items-center justify-between gap-3 px-3 py-2.5">
          <div className="flex flex-col">
            <Label htmlFor="availToday" className="text-sm font-medium text-ink">
              {t("candidatesFilterAvailable")}
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`status-dot ${value.availableToday ? "is-positive" : "is-neutral"}`}
              aria-hidden
            />
            <Switch
              id="availToday"
              checked={value.availableToday}
              onCheckedChange={(v) => update("availableToday", v)}
            />
          </div>
        </div>

        {/* Top Rated toggle — neutral surface-inset (no amber Star) */}
        <div className="surface-inset rounded-md flex items-center justify-between gap-3 px-3 py-2.5">
          <div className="flex flex-col gap-0.5">
            <Label htmlFor="topRatedOnly" className="text-sm font-medium text-ink inline-flex items-center gap-1.5">
              <Gauge className="size-3.5 text-ink-subtle" aria-hidden />
              {t("candidatesFilterTopRated")}
            </Label>
            <span className="text-[10px] text-ink-subtle">{t("candidatesFilterTopRatedHint")}</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`status-dot ${value.topRated ? "is-warning" : "is-neutral"}`}
              aria-hidden
            />
            <Switch
              id="topRatedOnly"
              checked={value.topRated}
              onCheckedChange={(v) => update("topRated", v)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Small helper component for grouping skills in the trade Select dropdown
function SelectGroupFilter({ cat, skills }: { cat: string; skills: Skill[] }) {
  const list = skills.filter(s => s.category === cat);
  return (
    <>
      <div className="px-2 py-1 text-meta uppercase tracking-wide text-ink-subtle">{cat}</div>
      {list.map(s => (
        <SelectItem key={s.id} value={s.id}>{s.nameEn}</SelectItem>
      ))}
    </>
  );
}
