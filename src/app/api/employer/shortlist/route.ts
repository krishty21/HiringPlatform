// POST /api/employer/shortlist — employer-initiated shortlist of a candidate for a job.
// Creates an application row with status="shortlisted" if no application exists yet,
// or transitions an existing application to "shortlisted".
// Notifies the worker.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireEmployer, errorResponse, assertJobOwner, HTTPError } from "@/lib/authz";
import { z } from "zod";
import { pushNotification } from "@/lib/notifications";

const ShortlistBody = z.object({
  workerId: z.string().min(1),
  jobId: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const { profile } = await requireEmployer();
    const body = await req.json();
    const parsed = ShortlistBody.parse(body);

    // Verify job ownership
    if (!(await assertJobOwner(parsed.jobId, profile.id))) {
      throw new HTTPError(403, "FORBIDDEN");
    }

    // Find or create the application
    const existing = await db.application.findUnique({
      where: { jobId_workerId: { jobId: parsed.jobId, workerId: parsed.workerId } },
    });
    if (existing) {
      const updated = await db.application.update({
        where: { id: existing.id },
        data: {
          status: existing.status === "applied" ? "shortlisted" : existing.status,
          shortlistedAt: existing.shortlistedAt ?? new Date(),
        },
      });
      const job = await db.job.findUnique({
        where: { id: parsed.jobId },
        select: { title: true, employer: { select: { companyName: true } } },
      });
      const worker = await db.workerProfile.findUnique({
        where: { id: parsed.workerId },
        select: { userId: true },
      });
      if (job && worker) {
        await pushNotification(worker.userId, "application_status", {
          applicationId: updated.id, jobId: parsed.jobId, jobTitle: job.title,
          companyName: job.employer.companyName, stage: "shortlisted",
        });
      }
      return NextResponse.json({ id: updated.id, status: updated.status, alreadyExisted: true });
    }

    const created = await db.application.create({
      data: {
        jobId: parsed.jobId,
        workerId: parsed.workerId,
        status: "shortlisted",
        shortlistedAt: new Date(),
      },
    });
    const job = await db.job.findUnique({
      where: { id: parsed.jobId },
      select: { title: true, employer: { select: { companyName: true } } },
    });
    const worker = await db.workerProfile.findUnique({
      where: { id: parsed.workerId },
      select: { userId: true },
    });
    if (job && worker) {
      await pushNotification(worker.userId, "application_status", {
        applicationId: created.id, jobId: parsed.jobId, jobTitle: job.title,
        companyName: job.employer.companyName, stage: "shortlisted",
      });
    }
    return NextResponse.json({ id: created.id, status: "shortlisted" }, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
