// POST /api/worker/[id]/view — increment worker's profile_views (DSH-02 + EMP-04)
// when an employer opens the candidate Skill Passport page.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireEmployer, errorResponse, HTTPError } from "@/lib/authz";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireEmployer();
    const { id } = await params;
    const worker = await db.workerProfile.findUnique({ where: { id }, select: { id: true } });
    if (!worker) throw new HTTPError(404, "NOT_FOUND");
    await db.workerProfile.update({
      where: { id },
      data: { profileViews: { increment: 1 } },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
