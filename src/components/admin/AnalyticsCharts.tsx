"use client";
// Admin analytics section — visual charts fed by GET /api/admin/analytics.
// Master Prompt §32/§33: avoid decorative analytics; restraint over glow. Keep charts
// only where a chart communicates information better than a number/table/bar.
import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, Gauge } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

// Brand palette — aligned with the ShramSetu design tokens (no rainbow).
const PRIMARY = "#12355B";      // --primary navy
const ACCENT = "#D97732";        // --accent orange
const INFO = "#1E4F8B";          // --info navy variant
const POSITIVE = "#238B67";      // --positive green
const WARNING = "#C98A1A";       // --warning amber
const INK_SUBTLE = "#8A949E";     // --ink-subtle

const TIER_COLORS: Record<string, string> = {
  new: INK_SUBTLE,
  id_verified: INFO,
  skill_verified: PRIMARY,
  top_pro: ACCENT,
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
// "2026-08-15" → "15 Aug"
const fmtDay = (iso: string) => {
  const [, m, d] = iso.split("-");
  return `${Number(d)} ${MONTHS[Number(m) - 1]}`;
};

interface AnalyticsData {
  applicationsPerDay: { date: string; count: number }[];
  funnel: { stage: string; count: number }[];
  trustTiers: { tier: string; count: number }[];
  tradeDistribution: { trade: string; workers: number }[];
  urgentShare: { urgent: number; normal: number };
  weeklyHires: { weekLabel: string; hires: number }[];
}

// Minimal shared tooltip — consistent across all four charts.
function ChartTip({
  active,
  payload,
  label,
  unit,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number | string }[];
  label?: string | number;
  unit?: string;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  const name = label !== undefined && label !== "" ? String(label) : item?.name ?? "";
  return (
    <div className="surface-raised shadow-raise rounded-md px-3 py-1.5 text-xs">
      <p className="font-semibold text-ink">{name}</p>
      <p className="text-ink-subtle">
        {item?.value}
        {unit ? ` ${unit}` : ""}
      </p>
    </div>
  );
}

/**
 * AnalyticsCharts — Admin platform analytics.
 * Removed: motion section entrance, primary→accent gradient area fill, saffron gradient
 *   funnel bars, decorative amber Zap icon chip, TrendingUp icon chip.
 * Added: section as plain <section> with h2 + meta sub. Restrained ink-only chart fills,
 *   surface-raised cards with shadow-raise, status-dot on the urgent-of pill.
 */
export function AnalyticsCharts() {
  const { t } = useLanguage();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState(false);

  const TIER_LABELS: Record<string, string> = {
    new: t("passportTierNew"),
    id_verified: t("passportTierIdVerified"),
    skill_verified: t("passportTierSkillVerified"),
    top_pro: t("passportTierTopPro"),
  };
  const STAGE_LABELS: Record<string, string> = {
    applied: t("trackerStageApplied"),
    shortlisted: t("trackerStageShortlisted"),
    interview: t("trackerStageInterview"),
    offer: t("trackerStageOffer"),
    hired: t("trackerStageHired"),
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/admin/analytics", { cache: "no-store" });
        if (!res.ok) throw new Error("fetch failed");
        const json = (await res.json()) as AnalyticsData;
        if (!cancelled) {
          setData(json);
          setError(false);
        }
      } catch {
        if (!cancelled) setError(true);
      }
    };
    setTimeout(load, 0);
    return () => {
      cancelled = true;
    };
  }, []);

  const funnelData =
    data?.funnel.map((f) => ({ stage: STAGE_LABELS[f.stage] ?? f.stage, count: f.count })) ?? [];
  const tiers = data?.trustTiers ?? [];
  const tierTotal = tiers.reduce((s, t) => s + t.count, 0);
  const urgentTotal = data ? data.urgentShare.urgent + data.urgentShare.normal : 0;
  const totalHires = data?.weeklyHires.reduce((s, w) => s + w.hires, 0) ?? 0;

  return (
    <section
      className="flex flex-col gap-4"
      aria-label={t("analyticsTitle")}
    >
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <BarChart3 className="size-5 text-ink-subtle shrink-0" aria-hidden />
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-ink">{t("analyticsTitle")}</h2>
            <p className="text-meta text-ink-subtle">{t("analyticsSub")}</p>
          </div>
        </div>
        {data && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 surface-raised rounded-md px-3 py-1 text-meta text-ink-subtle">
              <span className="status-dot is-warning" aria-hidden />
              {t("analyticsUrgentOf", { urgent: data.urgentShare.urgent, total: urgentTotal })}
            </span>
            <span className="inline-flex items-center gap-1.5 surface-raised rounded-md px-3 py-1 text-meta text-ink-subtle">
              <Gauge className="size-3.5 text-ink-subtle" aria-hidden />
              {t("analyticsHiresWeeks", { count: totalHires })}
            </span>
          </div>
        )}
      </header>

      {error ? (
        <p className="text-sm text-ink-subtle">{t("analyticsUnavailable")}</p>
      ) : !data ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <Card key={i} className="surface-raised shadow-raise gap-3">
              <CardHeader>
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3.5 w-56" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-[232px] w-full rounded-md" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* 1) Applications per day — area chart (restrained ink fill) */}
          <Card className="surface-raised shadow-raise gap-3">
            <CardHeader>
              <CardTitle className="text-sm text-ink">{t("analyticsApplications14d")}</CardTitle>
              <CardDescription className="text-ink-subtle">{t("analyticsApplicationsDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="h-[248px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.applicationsPerDay} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="appsAreaFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={PRIMARY} stopOpacity={0.18} />
                      <stop offset="100%" stopColor={PRIMARY} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={fmtDay}
                    tick={{ fontSize: 10, fill: "var(--ink-subtle)" }}
                    tickLine={false}
                    axisLine={{ stroke: "var(--border)" }}
                    minTickGap={18}
                  />
                  <YAxis
                    allowDecimals={false}
                    width={30}
                    tick={{ fontSize: 10, fill: "var(--ink-subtle)" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<ChartTip unit={t("analyticsApplicationsUnit")} />} cursor={{ stroke: "var(--border)" }} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke={PRIMARY}
                    strokeWidth={2}
                    fill="url(#appsAreaFill)"
                    activeDot={{ r: 4, fill: PRIMARY, stroke: "#fff", strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 2) Hiring funnel — horizontal bars (restrained ink + accent) */}
          <Card className="surface-raised shadow-raise gap-3">
            <CardHeader>
              <CardTitle className="text-sm text-ink">{t("dashFunnel")}</CardTitle>
              <CardDescription className="text-ink-subtle">{t("analyticsFunnelDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="h-[248px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnelData} layout="vertical" margin={{ top: 4, right: 40, left: 4, bottom: 0 }}>
                  <XAxis type="number" allowDecimals={false} hide domain={[0, "dataMax"]} />
                  <YAxis
                    type="category"
                    dataKey="stage"
                    width={78}
                    tick={{ fontSize: 11, fill: "var(--ink-subtle)" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<ChartTip unit={t("analyticsApplicationsUnit")} />} cursor={{ fill: "var(--surface-sunken)", opacity: 0.5 }} />
                  <Bar dataKey="count" fill={ACCENT} radius={[0, 4, 4, 0]} maxBarSize={24}>
                    <LabelList
                      dataKey="count"
                      position="right"
                      style={{ fill: "var(--ink)", fontSize: 11, fontWeight: 600 }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 3) Trust tiers — donut (ink-only palette) */}
          <Card className="surface-raised shadow-raise gap-3">
            <CardHeader>
              <CardTitle className="text-sm text-ink">{t("passportTier")}</CardTitle>
              <CardDescription className="text-ink-subtle">{t("analyticsTrustTiersDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative h-[192px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={tiers}
                      dataKey="count"
                      nameKey="tier"
                      innerRadius={58}
                      outerRadius={84}
                      paddingAngle={2}
                      stroke="var(--surface)"
                      strokeWidth={2}
                    >
                      {tiers.map((tierItem) => (
                        <Cell key={tierItem.tier} fill={TIER_COLORS[tierItem.tier] ?? INK_SUBTLE} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const p = payload[0];
                        const tier = String(p.payload?.tier ?? "");
                        return (
                          <div className="surface-raised shadow-raise rounded-md px-3 py-1.5 text-xs">
                            <p className="font-semibold text-ink">{TIER_LABELS[tier] ?? tier}</p>
                            <p className="text-ink-subtle">
                              {t("analyticsWorkersPct", { count: Number(p.value), pct: tierTotal > 0 ? Math.round((Number(p.value) / tierTotal) * 100) : 0 })}
                            </p>
                          </div>
                        );
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-bold leading-none text-ink">{tierTotal}</span>
                  <span className="text-meta text-ink-subtle">{t("analyticsWorkers")}</span>
                </div>
              </div>
              <ul className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
                {tiers.map((tierItem) => (
                  <li key={tierItem.tier} className="inline-flex items-center gap-1.5 text-xs text-ink-subtle">
                    <span
                      className="size-2.5 rounded-[3px] shrink-0"
                      style={{ backgroundColor: TIER_COLORS[tierItem.tier] ?? INK_SUBTLE }}
                      aria-hidden
                    />
                    {TIER_LABELS[tierItem.tier] ?? tierItem.tier} · {tierItem.count}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* 4) Workers by trade — vertical bars (navy) */}
          <Card className="surface-raised shadow-raise gap-3">
            <CardHeader>
              <CardTitle className="text-sm text-ink">{t("analyticsTrades")}</CardTitle>
              <CardDescription className="text-ink-subtle">{t("analyticsTradesDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="h-[248px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.tradeDistribution} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="trade"
                    interval={0}
                    angle={-28}
                    textAnchor="end"
                    height={54}
                    tick={{ fontSize: 10, fill: "var(--ink-subtle)" }}
                    tickLine={false}
                    axisLine={{ stroke: "var(--border)" }}
                  />
                  <YAxis
                    allowDecimals={false}
                    width={30}
                    tick={{ fontSize: 10, fill: "var(--ink-subtle)" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<ChartTip unit={t("analyticsWorkersUnit")} />} cursor={{ fill: "var(--surface-sunken)", opacity: 0.5 }} />
                  <Bar dataKey="workers" fill={PRIMARY} radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </section>
  );
}
