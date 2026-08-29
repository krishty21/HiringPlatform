// GET /api/admin/stats — platform-wide counts for the admin home stats strip (ADM-02).
// Real seeded data (counts via Prisma). Admin-only.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, errorResponse } from "@/lib/authz";

export async function GET() {
  try {
    await requireAdmin();
    const [users, jobs, hires, pendingDocs] = await Promise.all([
      db.user.count(),
      db.job.count(),
      db.application.count({ where: { status: "hired" } }),
      db.verificationDocument.count({ where: { status: "pending" } }),
    ]);
    return NextResponse.json({ users, jobs, hires, pendingDocs });
  } catch (e) {
    return errorResponse(e);
  }
}
