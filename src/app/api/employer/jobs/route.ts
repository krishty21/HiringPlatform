// GET /api/employer/jobs — list jobs posted by the caller employer, with applicant counts.
// Owner-scoped: filters by postedBy === user.id OR employerId === caller profile id.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireEmployer, errorResponse } from "@/lib/authz";

export async function GET() {
  try {
    const { user, profile } = await requireEmployer();
    const jobs = await db.job.findMany({
      where: {
        OR: [{ postedBy: user.id }, { employerId: profile.id }],
      },
      include: {
        trade: { select: { nameEn: true } },
        _count: { select: { applications: true } },
        applications: { select: { status: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Aggregate per-stage counts for the dashboard / pipeline hint
    const items = jobs.map(j => {
      const byStatus: Record<string, number> = {};
      for (const a of j.applications) byStatus[a.status] = (byStatus[a.status] ?? 0) + 1;
      return {
        id: j.id,
        title: j.title,
        tradeId: j.tradeId,
        tradeName: j.trade?.nameEn ?? null,
        headcount: j.headcount,
        wageMin: j.wageMin,
        wageMax: j.wageMax,
        city: j.city,
        shift: j.shift,
        isUrgent: j.isUrgent,
        status: j.status,
        description: j.description,
        createdAt: j.createdAt.toISOString(),
        applicantCount: j._count.applications,
        applicationsByStatus: byStatus,
      };
    });

    return NextResponse.json({ items });
  } catch (e) {
    return errorResponse(e);
  }
}
