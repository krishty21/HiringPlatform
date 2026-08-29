"use client";
import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/shared/AppShell";
import { TradeGrid } from "@/components/worker/TradeGrid";
import { VoiceButton } from "@/components/worker/VoiceButton";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem, SelectGroup, SelectLabel,
} from "@/components/ui/select";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { toast } from "sonner";
import { Loader2, ChevronLeft, ChevronRight, Sparkles, Check } from "lucide-react";
import type { Skill, VoiceProfileJSON } from "@/lib/schemas";

const CITIES: Record<string, { lat: number; lng: number }> = {
  Bhimavaram: { lat: 16.5417, lng: 81.5233 },
  Tadepalligudem: { lat: 16.8317, lng: 81.5172 },
  Rajahmundry: { lat: 17.0005, lng: 81.8080 },
  Vijayawada: { lat: 16.5062, lng: 80.6480 },
  Visakhapatnam: { lat: 17.6868, lng: 83.2185 },
  Kakinada: { lat: 16.9600, lng: 82.2377 },
  Hyderabad: { lat: 17.3850, lng: 78.4867 },
  Guntur: { lat: 16.3067, lng: 80.4365 },
  Nellore: { lat: 14.4426, lng: 79.9865 },
  Tirupati: { lat: 13.6288, lng: 79.4192 },
};

type Step = 0 | 1 | 2;

interface FormState {
  tradeId: string;
  fullName: string;
  yearsExp: string;
  city: string;
  lat: number;
  lng: number;
  languages: ("en" | "hi" | "te")[];
  bio: string;
  photoUrl: string;
  wageMin: string;
  wageMax: string;
  shiftPref: "day" | "night" | "any";
  maxRadiusKm: number;
  availableToday: boolean;
  skills: { skillId: string; proficiency: number }[];
}

const DEFAULTS: FormState = {
  tradeId: "",
  fullName: "",
  yearsExp: "",
  city: "",
  lat: 16.5,
  lng: 81.5,
  languages: [],
  bio: "",
  photoUrl: "",
  wageMin: "",
  wageMax: "",
  shiftPref: "any",
  maxRadiusKm: 20,
  availableToday: false,
  skills: [],
};

export function computeOnboardStrength(f: FormState): number {
  const has = (b: boolean) => (b ? 1 : 0);
  const filled =
    has(!!f.tradeId) +
    has(Number(f.yearsExp) > 0) +
    has(!!f.city) +
    has(Number(f.wageMin) > 0 || Number(f.wageMax) > 0) +
    has(f.languages.length > 0) +
    has(f.shiftPref.length > 0) +
    has(!!f.bio && f.bio.length > 0);
  let s = 30 + 10 * filled;
  s += Math.min(25, 5 * f.skills.length);
  if (f.bio && f.bio.length > 50) s += 10;
  if (f.photoUrl) s += 10;
  // verified: false in onboarding (new profile)
  return Math.min(100, s);
}

export default function WorkerOnboardingPage() {
  const { t, lang } = useLanguage();
  const router = useRouter();
  const [skills, setSkills] = useState<Skill[] | null>(null);
  const [step, setStep] = useState<Step>(0);
  const [form, setForm] = useState<FormState>(DEFAULTS);
  const [submitting, setSubmitting] = useState(false);
  const [voiceBusy, setVoiceBusy] = useState(false);

  useEffect(() => {
    fetch("/api/skills")
      .then(r => r.json())
      .then((data: { items: Skill[] }) => setSkills(data.items ?? []))
      .catch(() => setSkills([]));
  }, []);

  const update = useCallback(<K extends keyof FormState>(key: K, v: FormState[K]) => {
    setForm(prev => ({ ...prev, [key]: v }));
  }, []);

  const strength = useMemo(() => computeOnboardStrength(form), [form]);

  // Filter "trade skills" for step 1 (top-level trade names; e.g. categories match a primary trade)
  const tradeSkills = useMemo(() => {
    if (!skills) return [];
    // The seed has 8 trade rows whose nameEn matches the directive's trade keyword map
    const TRADE_NAMES = new Set(["Electrician", "Plumber", "Welder", "CNC Operator", "Fitter", "Delivery Executive", "Carpenter", "Mason"]);
    return skills.filter(s => TRADE_NAMES.has(s.nameEn));
  }, [skills]);

  // Skills related to the selected trade (same category)
  const relatedSkills = useMemo(() => {
    if (!skills || !form.tradeId) return [];
    const trade = skills.find(s => s.id === form.tradeId);
    if (!trade) return [];
    return skills.filter(s => s.category === trade.category && s.id !== trade.id);
  }, [skills, form.tradeId]);

  function toggleSkill(skillId: string) {
    const exists = form.skills.find(s => s.skillId === skillId);
    const next = exists
      ? form.skills.filter(s => s.skillId !== skillId)
      : [...form.skills, { skillId, proficiency: 3 }];
    update("skills", next);
  }

  function setProficiency(skillId: string, proficiency: number) {
    const next = form.skills.map(s => s.skillId === skillId ? { ...s, proficiency } : s);
    update("skills", next);
  }

  function toggleLanguage(code: "en" | "hi" | "te") {
    const exists = form.languages.includes(code);
    update("languages", exists ? form.languages.filter(l => l !== code) : [...form.languages, code]);
  }

  function onCityChange(city: string) {
    const c = CITIES[city];
    setForm(prev => ({ ...prev, city, lat: c?.lat ?? prev.lat, lng: c?.lng ?? prev.lng }));
  }

  // Voice flow: send transcript → AI → prefill form (stay on or jump to step 1 if user is on step 0)
  const handleTranscript = useCallback(async (transcript: string) => {
    setVoiceBusy(true);
    try {
      const res = await fetch("/api/ai/voice-profile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ transcript, lang }),
      });
      if (!res.ok) throw new Error("voice-failed");
      const data = (await res.json()) as VoiceProfileJSON;
      applyVoiceResult(data);
      toast.success(t("onboardVoiceConfirm"));
      // Jump to step 2 (wage/shift) so the user can review everything
      if (step === 0) setStep(1);
    } catch {
      toast.error(t("errGeneric"));
    } finally {
      setVoiceBusy(false);
    }
  }, [lang, step, t]);

  function applyVoiceResult(r: VoiceProfileJSON) {
    setForm(prev => {
      const next = { ...prev };
      // Match trade by nameEn
      if (r.trade && skills) {
        const skill = skills.find(s => s.nameEn === r.trade);
        if (skill) next.tradeId = skill.id;
      }
      if (typeof r.yearsExp === "number") next.yearsExp = String(r.yearsExp);
      if (typeof r.wageMin === "number") next.wageMin = String(r.wageMin);
      if (typeof r.wageMax === "number") next.wageMax = String(r.wageMax);
      if (r.city && CITIES[r.city]) {
        next.city = r.city;
        next.lat = CITIES[r.city].lat;
        next.lng = CITIES[r.city].lng;
      }
      if (r.bio) next.bio = r.bio;
      if (r.languages && r.languages.length > 0) next.languages = r.languages;
      return next;
    });
  }

  function canAdvance(): boolean {
    if (step === 0) return !!form.tradeId;
    if (step === 1) {
      return form.fullName.trim().length >= 2
        && Number(form.yearsExp) >= 0
        && !!form.city
        && form.languages.length > 0;
    }
    return true;
  }

  async function submit() {
    if (Number(form.wageMin) > Number(form.wageMax)) {
      toast.error(t("errValidation"));
      return;
    }
    setSubmitting(true);
    try {
      const body = {
        fullName: form.fullName.trim(),
        tradeId: form.tradeId,
        yearsExp: Number(form.yearsExp) || 0,
        city: form.city,
        lat: form.lat,
        lng: form.lng,
        wageMin: Number(form.wageMin) || 0,
        wageMax: Number(form.wageMax) || 0,
        shiftPref: form.shiftPref,
        languages: form.languages,
        bio: form.bio,
        photoUrl: form.photoUrl || null,
        availableToday: form.availableToday,
        maxRadiusKm: form.maxRadiusKm,
        skills: form.skills,
      };
      const res = await fetch("/api/onboarding/worker", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "VALIDATION" }));
        throw new Error(err.error ?? "SUBMIT_FAILED");
      }
      toast.success(t("onboardSuccess"));
      router.push("/home");
    } catch {
      toast.error(t("errGeneric"));
    } finally {
      setSubmitting(false);
    }
  }

  if (!skills) {
    return (
      <AppShell>
        <LoadingSkeleton count={3} />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <header className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight">{t("onboardTitle")}</h1>
        <p className="text-sm text-muted-foreground mt-1">3 {t("onboardStep").toLowerCase()}s · &lt;3 min</p>
      </header>

      {/* Progress */}
      <div className="grid gap-2 mb-6">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{t("onboardStep")} {step + 1} {t("onboardOf")} 3</span>
          <span>{strength}%</span>
        </div>
        <Progress value={(step + 1) * 33} className="h-1.5" />
        <ol className="grid grid-cols-3 gap-2 mt-2">
          {[t("onboardStep1Title"), t("onboardStep2Title"), t("onboardStep3Title")].map((label, idx) => (
            <li key={idx} className={`text-center text-xs font-medium px-2 py-1.5 rounded-lg border ${idx === step ? "bg-primary text-primary-foreground border-primary" : idx < step ? "bg-accent/20 text-accent-foreground border-accent/40" : "bg-card text-muted-foreground border-border"}`}>
              {label}
            </li>
          ))}
        </ol>
      </div>

      {/* Voice (only on first two steps) */}
      {step < 2 && (
        <div className="mb-4">
          <VoiceButton lang={lang} onTranscript={handleTranscript} />
          {voiceBusy && <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5"><Loader2 className="size-3 animate-spin" /> {t("loading")}</p>}
        </div>
      )}

      {/* Step 1: Trade grid */}
      {step === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("onboardStep1Title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <TradeGrid
              skills={tradeSkills}
              selected={form.tradeId || null}
              onSelect={(id) => {
                update("tradeId", id);
                // Reset chosen sub-skills when trade changes
                update("skills", []);
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* Step 2: Details */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("onboardStep2Title")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="fullName">{t("onboardFullName")}</Label>
              <Input id="fullName" value={form.fullName} onChange={e => update("fullName", e.target.value)} className="min-h-11" placeholder="e.g. Ravi Kumar" />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="yearsExp">{t("onboardYearsExp")}</Label>
                <Input id="yearsExp" type="number" min={0} max={50} value={form.yearsExp} onChange={e => update("yearsExp", e.target.value)} className="min-h-11" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="city">{t("onboardCity")}</Label>
                <Select value={form.city} onValueChange={onCityChange}>
                  <SelectTrigger id="city" className="min-h-11 w-full"><SelectValue placeholder={t("chooseCity")} /></SelectTrigger>
                  <SelectContent>
                    {Object.keys(CITIES).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>{t("onboardLanguages")}</Label>
              <div className="flex flex-wrap gap-2">
                {([["en","English"],["hi","हिन्दी"],["te","తెలుగు"]] as const).map(([code, label]) => {
                  const active = form.languages.includes(code);
                  return (
                    <button
                      key={code}
                      type="button"
                      onClick={() => toggleLanguage(code)}
                      aria-pressed={active}
                      className={`px-3 py-1.5 rounded-full border min-h-9 text-sm transition-colors ${active ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-accent/10 border-border"}`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="bio">{t("onboardBio")} <span className="text-xs text-muted-foreground">({form.bio.length}/500)</span></Label>
              <Textarea id="bio" rows={4} maxLength={500} value={form.bio} onChange={e => update("bio", e.target.value)} className="min-h-24" placeholder={t("onboardBioPlaceholder")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="photoUrl">Photo URL <span className="text-xs text-muted-foreground">({t("optional")})</span></Label>
              <Input id="photoUrl" type="url" value={form.photoUrl} onChange={e => update("photoUrl", e.target.value)} className="min-h-11" placeholder="https://…" />
            </div>
            {relatedSkills.length > 0 && (
              <div className="grid gap-2">
                <Label className="flex items-center gap-2">{t("onboardSkills")} <Badge variant="outline" className="text-[10px]">{form.skills.length}</Badge></Label>
                <div className="flex flex-wrap gap-2">
                  {relatedSkills.map(s => {
                    const sel = form.skills.find(x => x.skillId === s.id);
                    const name = lang === "hi" ? s.nameHi : lang === "te" ? s.nameTe : s.nameEn;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => toggleSkill(s.id)}
                        aria-pressed={!!sel}
                        className={`px-3 py-1.5 rounded-full border min-h-9 text-sm transition-colors ${sel ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-accent/10 border-border"}`}
                      >
                        {name}
                        {sel && (
                          <Select
                            value={String(sel.proficiency)}
                            onValueChange={(v) => setProficiency(s.id, Number(v))}
                          >
                            <SelectTrigger className="ml-2 h-6 w-14 inline-flex px-1 py-0 min-h-6 text-[10px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {[1,2,3,4,5].map(n => <SelectItem key={n} value={String(n)}>{n}/5</SelectItem>)}
                            </SelectContent>
                          </Select>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3: Wage + shift prefs */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("onboardStep3Title")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="wageMin">{t("onboardWageMin")} (₹/day)</Label>
                <Input id="wageMin" type="number" min={0} step={50} value={form.wageMin} onChange={e => update("wageMin", e.target.value)} className="min-h-11" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="wageMax">{t("onboardWageMax")} (₹/day)</Label>
                <Input id="wageMax" type="number" min={0} step={50} value={form.wageMax} onChange={e => update("wageMax", e.target.value)} className="min-h-11" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="shift">{t("onboardShift")}</Label>
              <Select value={form.shiftPref} onValueChange={(v) => update("shiftPref", v as FormState["shiftPref"])}>
                <SelectTrigger id="shift" className="min-h-11 w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">{t("shiftAny")}</SelectItem>
                  <SelectItem value="day">{t("shiftDay")}</SelectItem>
                  <SelectItem value="night">{t("shiftNight")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label className="text-sm">{t("onboardRadius")}: <span className="font-semibold">{form.maxRadiusKm} {t("km")}</span></Label>
              <Slider value={[form.maxRadiusKm]} min={1} max={200} step={5} onValueChange={(v) => update("maxRadiusKm", v[0] ?? 20)} className="mt-2" />
            </div>
            <div className="flex items-center justify-between gap-3 rounded-lg border border-emerald-300/40 bg-emerald-50 px-3 py-2.5">
              <Label htmlFor="availableToday" className="text-sm font-medium flex items-center gap-2">
                <Sparkles className="size-4 text-emerald-700" />
                {t("onboardAvailableToday")}
              </Label>
              <Switch id="availableToday" checked={form.availableToday} onCheckedChange={(v) => update("availableToday", v)} />
            </div>

            {/* Strength meter */}
            <div className="grid gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold flex items-center gap-1.5"><Sparkles className="size-3.5" /> {t("passportStrength")}</span>
                <span className="tabular-nums">{strength}%</span>
              </div>
              <Progress value={strength} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Footer nav */}
      <div className="flex items-center justify-between mt-6">
        <Button
          type="button"
          variant="ghost"
          onClick={() => setStep(s => Math.max(0, s - 1) as Step)}
          disabled={step === 0 || submitting}
          className="gap-1"
        >
          <ChevronLeft className="size-4" />
          {t("back")}
        </Button>
        {step < 2 ? (
          <Button
            type="button"
            onClick={() => setStep(s => Math.min(2, s + 1) as Step)}
            disabled={!canAdvance() || voiceBusy}
            className="gap-2"
          >
            {t("continue")}
            <ChevronRight className="size-4" />
          </Button>
        ) : (
          <Button
            type="button"
            onClick={submit}
            disabled={submitting || !canAdvance()}
            className="gap-2"
          >
            {submitting ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            {t("onboardSubmit")}
          </Button>
        )}
      </div>
    </AppShell>
  );
}
