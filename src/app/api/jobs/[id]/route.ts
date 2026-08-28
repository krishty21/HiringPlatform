import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireEmployer, errorResponse, assertJobOwner } from "@/lib/authz";
import { UpdateJobBody } from "@/lib/schemas";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { profile } = await requireEmployer();
    const { id } = await params;
    const owner = await assertJobOwner(id, profile.id);
    if (!owner) return errorResponse(new Error("FORBIDDEN"));

    const body = await req.json();
    const parsed = UpdateJobBody.parse(body);
    const updated = await db.job.update({ where: { id }, data: parsed });
    return NextResponse.json({ id: updated.id, status: updated.status });
  } catch (e) {
    return errorResponse(e);
  }
}
