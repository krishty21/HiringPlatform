// GET /api/notifications — list notifications + unread count (worker auth).
// Query: ?unreadOnly=true&limit=50
// PATCH semantics (mark read) are intentionally kept here as a sibling route
// for future expansion; we expose GET only per the directive.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireWorker, errorResponse } from "@/lib/authz";

export async function GET(req: Request) {
  try {
    const { user } = await requireWorker();
    const url = new URL(req.url);
    const unreadOnly = url.searchParams.get("unreadOnly") === "true";
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? "50")));

    const [items, unread] = await Promise.all([
      db.notification.findMany({
        where: { userId: user.id, ...(unreadOnly ? { read: false } : {}) },
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      db.notification.count({ where: { userId: user.id, read: false } }),
    ]);

    return NextResponse.json({
      items: items.map(n => {
        let payload: Record<string, unknown> = {};
        try { payload = JSON.parse(n.payloadJson) as typeof payload; } catch {}
        return {
          id: n.id,
          type: n.type,
          read: n.read,
          createdAt: n.createdAt.toISOString(),
          payload,
        };
      }),
      unread,
    });
  } catch (e) {
    return errorResponse(e);
  }
}
