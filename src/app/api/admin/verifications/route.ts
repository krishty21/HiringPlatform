// GET /api/admin/verifications — admin-only verification queue (ADM-01).
// Returns pending docs (optionally ?status=all to see approved/rejected history).
// Owner names are resolved via worker_profile.fullName or employer_profile.companyName.
// File bytes are NOT returned here; admin must POST /api/storage/sign for each preview.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, errorResponse } from "@/lib/authz";

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const url = new URL(req.url);
    const statusFilter = url.searchParams.get("status") ?? "pending";

    const where = statusFilter === "all" ? {} : { status: statusFilter };

    const docs = await db.verificationDocument.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    // Resolve owner names in a single round-trip
    const ownerIds = Array.from(new Set(docs.map((d) => d.ownerUserId)));
    const users = await db.user.findMany({
      where: { id: { in: ownerIds } },
      select: { id: true, email: true, name: true, role: true },
    });
    const workerProfiles = await db.workerProfile.findMany({
      where: { userId: { in: ownerIds } },
      select: { userId: true, fullName: true, trade: { select: { nameEn: true } } },
    });
    const employerProfiles = await db.employerProfile.findMany({
      where: { userId: { in: ownerIds } },
      select: { userId: true, companyName: true, city: true },
    });

    const userById = new Map(users.map((u) => [u.id, u]));
    const workerByUserId = new Map(workerProfiles.map((w) => [w.userId, w]));
    const employerByUserId = new Map(employerProfiles.map((e) => [e.userId, e]));

    const items = docs.map((d) => {
      const owner = userById.get(d.ownerUserId);
      const worker = workerByUserId.get(d.ownerUserId);
      const employer = employerByUserId.get(d.ownerUserId);
      // Masked label — never include the underlying ID number
      let maskedLabel = "ID Proof";
      let skillName: string | null = null;
      if (d.docType === "skill_cert") {
        const m = d.fileName.match(/::skill:(.+)$/);
        maskedLabel = "Skill Certificate";
        // We don't resolve the skill name here (admin queue is dense); the
        // skillName can be resolved from extractedJson or shown generically.
        skillName = null;
      } else if (d.docType === "company") {
        maskedLabel = "Company Registration";
      }
      return {
        id: d.id,
        docType: d.docType,
        maskedLabel,
        displayFileName: d.fileName.replace(/::skill:.+$/, ""),
        fileType: d.fileType,
        status: d.status,
        reviewerNote: d.reviewerNote,
        reviewedAt: d.reviewedAt?.toISOString() ?? null,
        submittedAt: d.createdAt.toISOString(),
        extractedJson: d.extractedJson,
        owner: {
          id: d.ownerUserId,
          email: owner?.email ?? "",
          role: owner?.role ?? "worker",
          // Display name — prefer profile name; fall back to user.name then email
          name: worker?.fullName ?? employer?.companyName ?? owner?.name ?? owner?.email ?? "Unknown",
          trade: worker?.trade?.nameEn ?? null,
          city: employer?.city ?? null,
        },
        skillName,
      };
    });

    return NextResponse.json({ items, count: items.length });
  } catch (e) {
    return errorResponse(e);
  }
}
