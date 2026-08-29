// POST /api/employer/endorsements — record an employer endorsement for a worker + skill.
// Per EMP-07 + SRD §8.2: bump worker trust via recomputeWorkerTrust after insert.
// Employer auth; payload validated via inline zod schema (frozen-style).
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireEmployer, errorResponse } from "@/lib/authz";
import { z } from "zod";
import { recomputeWorkerTrust } from "@/lib/trust/recompute";
import { pushNotification } from "@/lib/notifications";

const EndorsementBody = z.object({
  workerId: z.string().min(1),
  skillId: z.string().min(1),
  comment: z.string().max(500).optional().default(""),
});

export async function POST(req: Request) {
  try {
    const { profile } = await requireEmployer();
    const body = await req.json();
    const parsed = EndorsementBody.parse(body);

    // Insert endorsement
    const endorsement = await db.endorsement.create({
      data: {
        workerId: parsed.workerId,
        employerId: profile.id,
        skillId: parsed.skillId,
        comment: parsed.comment,
      },
    });

    // Bump worker trust (per §8.2: 4× endorsements cap 12)
    await recomputeWorkerTrust(db, parsed.workerId);

    // Notify worker
    const worker = await db.workerProfile.findUnique({
      where: { id: parsed.workerId },
      select: { userId: true },
    });
    const skill = await db.skill.findUnique({ where: { id: parsed.skillId }, select: { nameEn: true } });
    const employer = await db.employerProfile.findUnique({ where: { id: profile.id }, select: { companyName: true } });
    if (worker) {
      await pushNotification(worker.userId, "endorsement", {
        endorsementId: endorsement.id,
        employer: employer?.companyName ?? "",
        skill: skill?.nameEn ?? "",
      });
    }

    return NextResponse.json({ id: endorsement.id, ok: true }, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
