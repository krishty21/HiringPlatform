"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Filter, RotateCcw, Star } from "lucide-react";
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
  const [collapsed, setCollapsed] = useState(false);

  function update<K extends keyof CandidateFiltersValue>(key: K, v: CandidateFiltersValue[K]) {
    onChange({ ...value, [key]: v });
  }

  // Build a list of unique categories from skills for grouping
  const categories = Array.from(new Set(skills.map(s => s.category))).sort();

  return (
    <Card>
      <CardContent className="p-4 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold">
            <Filter className="size-4" />
            Filters
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange(DEFAULT_FILTERS)}
            className="text-xs gap-1"
          >
            <RotateCcw className="size-3" />
            Reset
          </Button>
        </div>

        <div className={`grid gap-4 ${collapsed ? "hidden" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"}`}>
          {/* Trade */}
          <div className="grid gap-2">
            <Label className="text-xs">{t("feedFilterTrade")}</Label>
            <Select value={value.tradeId} onValueChange={(v) => update("tradeId", v === "any" ? "" : v)}>
              <SelectTrigger className="min-h-11 w-full">
                <SelectValue placeholder="Any trade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any trade</SelectItem>
                {categories.map(cat => (
                  <SelectGroupFilter key={cat} cat={cat} skills={skills} />
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Experience range */}
          <div className="grid gap-2">
            <Label className="text-xs">{t("candidatesFilterExperience")} (years)</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number" min={0} max={50} placeholder="min"
                value={value.experienceMin}
                onChange={e => update("experienceMin", e.target.value)}
                className="min-h-11"
              />
              <span className="text-muted-foreground">–</span>
              <Input
                type="number" min={0} max={50} placeholder="max"
                value={value.experienceMax}
                onChange={e => update("experienceMax", e.target.value)}
                className="min-h-11"
              />
            </div>
          </div>

          {/* Distance slider */}
          <div className="grid gap-2">
            <Label className="text-xs">
              {t("candidatesFilterDistance")}: <span className="font-semibold">{value.distanceKm} {t("km")}</span>
            </Label>
            <Slider
              value={[value.distanceKm]}
              min={1} max={200} step={5}
              onValueChange={(v) => update("distanceKm", v[0] ?? 50)}
              className="mt-3"
            />
          </div>

          {/* Trust tier */}
          <div className="grid gap-2">
            <Label className="text-xs">{t("candidatesFilterTrustTier")}</Label>
            <Select value={value.trustTier || "any"} onValueChange={(v) => update("trustTier", v === "any" ? "" : v as CandidateFiltersValue["trustTier"])}>
              <SelectTrigger className="min-h-11 w-full">
                <SelectValue placeholder="Any tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any tier</SelectItem>
                <SelectItem value="new">{t("passportTierNew")}</SelectItem>
                <SelectItem value="id_verified">{t("passportTierIdVerified")}</SelectItem>
                <SelectItem value="skill_verified">{t("passportTierSkillVerified")}</SelectItem>
                <SelectItem value="top_pro">{t("passportTierTopPro")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Wage range */}
          <div className="grid gap-2">
            <Label className="text-xs">{t("candidatesFilterWage")} (₹/day)</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number" min={0} step={50} placeholder="min"
                value={value.wageMin}
                onChange={e => update("wageMin", e.target.value)}
                className="min-h-11"
              />
              <span className="text-muted-foreground">–</span>
              <Input
                type="number" min={0} step={50} placeholder="max"
                value={value.wageMax}
                onChange={e => update("wageMax", e.target.value)}
                className="min-h-11"
              />
            </div>
          </div>

          {/* Language */}
          <div className="grid gap-2">
            <Label className="text-xs">{t("candidatesFilterLanguage")}</Label>
            <Select value={value.language || "any"} onValueChange={(v) => update("language", v === "any" ? "" : v as CandidateFiltersValue["language"])}>
              <SelectTrigger className="min-h-11 w-full">
                <SelectValue placeholder="Any language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any language</SelectItem>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="hi">हिन्दी</SelectItem>
                <SelectItem value="te">తెలుగు</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Available today toggle */}
        <div className="flex items-center justify-between gap-3 rounded-lg border border-emerald-300/40 bg-emerald-50 px-3 py-2.5">
          <div className="flex flex-col">
            <Label htmlFor="availToday" className="text-sm font-medium">{t("candidatesFilterAvailable")}</Label>
          </div>
          <Switch
            id="availToday"
            checked={value.availableToday}
            onCheckedChange={(v) => update("availableToday", v)}
          />
        </div>

        {/* Top Rated toggle (round 8) — workers with ≥3 ratings and avg ≥4.5 */}
        <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-300/40 bg-amber-50/70 px-3 py-2.5">
          <div className="flex flex-col gap-0.5">
            <Label htmlFor="topRatedOnly" className="text-sm font-medium inline-flex items-center gap-1.5">
              <Star className="size-3.5 fill-amber-400 text-amber-500" aria-hidden />
              {t("candidatesFilterTopRated")}
            </Label>
            <span className="text-[10px] text-muted-foreground">{t("candidatesFilterTopRatedHint")}</span>
          </div>
          <Switch
            id="topRatedOnly"
            checked={value.topRated}
            onCheckedChange={(v) => update("topRated", v)}
            className="data-[state=checked]:bg-amber-500"
          />
        </div>
      </CardContent>
    </Card>
  );
}

// Small helper component for grouping skills in the trade Select dropdown
function SelectGroupFilter({ cat, skills }: { cat: string; skills: Skill[] }) {
  // shadcn Select doesn't expose SelectGroup/SelectLabel easily — we'll use a header item instead
  const list = skills.filter(s => s.category === cat);
  return (
    <>
      <div className="px-2 py-1 text-xs font-semibold uppercase text-muted-foreground">{cat}</div>
      {list.map(s => (
        <SelectItem key={s.id} value={s.id}>{s.nameEn}</SelectItem>
      ))}
    </>
  );
}
