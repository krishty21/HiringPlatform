"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { AppShell } from "@/components/shared/AppShell";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { TrustTierBadge } from "@/components/shared/TrustTierBadge";
import { WageDisplay } from "@/components/shared/WageDisplay";
import { StatCard } from "@/components/shared/StatCard";
import { RatingSummary } from "@/components/ratings/RatingSummary";
import { TrustTimeline } from "@/components/worker/TrustTimeline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { toast } from "sonner";
import {
  ShieldCheck, Star, MapPin, Zap, Eye, Briefcase, Share2, Loader2, Save, Sparkles, Check,
} from "lucide-react";

const TRUST_LADDER = ["new", "id_verified", "skill_verified", "top_pro"] as const;

interface WorkerProfileData {
  id: string;
  fullName: string;
  tradeId: string | null;
  trade?: { id: string; nameEn: string; nameHi: string; nameTe: string; category: string } | null;
  yearsExp: number;
  city: string;
  lat: number;
  lng: number;
  wageMin: number;
  wageMax: number;
  shiftPref: "day" | "night" | "any";
  languages: string[];
  bio: string;
  photoUrl: string | null;
  availableToday: boolean;
  trustTier: "new" | "id_verified" | "skill_verified" | "top_pro";
  trustScore: number;
  passportPublic: boolean;
  profileViews: number;
  maxRadiusKm: number;
  profileStrength: number;
  skills: { skillId: string; proficiency: number; skill: { id: string; nameEn: string; nameHi: string; nameTe: string; category: string } }[];
  endorsements: {
    id: string;
    comment: string;
    createdAt: string;
    skillName: string;
    companyName: string;
    employerVerified: boolean;
  }[];
}

const CITIES = [
  "Bhimavaram", "Tadepalligudem", "Rajahmundry", "Vijayawada",
  "Visakhapatnam", "Kakinada", "Hyderabad", "Guntur", "Nellore", "Tirupati",
];

const CITY_LATLNG: Record<string, { lat: number; lng: number }> = {
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

export default function WorkerProfilePage() {
  const { t, lang } = useLanguage();
  const [profile, setProfile] = useState<WorkerProfileData | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [edit, setEdit] = useState({
    fullName: "",
    yearsExp: "0",
    city: "",
    wageMin: "0",
    wageMax: "0",
    shiftPref: "any" as "day" | "night" | "any",
    bio: "",
    photoUrl: "",
    maxRadiusKm: 20,
    availableToday: false,
    passportPublic: true,
  });

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/worker/profile", { cache: "no-store" });
      if (res.status === 403 || res.status === 404) {
        setNotFound(true);
        return;
      }
      if (!res.ok) return;
      const data = (await res.json()) as WorkerProfileData;
      setProfile(data);
      setEdit({
        fullName: data.fullName,
        yearsExp: String(data.yearsExp),
        city: data.city,
        wageMin: String(data.wageMin),
        wageMax: String(data.wageMax),
        shiftPref: data.shiftPref,
        bio: data.bio,
        photoUrl: data.photoUrl ?? "",
        maxRadiusKm: data.maxRadiusKm,
        availableToday: data.availableToday,
        passportPublic: data.passportPublic,
      });
    } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);

  // Live strength meter
  const liveStrength = useMemo(() => {
    if (!profile) return 0;
    const has = (b: boolean) => (b ? 1 : 0);
    const filled =
      has(!!edit.fullName) +
      has(Number(edit.yearsExp) > 0) +
      has(!!edit.city) +
      has(Number(edit.wageMin) > 0 || Number(edit.wageMax) > 0) +
      has(!!edit.shiftPref) +
      has(profile.languages.length > 0) +
      has(!!edit.bio && edit.bio.length > 0);
    let s = 30 + 10 * filled;
    s += Math.min(25, 5 * profile.skills.length);
    if (edit.bio && edit.bio.length > 50) s += 10;
    if (edit.photoUrl) s += 10;
    if (profile.trustTier !== "new") s += 10;
    return Math.min(100, s);
  }, [profile, edit]);

  async function saveField(field: string, value: unknown) {
    setSaving(true);
    try {
      const res = await fetch("/api/worker/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      if (!res.ok) throw new Error("save-failed");
      await load();
      toast.success(t("save"));
    } catch {
      toast.error(t("errGeneric"));
    } finally {
      setSaving(false);
    }
  }

  async function toggleAvailable(checked: boolean) {
    setEdit(e => ({ ...e, availableToday: checked }));
    setSaving(true);
    try {
      const res = await fetch("/api/worker/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ availableToday: checked }),
      });
      if (!res.ok) throw new Error("save-failed");
      toast.success(checked ? "Available today on" : "Available today off");
      await load();
    } catch {
      setEdit(e => ({ ...e, availableToday: !checked }));
      toast.error(t("errGeneric"));
    } finally {
      setSaving(false);
    }
  }

  async function togglePassportPublic(checked: boolean) {
    setEdit(e => ({ ...e, passportPublic: checked }));
    setSaving(true);
    try {
      const res = await fetch("/api/worker/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ passportPublic: checked }),
      });
      if (!res.ok) throw new Error("save-failed");
      toast.success(t("save"));
      await load();
    } catch {
      setEdit(e => ({ ...e, passportPublic: !checked }));
      toast.error(t("errGeneric"));
    } finally {
      setSaving(false);
    }
  }

  async function saveProfileEdits() {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        fullName: edit.fullName,
        yearsExp: Number(edit.yearsExp) || 0,
        city: edit.city,
        wageMin: Number(edit.wageMin) || 0,
        wageMax: Number(edit.wageMax) || 0,
        shiftPref: edit.shiftPref,
        bio: edit.bio,
        photoUrl: edit.photoUrl || null,
        maxRadiusKm: edit.maxRadiusKm,
      };
      if (CITY_LATLNG[edit.city]) {
        body.lat = CITY_LATLNG[edit.city].lat;
        body.lng = CITY_LATLNG[edit.city].lng;
      }
      const res = await fetch("/api/worker/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("save-failed");
      toast.success(t("save"));
      await load();
    } catch {
      toast.error(t("errGeneric"));
    } finally {
      setSaving(false);
    }
  }

  function shareWhatsApp() {
    if (!profile) return;
    const tradeName = profile.trade
      ? (lang === "hi" ? profile.trade.nameHi : lang === "te" ? profile.trade.nameTe : profile.trade.nameEn)
      : "Worker";
    const text = `🪪 ${t("passportKaamCard")} — ${profile.fullName}\n${tradeName} · ${profile.yearsExp} ${t("passportYears")}\n${profile.city} · ${t("passportTier")}: ${profile.trustTier}\n${t("passportWage")}: ₹${profile.wageMin}-${profile.wageMax}${t("perDay")}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  if (notFound) {
    return (
      <AppShell>
        <EmptyState
          icon={ShieldCheck}
          title={t("errNotFound")}
          description={t("onboardTitle")}
          action={<Button asChild><Link href="/onboarding/worker">{t("onboardSubmit")}</Link></Button>}
        />
      </AppShell>
    );
  }

  if (!profile) {
    return (
      <AppShell>
        <LoadingSkeleton count={4} />
      </AppShell>
    );
  }

  const initials = profile.fullName.split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase();
  const tradeName = profile.trade
    ? (lang === "hi" ? profile.trade.nameHi : lang === "te" ? profile.trade.nameTe : profile.trade.nameEn)
    : "—";

  return (
    <AppShell>
      <header className="mb-4 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("passportTitle")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("passportKaamCard")}</p>
        </div>
        <Button onClick={shareWhatsApp} variant="outline" className="gap-2 min-h-11">
          <Share2 className="size-4" />
          {t("passportKaamCardShare")}
        </Button>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        {/* Skill Passport card */}
        <Card className="passport-card">
          <CardContent className="p-6 flex flex-col gap-4">
            <div className="flex items-start gap-4">
              <Avatar className="size-16 border-2 border-primary/30">
                {profile.photoUrl ? (
                  <img src={profile.photoUrl} alt={profile.fullName} className="size-full object-cover" />
                ) : (
                  <AvatarFallback className="text-lg font-bold bg-primary/5 text-primary">{initials}</AvatarFallback>
                )}
              </Avatar>
              <div className="flex-1">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <h2 className="text-xl font-bold tracking-tight">{profile.fullName}</h2>
                    <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                      <Briefcase className="size-3.5" />
                      {tradeName} · {profile.yearsExp} {t("passportYears")}
                    </p>
                  </div>
                  <TrustTierBadge tier={profile.trustTier} score={profile.trustScore} size="lg" />
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {profile.availableToday && (
                    <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-300 gap-1 text-xs">
                      <Zap className="size-3" />
                      {t("today")}
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-xs gap-1">
                    <MapPin className="size-3" />
                    {profile.city}
                  </Badge>
                  <Badge variant="outline" className="text-xs gap-1">
                    <Eye className="size-3" />
                    {profile.profileViews} views
                  </Badge>
                </div>
              </div>
            </div>

            <Separator />

            {/* Trust tier ladder — New → ID Verified → Skill Verified → Top Pro */}
            <div className="grid gap-2 rounded-lg border border-border bg-card/50 p-3" aria-label={`${t("passportTier")}: ${profile.trustScore}/100`}>
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold flex items-center gap-1.5">
                  <ShieldCheck className="size-3.5 text-primary" />
                  {t("passportTier")}
                </span>
                <span className="tabular-nums font-bold">{profile.trustScore}/100 · {t("passportTrustScore")}</span>
              </div>
              <ol className="flex items-center gap-0" aria-hidden>
                {([
                  ["new", t("passportTierNew")],
                  ["id_verified", t("passportTierIdVerified")],
                  ["skill_verified", t("passportTierSkillVerified")],
                  ["top_pro", t("passportTierTopPro")],
                ] as const).map(([tier, label], i) => {
                  const currentIdx = TRUST_LADDER.indexOf(profile.trustTier);
                  const state = i < currentIdx ? "done" : i === currentIdx ? "current" : "todo";
                  return (
                    <li key={tier} className="flex-1 flex flex-col items-center gap-1.5 last:flex-none">
                      <div className="flex items-center w-full">
                        {i > 0 && (
                          <span className={`h-0.5 flex-1 mx-0.5 rounded-full ${i <= currentIdx ? "bg-primary/60" : "bg-border"}`} />
                        )}
                        <span
                          className={`size-6 rounded-full grid place-items-center border-2 text-[10px] font-bold transition-colors ${
                            state === "done"
                              ? "bg-primary border-primary text-primary-foreground"
                              : state === "current"
                                ? "bg-accent/15 border-accent text-accent-foreground ring-4 ring-accent/15"
                                : "bg-muted/50 border-border text-muted-foreground/60"
                          }`}
                        >
                          {state === "done" ? <Check className="size-3" /> : i + 1}
                        </span>
                        {i < 3 && (
                          <span className={`h-0.5 flex-1 mx-0.5 rounded-full ${i < currentIdx ? "bg-primary/60" : "bg-border"}`} />
                        )}
                      </div>
                      <span
                        className={`text-[10px] font-medium text-center leading-tight ${
                          state === "current" ? "text-accent-foreground" : "text-muted-foreground"
                        } ${i === 3 ? "whitespace-nowrap" : ""}`}
                      >
                        {label}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </div>

            {/* Strength meter — live (WRK-04) */}
            <div className="grid gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold flex items-center gap-1.5">
                  <Sparkles className="size-3.5" />
                  {t("passportStrength")}
                </span>
                <span className="tabular-nums">{liveStrength}%</span>
              </div>
              <Progress value={liveStrength} className="h-2" />
            </div>

            <Separator />

            {/* Editable fields */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="fullName">{t("onboardFullName")}</Label>
                <Input
                  id="fullName" value={edit.fullName}
                  onChange={e => setEdit(s => ({ ...s, fullName: e.target.value }))}
                  className="min-h-11"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="yearsExp">{t("onboardYearsExp")}</Label>
                <Input
                  id="yearsExp" type="number" min={0} max={50}
                  value={edit.yearsExp}
                  onChange={e => setEdit(s => ({ ...s, yearsExp: e.target.value }))}
                  className="min-h-11"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="city">{t("onboardCity")}</Label>
                <Select
                  value={edit.city}
                  onValueChange={(v) => setEdit(s => ({ ...s, city: v }))}
                >
                  <SelectTrigger id="city" className="min-h-11 w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CITIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="shift">{t("onboardShift")}</Label>
                <Select
                  value={edit.shiftPref}
                  onValueChange={(v) => setEdit(s => ({ ...s, shiftPref: v as typeof edit.shiftPref }))}
                >
                  <SelectTrigger id="shift" className="min-h-11 w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="day">Day</SelectItem>
                    <SelectItem value="night">Night</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="wageMin">{t("onboardWageMin")} (₹/day)</Label>
                <Input
                  id="wageMin" type="number" min={0} step={50}
                  value={edit.wageMin}
                  onChange={e => setEdit(s => ({ ...s, wageMin: e.target.value }))}
                  className="min-h-11"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="wageMax">{t("onboardWageMax")} (₹/day)</Label>
                <Input
                  id="wageMax" type="number" min={0} step={50}
                  value={edit.wageMax}
                  onChange={e => setEdit(s => ({ ...s, wageMax: e.target.value }))}
                  className="min-h-11"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="photoUrl">Photo URL <span className="text-xs text-muted-foreground">({t("optional")})</span></Label>
                <Input
                  id="photoUrl" type="url"
                  value={edit.photoUrl}
                  onChange={e => setEdit(s => ({ ...s, photoUrl: e.target.value }))}
                  className="min-h-11" placeholder="https://…"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="radius">{t("onboardRadius")}: <span className="font-semibold">{edit.maxRadiusKm} {t("km")}</span></Label>
                <Input
                  id="radius" type="range" min={1} max={200} step={5}
                  value={edit.maxRadiusKm}
                  onChange={e => setEdit(s => ({ ...s, maxRadiusKm: Number(e.target.value) }))}
                  className="min-h-11"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="bio">{t("onboardBio")} <span className="text-xs text-muted-foreground">({edit.bio.length}/500)</span></Label>
              <Textarea
                id="bio" rows={4} maxLength={500}
                value={edit.bio}
                onChange={e => setEdit(s => ({ ...s, bio: e.target.value }))}
                className="min-h-24"
              />
            </div>

            <div className="flex items-center gap-2">
              <Button onClick={saveProfileEdits} disabled={saving} className="gap-2 min-h-11">
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                {t("save")}
              </Button>
            </div>

            <Separator />

            {/* Skills (read-only display) */}
            {profile.skills.length > 0 && (
              <div>
                <h3 className="font-semibold text-sm mb-2">{t("passportSkills")}</h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {profile.skills.map(s => {
                    const name = s.skill
                      ? (lang === "hi" ? s.skill.nameHi : lang === "te" ? s.skill.nameTe : s.skill.nameEn)
                      : "—";
                    return (
                      <div key={s.skillId} className="flex items-center justify-between gap-2 rounded-md border border-border bg-card/50 px-3 py-2">
                        <span className="text-sm font-medium">{name}</span>
                        <div className="flex items-center gap-1" aria-label={`Proficiency ${s.proficiency} of 5`}>
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`size-3 ${i < s.proficiency ? "fill-accent text-accent-foreground" : "text-muted-foreground/30"}`}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Endorsements */}
            {profile.endorsements.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <Star className="size-4 text-accent-foreground" />
                    {t("passportEndorsements")}
                    <Badge variant="outline" className="text-xs">{profile.endorsements.length}</Badge>
                  </h3>
                  <div className="grid gap-2">
                    {profile.endorsements.map(e => (
                      <div key={e.id} className="rounded-md border border-accent/30 bg-accent/5 p-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold">{e.companyName}</span>
                          {e.employerVerified && (
                            <Badge variant="outline" className="text-[10px] bg-emerald-100 text-emerald-800 border-emerald-300">{t("feedVerifiedEmployer")}</Badge>
                          )}
                        </div>
                        <p className="text-sm mt-1">{e.comment || `"Skilled in ${e.skillName}."`}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {new Date(e.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Side rail */}
        <aside className="flex flex-col gap-4">
          <StatCard
            label={t("passportViewsThisWeek")}
            value={profile.profileViews}
            icon={Eye}
            tone="accent"
          />

          {/* Worker's employer-rating summary (R16) — avg rating received from employers */}
          <RatingSummary
            endpoint="/api/ratings/worker"
            userId={profile.id}
            title={t("ratingSummaryWorkerTitle")}
          />

          {/* Round 9: Trust journey timeline — derived from verification events */}
          <TrustTimeline />

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="size-4 text-emerald-700" />
                {t("onboardAvailableToday")}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-3">
              <Label htmlFor="avail" className="text-sm text-muted-foreground">Visible to employers now</Label>
              <Switch
                id="avail"
                checked={edit.availableToday}
                onCheckedChange={toggleAvailable}
                disabled={saving}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="size-4 text-primary" />
                {t("passportKaamCardToggle")}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="pp" className="text-sm text-muted-foreground">{t("passportKaamCardToggleHelp")}</Label>
                <Switch
                  id="pp"
                  checked={edit.passportPublic}
                  onCheckedChange={togglePassportPublic}
                  disabled={saving}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-dashed bg-muted/30">
            <CardContent className="p-4 flex flex-col gap-2">
              <p className="text-xs font-semibold flex items-center gap-1.5">
                <Star className="size-3.5 text-accent-foreground" />
                {t("passportVerifyNow")}
              </p>
              <p className="text-xs text-muted-foreground">{t("verifyPiiNote")}</p>
              <Button asChild variant="outline" size="sm" className="mt-2 gap-1.5 min-h-11 w-full">
                <Link href="/onboarding/worker">{t("passportUploadCert")}</Link>
              </Button>
            </CardContent>
          </Card>
        </aside>
      </div>
    </AppShell>
  );
}
