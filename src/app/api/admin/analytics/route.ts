// GET /api/admin/analytics — aggregated chart data for the admin analytics section.
// Read-only aggregations over the seeded marketplace (grouping happens in SQL /
// Prisma groupBy + tiny in-memory zero-fills — no schema changes, no new tables).
// Admin-only (same guard as /api/admin/stats).
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, errorResponse } from "@/lib/authz";

const DAY_MS = 24 * 60 * 60 * 1000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const dayKey = (d: Date) => d.toISOString().slice(0, 10); // UTC YYYY-MM-DD
const shortDate = (d: Date) => `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;

export async function GET() {
  try {
    await requireAdmin();
    const now = new Date();

    // Last 14 UTC days, inclusive of today — zero-filled after the queries.
    const start14 = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 13));
    const startMs = start14.getTime();

    const [perDayRows, byStatus, byTier, byTrade, skills, byUrgent, hired] = await Promise.all([
      // SQLite stores DateTime as ms integers — bucket by UTC day in SQL.
      db.$queryRaw<{ day: string; count: bigint }[]>`
        SELECT strftime('%Y-%m-%d', appliedAt / 1000, 'unixepoch') AS day, COUNT(*) AS count
        FROM Application
        WHERE appliedAt >= ${startMs}
        GROUP BY day
      `,
      db.application.groupBy({ by: ["status"], _count: { _all: true } }),
      db.workerProfile.groupBy({ by: ["trustTier"], _count: { _all: true } }),
      db.workerProfile.groupBy({ by: ["tradeId"], _count: { _all: true } }),
      db.skill.findMany({ select: { id: true, nameEn: true } }),
      db.job.groupBy({ by: ["isUrgent"], _count: { _all: true } }),
      db.application.findMany({
        where: { hiredAt: { not: null } },
        select: { hiredAt: true },
      }),
    ]);

    // 1) Applications per day — 14 zero-filled UTC buckets.
    const perDayMap = new Map(perDayRows.map((r) => [r.day, Number(r.count)]));
    const applicationsPerDay = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(startMs + i * DAY_MS);
      return { date: dayKey(d), count: perDayMap.get(dayKey(d)) ?? 0 };
    });

    // 2) Hiring funnel — cumulative: each stage counts applications that
    //    reached AT LEAST that stage (rejected apps only count as "applied").
    const statusCount = (s: string) => byStatus.find((r) => r.status === s)?._count._all ?? 0;
    const totalApps = byStatus.reduce((sum, r) => sum + r._count._all, 0);
    const funnel = [
      { stage: "applied", count: totalApps },
      {
        stage: "shortlisted",
        count:
          statusCount("shortlisted") + statusCount("interview") + statusCount("offer") + statusCount("hired"),
      },
      { stage: "interview", count: statusCount("interview") + statusCount("offer") + statusCount("hired") },
      { stage: "offer", count: statusCount("offer") + statusCount("hired") },
      { stage: "hired", count: statusCount("hired") },
    ];

    // 3) Trust tiers — canonical order, zero-filled.
    const TIERS = ["new", "id_verified", "skill_verified", "top_pro"] as const;
    const trustTiers = TIERS.map((tier) => ({
      tier,
      count: byTier.find((r) => r.trustTier === tier)?._count._all ?? 0,
    }));

    // 4) Workers by trade — top 8 (null/unknown tradeId → "Other").
    const skillName = new Map(skills.map((s) => [s.id, s.nameEn]));
    const tradeDistribution = byTrade
      .map((r) => ({
        trade: (r.tradeId && skillName.get(r.tradeId)) || "Other",
        workers: r._count._all,
      }))
      .sort((a, b) => b.workers - a.workers || a.trade.localeCompare(b.trade))
      .slice(0, 8);

    // 5) Jobs by urgency.
    const urgentShare = {
      urgent: byUrgent.find((r) => r.isUrgent)?._count._all ?? 0,
      normal: byUrgent.find((r) => !r.isUrgent)?._count._all ?? 0,
    };

    // 6) Weekly hires — last 6 rolling 7-day buckets, zero-filled.
    const nowMs = now.getTime();
    const hiredAtMs = hired
      .map((h) => h.hiredAt?.getTime())
      .filter((t): t is number => typeof t === "number");
    const weeklyHires = Array.from({ length: 6 }, (_, i) => {
      const weekStart = nowMs - (6 - i) * 7 * DAY_MS;
      const weekEnd = weekStart + 7 * DAY_MS;
      return {
        weekLabel: shortDate(new Date(weekStart)),
        hires: hiredAtMs.filter((t) => t >= weekStart && t < weekEnd).length,
      };
    });

    return NextResponse.json({
      applicationsPerDay,
      funnel,
      trustTiers,
      tradeDistribution,
      urgentShare,
      weeklyHires,
    });
  } catch (e) {
    return errorResponse(e);
  }
}
