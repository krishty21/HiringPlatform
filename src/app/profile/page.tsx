"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { AppShell } from "@/components/shared/AppShell";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { WageDisplay } from "@/components/shared/WageDisplay";
import { RatingSummary } from "@/components/ratings/RatingSummary";
import { TrustTimeline } from "@/components/worker/TrustTimeline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { toast } from "sonner";
import {
  ShieldCheck, MapPin, Eye, Briefcase, Share2, Loader2, Save, Check, IdCard,
  Award, Trophy, Clock, ChevronRight, Gauge,
} from "lucide-react";

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

const TRUST_LADDER: ReadonlyArray<WorkerProfileData["trustTier"]> = [
  "new", "id_verified", "skill_verified", "top_pro",
];

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

const TIER_ICON: Record<WorkerProfileData["trustTier"], typeof IdCard> = {
  new: Clock,
  id_verified: IdCard,
  skill_verified: Award,
  top_pro: Trophy,
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

  // Live strength meter — computed from the editable form state + server-side
  // languages/skills/trust data.
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
      toast.success(checked ? t("boardAvailableTodayOn") : t("boardAvailableTodayOff"));
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
    const text = `${t("passportKaamCard")} — ${profile.fullName}\n${tradeName} · ${profile.yearsExp} ${t("passportYears")}\n${profile.city} · ${t("passportTier")}: ${profile.trustTier}\n${t("passportWage")}: ₹${profile.wageMin}-${profile.wageMax}${t("perDay")}`;
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

  // Trust-ladder progression UI (Master Prompt §25):
  // ○ todo   ● current   ✓ done
  const currentIdx = TRUST_LADDER.indexOf(profile.trustTier);

  return (
    <AppShell>
      {/* Page header */}
      <header className="mb-4 flex items-start justify-between gap-3 flex-wrap">
        <div className="flex flex-col gap-1 min-w-0">
          <p className="text-meta uppercase tracking-wider text-ink-subtle">
            {t("passportKaamCard")}
          </p>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-ink text-balance">
            {t("passportTitle")}
          </h1>
        </div>
        <Button
          onClick={shareWhatsApp}
          variant="outline"
          className="gap-2 min-h-11 shrink-0"
        >
          <Share2 className="size-4" aria-hidden />
          {t("passportKaamCardShare")}
        </Button>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        {/* ── Workforce Passport — signature card ─────────────────────────── */}
        <article className="passport-card rounded-md flex flex-col">
          {/* Identity strip — who is this person? */}
          <header className="px-5 py-5 sm:px-6 sm:py-6 border-b border-border flex items-start gap-4 flex-wrap">
            <span
              aria-hidden
              className="size-16 sm:size-20 grid place-items-center rounded-md bg-primary text-primary-foreground text-xl sm:text-2xl font-semibold shrink-0"
            >
              {initials}
            </span>
            <div className="flex-1 min-w-0 flex flex-col gap-1.5">
              <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-ink break-words">
                {profile.fullName}
              </h2>
              <p className="text-meta text-ink-muted flex items-center gap-1.5 flex-wrap">
                <Briefcase className="size-3.5" aria-hidden />
                {tradeName}
                <span aria-hidden>·</span>
                <span>{profile.yearsExp} {t("passportYears")}</span>
                <span aria-hidden>·</span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3.5" aria-hidden />
                  {profile.city}
                </span>
              </p>
              {profile.availableToday && (
                <p className="inline-flex items-center gap-1.5 text-meta font-medium text-positive">
                  <span className="status-dot is-positive" aria-hidden />
                  {t("onboardAvailableToday")}
                </p>
              )}
            </div>
            {profile.passportPublic && (
              <span
                className="passport-stamp inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-meta font-semibold uppercase tracking-wider"
                aria-label={t("kaamCardVerifiedStamp")}
              >
                <ShieldCheck className="size-3.5" aria-hidden />
                {t("kaamCardVerifiedStamp")}
              </span>
            )}
          </header>

          {/* Trust progression ladder — New → ID → Skill → Top Pro */}
          <section className="px-5 py-4 sm:px-6 border-b border-border flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-ink flex items-center gap-1.5">
                <ShieldCheck className="size-4 text-ink-muted" aria-hidden />
                {t("passportTier")}
              </h3>
              <p className="text-meta text-ink-muted tabular-nums">
                {profile.trustScore}/100
              </p>
            </div>
            <ol className="grid grid-cols-4 gap-2" aria-label={t("passportTrustScore")}>
              {([
                ["new", t("passportTierNew")],
                ["id_verified", t("passportTierIdVerified")],
                ["skill_verified", t("passportTierSkillVerified")],
                ["top_pro", t("passportTierTopPro")],
              ] as const).map(([tier, label], i) => {
                const Icon = TIER_ICON[tier];
                const isDone = i < currentIdx;
                const isCurrent = i === currentIdx;
                const isTodo = i > currentIdx;
                return (
                  <li
                    key={tier}
                    className={`flex flex-col items-center gap-1.5 text-center rounded-md border p-2.5 transition-colors ${
                      isDone
                        ? "border-positive/40 bg-positive/5"
                        : isCurrent
                          ? "border-accent/40 bg-accent/5"
                          : "border-border bg-surface-sunken"
                    }`}
                    aria-current={isCurrent ? "step" : undefined}
                  >
                    <span
                      className={`size-7 grid place-items-center rounded-full border-2 ${
                        isDone
                          ? "border-positive bg-positive text-positive-foreground"
                          : isCurrent
                            ? "border-accent bg-accent text-accent-foreground"
                            : "border-border bg-surface text-ink-subtle"
                      }`}
                      aria-hidden
                    >
                      {isDone ? (
                        <Check className="size-3.5" aria-hidden />
                      ) : isCurrent ? (
                        <span className="size-1.5 rounded-full bg-current" aria-hidden />
                      ) : (
                        <Icon className="size-3.5" aria-hidden />
                      )}
                    </span>
                    <span
                      className={`text-meta font-medium leading-tight ${
                        isCurrent ? "text-accent-foreground" : isTodo ? "text-ink-subtle" : "text-ink"
                      }`}
                    >
                      {label}
                    </span>
                  </li>
                );
              })}
            </ol>
          </section>

          {/* Identity / Skills / Reliability — three-layer dl */}
          <section className="px-5 py-4 sm:px-6 border-b border-border">
            <dl className="grid grid-cols-1 sm:grid-cols-3 gap-y-3 gap-x-6">
              <div className="flex flex-col gap-1">
                <dt className="text-meta uppercase tracking-wide text-ink-subtle flex items-center gap-1.5">
                  <IdCard className="size-3.5" aria-hidden />
                  {t("passportTierIdVerified")}
                </dt>
                <dd className="text-sm font-medium text-ink">
                  {profile.trustTier !== "new" ? (
                    <span className="inline-flex items-center gap-1.5 text-positive">
                      <Check className="size-4" aria-hidden />
                      {t("passportTierVerified")}
                    </span>
                  ) : (
                    <span className="text-ink-subtle">{t("passportTierPending")}</span>
                  )}
                </dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="text-meta uppercase tracking-wide text-ink-subtle flex items-center gap-1.5">
                  <Award className="size-3.5" aria-hidden />
                  {t("passportTierSkillVerified")}
                </dt>
                <dd className="text-sm font-medium text-ink">
                  {profile.trustTier === "skill_verified" || profile.trustTier === "top_pro" ? (
                    <span className="inline-flex items-center gap-1.5 text-positive">
                      <Check className="size-4" aria-hidden />
                      {t("passportTierVerified")}
                    </span>
                  ) : (
                    <span className="text-ink-subtle">{t("passportTierPending")}</span>
                  )}
                </dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="text-meta uppercase tracking-wide text-ink-subtle flex items-center gap-1.5">
                  <Gauge className="size-3.5" aria-hidden />
                  {t("passportStrength")}
                </dt>
                <dd className="text-sm font-medium text-ink tabular-nums">
                  {liveStrength}%
                </dd>
              </div>
            </dl>
          </section>

          {/* Editable details — grouped fields, professional labels */}
          <section className="px-5 py-4 sm:px-6 border-b border-border flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-ink">{t("passportExperience")}</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="fullName" className="text-meta text-ink-subtle uppercase tracking-wide">
                  {t("onboardFullName")}
                </Label>
                <Input
                  id="fullName" value={edit.fullName}
                  onChange={e => setEdit(s => ({ ...s, fullName: e.target.value }))}
                  className="min-h-11"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="yearsExp" className="text-meta text-ink-subtle uppercase tracking-wide">
                  {t("onboardYearsExp")}
                </Label>
                <Input
                  id="yearsExp" type="number" min={0} max={50}
                  value={edit.yearsExp}
                  onChange={e => setEdit(s => ({ ...s, yearsExp: e.target.value }))}
                  className="min-h-11"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="city" className="text-meta text-ink-subtle uppercase tracking-wide">
                  {t("onboardCity")}
                </Label>
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
              <div className="grid gap-1.5">
                <Label htmlFor="shift" className="text-meta text-ink-subtle uppercase tracking-wide">
                  {t("onboardShift")}
                </Label>
                <Select
                  value={edit.shiftPref}
                  onValueChange={(v) => setEdit(s => ({ ...s, shiftPref: v as typeof edit.shiftPref }))}
                >
                  <SelectTrigger id="shift" className="min-h-11 w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">{t("shiftAny")}</SelectItem>
                    <SelectItem value="day">{t("shiftDay")}</SelectItem>
                    <SelectItem value="night">{t("shiftNight")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="wageMin" className="text-meta text-ink-subtle uppercase tracking-wide">
                  {t("onboardWageMin")} (₹/day)
                </Label>
                <Input
                  id="wageMin" type="number" min={0} step={50}
                  value={edit.wageMin}
                  onChange={e => setEdit(s => ({ ...s, wageMin: e.target.value }))}
                  className="min-h-11"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="wageMax" className="text-meta text-ink-subtle uppercase tracking-wide">
                  {t("onboardWageMax")} (₹/day)
                </Label>
                <Input
                  id="wageMax" type="number" min={0} step={50}
                  value={edit.wageMax}
                  onChange={e => setEdit(s => ({ ...s, wageMax: e.target.value }))}
                  className="min-h-11"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="photoUrl" className="text-meta text-ink-subtle uppercase tracking-wide">
                  {t("onboardPhotoUrl")} <span className="text-ink-subtle normal-case">({t("optional")})</span>
                </Label>
                <Input
                  id="photoUrl" type="url"
                  value={edit.photoUrl}
                  onChange={e => setEdit(s => ({ ...s, photoUrl: e.target.value }))}
                  className="min-h-11" placeholder="https://…"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="radius" className="text-meta text-ink-subtle uppercase tracking-wide">
                  {t("onboardRadius")}: <span className="text-ink font-medium normal-case">{edit.maxRadiusKm} {t("km")}</span>
                </Label>
                <Input
                  id="radius" type="range" min={1} max={200} step={5}
                  value={edit.maxRadiusKm}
                  onChange={e => setEdit(s => ({ ...s, maxRadiusKm: Number(e.target.value) }))}
                  className="min-h-11"
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="bio" className="text-meta text-ink-subtle uppercase tracking-wide">
                {t("onboardBio")} <span className="text-ink-subtle normal-case">({edit.bio.length}/500)</span>
              </Label>
              <Textarea
                id="bio" rows={4} maxLength={500}
                value={edit.bio}
                onChange={e => setEdit(s => ({ ...s, bio: e.target.value }))}
                className="min-h-24"
              />
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={saveProfileEdits}
                disabled={saving}
                className="gap-2 min-h-11"
              >
                {saving ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <Save className="size-4" aria-hidden />
                )}
                {t("save")}
              </Button>
            </div>
          </section>

          {/* Skills — verified skill list */}
          {profile.skills.length > 0 && (
            <section className="px-5 py-4 sm:px-6 border-b border-border">
              <h3 className="text-sm font-semibold text-ink mb-2">{t("passportSkills")}</h3>
              <dl className="grid gap-2 sm:grid-cols-2">
                {profile.skills.map(s => {
                  const name = s.skill
                    ? (lang === "hi" ? s.skill.nameHi : lang === "te" ? s.skill.nameTe : s.skill.nameEn)
                    : "—";
                  return (
                    <div
                      key={s.skillId}
                      className="surface-inset rounded-md px-3 py-2 flex items-center justify-between gap-2"
                    >
                      <dt className="text-sm font-medium text-ink">{name}</dt>
                      <dd
                        className="inline-flex items-center gap-0.5"
                        aria-label={`Proficiency ${s.proficiency} of 5`}
                      >
                        {Array.from({ length: 5 }).map((_, i) => (
                          <span
                            key={i}
                            aria-hidden
                            className={`size-2 rounded-full ${
                              i < s.proficiency ? "bg-accent" : "bg-border"
                            }`}
                          />
                        ))}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </section>
          )}

          {/* Endorsements — work evidence */}
          {profile.endorsements.length > 0 && (
            <section className="px-5 py-4 sm:px-6">
              <h3 className="text-sm font-semibold text-ink mb-2 flex items-center gap-2">
                {t("passportEndorsements")}
                <span className="text-meta tabular-nums text-ink-subtle">
                  ({profile.endorsements.length})
                </span>
              </h3>
              <ul className="grid gap-2">
                {profile.endorsements.map(e => (
                  <li key={e.id} className="surface-inset rounded-md p-3 flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-ink">{e.companyName}</p>
                      {e.employerVerified && (
                        <span className="trust-pill is-employer">
                          <ShieldCheck className="size-3.5" aria-hidden />
                          {t("feedVerifiedEmployer")}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-ink-muted text-pretty">
                      {e.comment || t("endorsementFallback", { skill: e.skillName })}
                    </p>
                    <p className="text-meta text-ink-subtle">
                      {new Date(e.createdAt).toLocaleDateString()}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </article>

        {/* Side rail — compact status + actions */}
        <aside className="flex flex-col gap-4">
          {/* Compact stat strip — views this week */}
          <section className="surface-raised rounded-md p-4 flex items-center gap-3 shadow-raise">
            <span className="size-9 grid place-items-center rounded-md border border-border bg-surface-sunken text-ink-muted shrink-0">
              <Eye className="size-4" aria-hidden />
            </span>
            <div className="flex flex-col min-w-0">
              <p className="text-2xl font-semibold tabular-nums text-ink leading-none">
                {profile.profileViews}
              </p>
              <p className="text-meta text-ink-muted leading-tight mt-1">
                {t("passportViewsThisWeek")}
              </p>
            </div>
          </section>

          {/* Employer-rating summary */}
          <RatingSummary
            endpoint="/api/ratings/worker"
            userId={profile.id}
            title={t("ratingSummaryWorkerTitle")}
          />

          {/* Trust journey timeline — meaningful, no animation stagger */}
          <TrustTimeline />

          {/* Available-today toggle */}
          <section className="surface-raised rounded-md p-4 flex items-center justify-between gap-3 shadow-raise">
            <div className="flex items-start gap-3 min-w-0">
              <span className="size-9 grid place-items-center rounded-md border border-border bg-surface-sunken text-ink-muted shrink-0">
                <Clock className="size-4" aria-hidden />
              </span>
              <div className="flex flex-col gap-0.5 min-w-0">
                <p className="text-sm font-semibold text-ink">
                  {t("onboardAvailableToday")}
                </p>
                <p className="text-meta text-ink-muted leading-relaxed">
                  {t("visibleToEmployers")}
                </p>
              </div>
            </div>
            <Switch
              id="avail"
              checked={edit.availableToday}
              onCheckedChange={toggleAvailable}
              disabled={saving}
              aria-label={t("onboardAvailableToday")}
            />
          </section>

          {/* Public Kaam Card toggle */}
          <section className="surface-raised rounded-md p-4 flex flex-col gap-2 shadow-raise">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <span className="size-9 grid place-items-center rounded-md border border-border bg-surface-sunken text-ink-muted shrink-0">
                  <ShieldCheck className="size-4" aria-hidden />
                </span>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <p className="text-sm font-semibold text-ink">
                    {t("passportKaamCardToggle")}
                  </p>
                  <p className="text-meta text-ink-muted leading-relaxed">
                    {t("passportKaamCardToggleHelp")}
                  </p>
                </div>
              </div>
              <Switch
                id="pp"
                checked={edit.passportPublic}
                onCheckedChange={togglePassportPublic}
                disabled={saving}
                aria-label={t("passportKaamCardToggle")}
              />
            </div>
            {profile.passportPublic && (
              <Link
                href={`/c/${profile.id}`}
                className="mt-1 inline-flex items-center justify-center gap-1.5 min-h-11 px-4 rounded-md border border-border bg-surface text-sm font-medium text-ink hover:bg-surface-sunken transition-colors"
              >
                {t("kaamCardPublicBadge")}
                <ChevronRight className="size-4" aria-hidden />
              </Link>
            )}
          </section>

          {/* Verify-now prompt — credential infrastructure, not gaming */}
          <section className="surface-inset rounded-md p-4 flex flex-col gap-2">
            <p className="text-sm font-semibold text-ink flex items-center gap-1.5">
              <ShieldCheck className="size-4 text-ink-muted" aria-hidden />
              {t("passportVerifyNow")}
            </p>
            <p className="text-meta text-ink-muted leading-relaxed">
              {t("verifyPiiNote")}
            </p>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="mt-2 gap-1.5 min-h-11 w-full"
            >
              <Link href="/verify">
                {t("passportUploadCert")}
                <ChevronRight className="size-4" aria-hidden />
              </Link>
            </Button>
          </section>
        </aside>
      </div>
    </AppShell>
  );
}
