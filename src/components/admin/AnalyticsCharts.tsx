"use client";
// Admin analytics section — visual charts fed by GET /api/admin/analytics
// (live aggregates from the seeded marketplace). All chart code lives here.
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
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
import { BarChart3, Zap, TrendingUp } from "lucide-react";

// Brand palette — matches the app primary (#003a7f navy) + saffron accent.
const PRIMARY = "#003a7f";
const SAFFRON = "#f5a623";
const SAFFRON_LIGHT = "#fbc46b";

const TIER_META: Record<string, { label: string; color: string }> = {
  new: { label: "New", color: "#94a3b8" },
  id_verified: { label: "ID Verified", color: "#0a4c9e" },
  skill_verified: { label: "Skill Verified", color: "#003a7f" },
  top_pro: { label: "Top Pro", color: SAFFRON },
};

const STAGE_LABELS: Record<string, string> = {
  applied: "Applied",
  shortlisted: "Shortlisted",
  interview: "Interview",
  offer: "Offer",
  hired: "Hired",
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
    <div className="rounded-lg border border-border/60 bg-card px-3 py-1.5 text-xs shadow-md">
      <p className="font-semibold text-foreground">{name}</p>
      <p className="text-muted-foreground">
        {item?.value}
        {unit ? ` ${unit}` : ""}
      </p>
    </div>
  );
}

export function AnalyticsCharts() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState(false);

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
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex flex-col gap-4"
      aria-label="Platform analytics"
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <BarChart3 className="size-5 text-primary shrink-0" />
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Platform analytics</h2>
            <p className="text-sm text-muted-foreground">Live aggregates from the seeded marketplace</p>
          </div>
        </div>
        {data && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
              <Zap className="size-3.5 text-[#f5a623]" aria-hidden />
              {data.urgentShare.urgent} urgent of {urgentTotal} jobs
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
              <TrendingUp className="size-3.5 text-primary" aria-hidden />
              {totalHires} hires · last 6 weeks
            </span>
          </div>
        )}
      </div>

      {error ? (
        <p className="text-sm text-muted-foreground">Analytics unavailable</p>
      ) : !data ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <Card key={i} className="gap-3">
              <CardHeader>
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3.5 w-56" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-[232px] w-full rounded-lg" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* 1) Applications per day — area chart */}
          <Card className="gap-3">
            <CardHeader>
              <CardTitle className="text-sm">Applications — last 14 days</CardTitle>
              <CardDescription>Daily application volume across all jobs</CardDescription>
            </CardHeader>
            <CardContent className="h-[248px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.applicationsPerDay} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="appsAreaFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={PRIMARY} stopOpacity={0.22} />
                      <stop offset="100%" stopColor={PRIMARY} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={fmtDay}
                    tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={{ stroke: "var(--border)" }}
                    minTickGap={18}
                  />
                  <YAxis
                    allowDecimals={false}
                    width={30}
                    tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<ChartTip unit="applications" />} cursor={{ stroke: "var(--border)" }} />
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

          {/* 2) Hiring funnel — horizontal bars */}
          <Card className="gap-3">
            <CardHeader>
              <CardTitle className="text-sm">Hiring funnel</CardTitle>
              <CardDescription>Applications that reached each stage</CardDescription>
            </CardHeader>
            <CardContent className="h-[248px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnelData} layout="vertical" margin={{ top: 4, right: 40, left: 4, bottom: 0 }}>
                  <defs>
                    <linearGradient id="funnelBarFill" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor={SAFFRON_LIGHT} />
                      <stop offset="100%" stopColor={SAFFRON} />
                    </linearGradient>
                  </defs>
                  <XAxis type="number" allowDecimals={false} hide domain={[0, "dataMax"]} />
                  <YAxis
                    type="category"
                    dataKey="stage"
                    width={78}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<ChartTip unit="applications" />} cursor={{ fill: "var(--muted)", opacity: 0.5 }} />
                  <Bar dataKey="count" fill="url(#funnelBarFill)" radius={[0, 6, 6, 0]} maxBarSize={24}>
                    <LabelList
                      dataKey="count"
                      position="right"
                      style={{ fill: "var(--foreground)", fontSize: 11, fontWeight: 600 }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 3) Trust tiers — donut */}
          <Card className="gap-3">
            <CardHeader>
              <CardTitle className="text-sm">Trust tiers</CardTitle>
              <CardDescription>Workers by verification level</CardDescription>
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
                      stroke="var(--card)"
                      strokeWidth={2}
                    >
                      {tiers.map((t) => (
                        <Cell key={t.tier} fill={TIER_META[t.tier]?.color ?? "#94a3b8"} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const p = payload[0];
                        const tier = String(p.payload?.tier ?? "");
                        const meta = TIER_META[tier];
                        return (
                          <div className="rounded-lg border border-border/60 bg-card px-3 py-1.5 text-xs shadow-md">
                            <p className="font-semibold text-foreground">{meta?.label ?? tier}</p>
                            <p className="text-muted-foreground">
                              {p.value} workers · {tierTotal > 0 ? Math.round((Number(p.value) / tierTotal) * 100) : 0}%
                            </p>
                          </div>
                        );
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-bold leading-none">{tierTotal}</span>
                  <span className="text-xs text-muted-foreground">workers</span>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
                {tiers.map((t) => (
                  <span key={t.tier} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span
                      className="size-2.5 rounded-[3px] shrink-0"
                      style={{ backgroundColor: TIER_META[t.tier]?.color ?? "#94a3b8" }}
                      aria-hidden
                    />
                    {TIER_META[t.tier]?.label ?? t.tier} · {t.count}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 4) Workers by trade — vertical bars */}
          <Card className="gap-3">
            <CardHeader>
              <CardTitle className="text-sm">Workers by trade</CardTitle>
              <CardDescription>Top 8 trades by worker count</CardDescription>
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
                    tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={{ stroke: "var(--border)" }}
                  />
                  <YAxis
                    allowDecimals={false}
                    width={30}
                    tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<ChartTip unit="workers" />} cursor={{ fill: "var(--muted)", opacity: 0.5 }} />
                  <Bar dataKey="workers" fill={PRIMARY} radius={[6, 6, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </motion.section>
  );
}
