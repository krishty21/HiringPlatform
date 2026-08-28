import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireEmployer, requireWorker, errorResponse, assertApplicationOwnerForEmployer, assertApplicationOwnerForWorker, HTTPError } from "@/lib/authz";
import { PatchApplicationBody } from "@/lib/schemas";
import { pushNotification } from "@/lib/notifications";

const STAGE_TIMESTAMP: Record<string, "shortlistedAt" | "interviewAt" | "offerAt" | "hiredAt" | "rejectedAt"> = {
  shortlisted: "shortlistedAt",
  interview: "interviewAt",
  offer: "offerAt",
  hired: "hiredAt",
  rejected: "rejectedAt",
};

// GET /api/applications/:id — owner worker or owning employer
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    // Try worker first; if they don't own it, try employer
    try {
      const { profile: wp } = await requireWorker();
      if (await assertApplicationOwnerForWorker(id, wp.id)) {
        const app = await db.application.findUnique({
          where: { id },
          include: { job: { include: { employer: true, trade: true, skills: { include: { skill: true } } } } },
        });
        if (!app) throw new HTTPError(404, "NOT_FOUND");
        return NextResponse.json({ ...app, job: { ...app.job, lat: app.job.lat, lng: app.job.lng } });
      }
    } catch {}
    const { profile: ep } = await requireEmployer();
    if (!(await assertApplicationOwnerForEmployer(id, ep.id))) return errorResponse(new HTTPError(403, "FORBIDDEN"));
    const app = await db.application.findUnique({
      where: { id },
      include: { job: { include: { employer: true, trade: true } }, worker: { include: { trade: true, skills: { include: { skill: true } } } } },
    });
    if (!app) throw new HTTPError(404, "NOT_FOUND");
    return NextResponse.json(app);
  } catch (e) {
    return errorResponse(e);
  }
}

// PATCH /api/applications/:id — employer status transition + notification + timestamp
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { profile } = await requireEmployer();
    if (!(await assertApplicationOwnerForEmployer(id, profile.id))) return errorResponse(new HTTPError(403, "FORBIDDEN"));

    const body = await req.json();
    const parsed = PatchApplicationBody.parse(body);

    const tsField = STAGE_TIMESTAMP[parsed.status];
    const data: Record<string, Date> = tsField ? { [tsField]: new Date() } : {};
    const updated = await db.application.update({
      where: { id },
      data: { status: parsed.status, ...data },
    });

    // Notify the worker
    const full = await db.application.findUnique({
      where: { id },
      select: { workerId: true, worker: { select: { userId: true } }, job: { select: { id: true, title: true, employer: { select: { companyName: true } } } } },
    });
    if (full) {
      await pushNotification(full.worker.userId, "application_status", {
        applicationId: id, jobId: full.job.id, jobTitle: full.job.title,
        companyName: full.job.employer.companyName, stage: parsed.status,
      });
    }

    // If hired, trigger endorsement flow handled at the UI layer; here we just record timestamp
    return NextResponse.json({ id: updated.id, status: updated.status });
  } catch (e) {
    return errorResponse(e);
  }
}
