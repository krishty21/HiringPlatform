"use client";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CreateJobBody } from "@/lib/schemas";
import type { Skill } from "@/lib/schemas";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
  SelectGroup, SelectLabel,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";

type FormValues = {
  title: string;
  tradeId: string;
  headcount: number;
  wageMin: number;
  wageMax: number;
  city: string;
  lat: number;
  lng: number;
  shift: "day" | "night" | "any";
  isUrgent: boolean;
  description: string;
  skills: { skillId: string; required: boolean }[];
};

// Known coastal AP cities — keep the picker simple per directive
const CITIES: Record<string, { lat: number; lng: number }> = {
  Bhimavaram: { lat: 16.5417, lng: 81.5233 },
  Tadepalligudem: { lat: 16.8317, lng: 81.5172 },
  Rajahmundry: { lat: 17.0005, lng: 81.8080 },
  Vijayawada: { lat: 16.5062, lng: 80.6480 },
  Visakhapatnam: { lat: 17.6868, lng: 83.2185 },
  Kakinada: { lat: 16.9600, lng: 82.2377 },
};

export function JobPostForm({ skills }: { skills: Skill[] }) {
  const { t } = useLanguage();
  const router = useRouter();
  const [aiBusy, setAiBusy] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Group skills by category for the picker
  const grouped = useMemo(() => {
    const map: Record<string, Skill[]> = {};
    for (const s of skills) {
      (map[s.category] ??= []).push(s);
    }
    return map;
  }, [skills]);

  const { control, register, handleSubmit, watch, setValue, getValues, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(CreateJobBody) as any,
    defaultValues: {
      title: "", tradeId: "", headcount: 1, wageMin: 0, wageMax: 0,
      city: "", lat: 16.5, lng: 81.5, shift: "any", isUrgent: false,
      description: "", skills: [],
    },
  });

  const tradeId = watch("tradeId");
  const selectedSkills = watch("skills");
  const isUrgent = watch("isUrgent");
  const city = watch("city");

  // Filter skills for the multi-select based on chosen trade
  const tradeSkills = useMemo(() => {
    if (!tradeId) return [];
    const trade = skills.find(s => s.id === tradeId);
    if (!trade) return [];
    // Same category as the trade, plus sub-skills
    return skills.filter(s => s.category === trade.category);
  }, [tradeId, skills]);

  function toggleSkill(skillId: string) {
    const exists = selectedSkills.find(s => s.skillId === skillId);
    const next = exists
      ? selectedSkills.filter(s => s.skillId !== skillId)
      : [...selectedSkills, { skillId, required: true }];
    setValue("skills", next, { shouldValidate: true, shouldDirty: true });
  }

  function toggleRequired(skillId: string) {
    const next = selectedSkills.map(s => s.skillId === skillId ? { ...s, required: !s.required } : s);
    setValue("skills", next, { shouldValidate: true, shouldDirty: true });
  }

  function onCityChange(value: string) {
    setValue("city", value);
    const c = CITIES[value];
    if (c) {
      setValue("lat", c.lat);
      setValue("lng", c.lng);
    }
  }

  async function generateDescription() {
    const v = getValues();
    if (!v.title || !v.tradeId || !v.city) {
      toast.error("Fill title, trade, and city first.");
      return;
    }
    setAiBusy(true);
    try {
      const trade = skills.find(s => s.id === v.tradeId);
      const res = await fetch("/api/ai/job-description", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: v.title,
          tradeId: v.tradeId,
          headcount: v.headcount,
          wageMin: v.wageMin,
          wageMax: v.wageMax,
          city: v.city,
          shift: v.shift,
          isUrgent: v.isUrgent,
        }),
      });
      if (!res.ok) throw new Error("AI failed");
      const data = await res.json() as { description: string };
      setValue("description", data.description);
      toast.success(t("postJobAiEdit"));
    } catch (e) {
      toast.error("AI generation failed. Please write the description manually.");
    } finally {
      setAiBusy(false);
    }
  }

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    const start = Date.now();
    try {
      // Per AC EMP-01: post live in feed < 10s — measured from submit click to redirect.
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "VALIDATION" }));
        throw new Error(err.error ?? "SUBMIT_FAILED");
      }
      const elapsed = Date.now() - start;
      const data = await res.json() as { id: string };
      toast.success(`${t("postJobSuccess")} (${(elapsed / 1000).toFixed(1)}s)`);
      router.push("/employer/jobs");
    } catch (e) {
      toast.error("Could not post the job. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      {/* Basic */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("postJobTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="title">{t("postJobTrade")} — Job title</Label>
            <Input
              id="title"
              placeholder="e.g. Urgent Electrician — Wiring & Panel Work"
              className="min-h-11"
              {...register("title")}
            />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="tradeId">{t("postJobTrade")}</Label>
              <Controller
                control={control}
                name="tradeId"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(v) => {
                      field.onChange(v);
                      // Clear selected skills when trade changes
                      setValue("skills", []);
                    }}
                  >
                    <SelectTrigger id="tradeId" className="min-h-11 w-full">
                      <SelectValue placeholder="Choose trade" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(grouped).map(([cat, list]) => (
                        <SelectGroup key={cat}>
                          <SelectLabel className="capitalize">{cat}</SelectLabel>
                          {list.map(s => (
                            <SelectItem key={s.id} value={s.id}>{s.nameEn}</SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.tradeId && <p className="text-xs text-destructive">{errors.tradeId.message}</p>}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="headcount">{t("postJobHeadcount")}</Label>
              <Input
                id="headcount" type="number" min={1} max={100}
                className="min-h-11"
                {...register("headcount", { valueAsNumber: true })}
              />
              {errors.headcount && <p className="text-xs text-destructive">{errors.headcount.message}</p>}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="wageMin">{t("postJobWageRange")} — Min (₹/day)</Label>
              <Input
                id="wageMin" type="number" min={0} step={50}
                className="min-h-11"
                {...register("wageMin", { valueAsNumber: true })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="wageMax">Max (₹/day)</Label>
              <Input
                id="wageMax" type="number" min={0} step={50}
                className="min-h-11"
                {...register("wageMax", { valueAsNumber: true })}
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="city">{t("postJobCity")}</Label>
              <Controller
                control={control}
                name="city"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={onCityChange}>
                    <SelectTrigger id="city" className="min-h-11 w-full">
                      <SelectValue placeholder="Choose city" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(CITIES).map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.city && <p className="text-xs text-destructive">{errors.city.message}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="shift">{t("postJobShift")}</Label>
              <Controller
                control={control}
                name="shift"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="shift" className="min-h-11 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any</SelectItem>
                      <SelectItem value="day">Day</SelectItem>
                      <SelectItem value="night">Night</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 rounded-lg border border-accent/40 bg-accent/10 p-4">
            <div className="flex flex-col">
              <Label htmlFor="isUrgent" className="text-base font-semibold flex items-center gap-2">
                <Sparkles className="size-4 text-accent-foreground" />
                {t("postJobUrgent")}
              </Label>
              <p className="text-xs text-muted-foreground mt-1">{t("postJobUrgentHelp")}</p>
            </div>
            <Controller
              control={control}
              name="isUrgent"
              render={({ field }) => (
                <Switch
                  id="isUrgent"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
          </div>
        </CardContent>
      </Card>

      {/* Skills */}
      {tradeId && tradeSkills.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              {t("postJobSkills")}
              <Badge variant="outline" className="text-xs">{selectedSkills.length} selected</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {tradeSkills.map(s => {
                const sel = selectedSkills.find(x => x.skillId === s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleSkill(s.id)}
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm min-h-9 transition-colors ${sel ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-accent/10 border-border"}`}
                    aria-pressed={!!sel}
                  >
                    {sel ? <X className="size-3" /> : <Plus className="size-3" />}
                    {s.nameEn}
                    {sel && (
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => { e.stopPropagation(); toggleRequired(s.id); }}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); toggleRequired(s.id); } }}
                        className={`text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded ${sel.required ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"}`}
                        title="Toggle required"
                      >
                        {sel.required ? "Required" : "Optional"}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Description + AI */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
          <CardTitle className="text-lg">{t("jobDescription")}</CardTitle>
          <Button
            type="button"
            variant="outline"
            onClick={generateDescription}
            disabled={aiBusy || !tradeId || !city}
            className="gap-2 min-h-11 whitespace-normal text-left"
          >
            {aiBusy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4 shrink-0" />}
            <span>{aiBusy ? t("postJobAiWorking") : t("postJobAiDesc")}</span>
          </Button>
        </CardHeader>
        <CardContent className="grid gap-2">
          <Textarea
            placeholder={t("postJobAiEdit")}
            rows={6}
            className="min-h-32"
            {...register("description")}
          />
          {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={submitting} className="min-h-11 gap-2">
          {submitting && <Loader2 className="size-4 animate-spin" />}
          {t("postJobSubmit")}
        </Button>
      </div>
    </form>
  );
}
