// GET /api/worker/trust-history — worker auth, returns a chronological timeline
// of the caller's trust-tier transition events derived from VerificationDocument
// approvals + the worker's profile creation. Displayed by the TrustTimeline
// component on /profile (round 9, NEW — additive).
//
// Events (oldest first):
//   - {type: "start",    at: WorkerProfile.createdAt,         tier: "new"}
//   - {type: "verified", at: VerificationDocument.reviewedAt, tier: "id_verified", docType: "id"}
//   - {type: "verified", at: VerificationDocument.reviewedAt, tier: "skill_verified", docType: "skill_cert"}
//   - {type: "top_pro",  at: <now>,                            tier: "top_pro"} (only when worker is currently top_pro)
//
// Up-next: derived from current tier — id, skill, or top_pro. No next step
// when worker is top_pro.
//
// Frozen contracts untouched: schema unchanged, src/lib/trust/* unchanged.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireWorker, errorResponse } from "@/lib/authz";

type TimelineEventKind = "start" | "verified" | "top_pro";
interface TimelineEvent {
  type: TimelineEventKind;
  at: string; // ISO date
  tier: "new" | "id_verified" | "skill_verified" | "top_pro";
  docType?: string;
}
interface TrustHistoryResponse {
  events: TimelineEvent[];
  currentTier: "new" | "id_verified" | "skill_verified" | "top_pro";
  upNext: { tier: "id_verified" | "skill_verified" | "top_pro" | null };
}

export async function GET() {
  try {
    const { user, profile } = await requireWorker();

    const worker = await db.workerProfile.findUnique({
      where: { id: profile.id },
      select: {
        createdAt: true,
        trustTier: true,
      },
    });
    if (!worker) {
      return NextResponse.json({ events: [], currentTier: "new", upNext: { tier: "id_verified" } } satisfies TrustHistoryResponse);
    }

    const events: TimelineEvent[] = [];

    // 1. Profile created
    events.push({
      type: "start",
      at: worker.createdAt.toISOString(),
      tier: "new",
    });

    // 2. Approved verification docs — only id + skill_cert contribute to tier transitions.
    const docs = await db.verificationDocument.findMany({
      where: {
        ownerUserId: user.id,
        status: "approved",
        docType: { in: ["id", "skill_cert"] },
        reviewedAt: { not: null },
      },
      select: { docType: true, reviewedAt: true },
      orderBy: { reviewedAt: "asc" },
    });

    let reachedId = false;
    let reachedSkill = false;
    for (const d of docs) {
      if (d.docType === "id" && !reachedId && d.reviewedAt) {
        reachedId = true;
        events.push({
          type: "verified",
          at: d.reviewedAt.toISOString(),
          tier: "id_verified",
          docType: "id",
        });
      } else if (d.docType === "skill_cert" && !reachedSkill && d.reviewedAt) {
        reachedSkill = true;
        events.push({
          type: "verified",
          at: d.reviewedAt.toISOString(),
          tier: "skill_verified",
          docType: "skill_cert",
        });
      }
    }

    // 3. Top Pro — no explicit event timestamp in the schema; if the worker's
    //    current tier is top_pro, use `now` as the event timestamp (best-effort).
    if (worker.trustTier === "top_pro") {
      events.push({
        type: "top_pro",
        at: new Date().toISOString(),
        tier: "top_pro",
      });
    }

    // 4. Up next
    const tier = worker.trustTier as "new" | "id_verified" | "skill_verified" | "top_pro";
    let upNext: TrustHistoryResponse["upNext"];
    if (tier === "new") upNext = { tier: "id_verified" };
    else if (tier === "id_verified") upNext = { tier: "skill_verified" };
    else if (tier === "skill_verified") upNext = { tier: "top_pro" };
    else upNext = { tier: null };

    return NextResponse.json({
      events,
      currentTier: tier,
      upNext,
    } satisfies TrustHistoryResponse);
  } catch (e) {
    return errorResponse(e);
  }
}
