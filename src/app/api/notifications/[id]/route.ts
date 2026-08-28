// PATCH /api/notifications/:id — mark a notification as read (worker auth, owner-only).
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireWorker, errorResponse, HTTPError } from "@/lib/authz";
import { z } from "zod";

const PatchBody = z.object({
  read: z.boolean().optional().default(true),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requireWorker();
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const parsed = PatchBody.parse(body);

    // Owner check
    const existing = await db.notification.findUnique({ where: { id }, select: { userId: true } });
    if (!existing || existing.userId !== user.id) throw new HTTPError(403, "FORBIDDEN");

    const updated = await db.notification.update({
      where: { id },
      data: { read: parsed.read },
      select: { id: true, read: true },
    });
    return NextResponse.json(updated);
  } catch (e) {
    return errorResponse(e);
  }
}
