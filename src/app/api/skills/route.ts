// GET /api/skills — skills taxonomy (any-auth).
// Returns all skills ordered by category then nameEn.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser, errorResponse } from "@/lib/authz";

export async function GET() {
  try {
    await requireUser();
    const skills = await db.skill.findMany({
      orderBy: [{ category: "asc" }, { nameEn: "asc" }],
    });
    return NextResponse.json({ items: skills });
  } catch (e) {
    return errorResponse(e);
  }
}
