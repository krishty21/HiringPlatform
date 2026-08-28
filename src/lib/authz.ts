// authz — RLS-equivalent row-level access helpers (per directive §3.4 + §11).
// SQLite has no RLS, so we enforce at the API boundary: every query helper
// takes the caller's session user id and refuses to return rows they're not
// entitled to. This mirrors the SRD §10 policy matrix:
//   workers: write own profile only
//   employers: read applicants only via own jobs
//   admins: own verification tables
//   everyone: read only open jobs
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Session } from "next-auth";

export type AuthUser = { id: string; role: "worker" | "employer" | "admin" };

export async function getSession(): Promise<Session | null> {
  return getServerSession(authOptions);
}

export async function requireUser(allowedRoles?: ("worker" | "employer" | "admin")[]): Promise<AuthUser> {
  const session = await getSession();
  const user = session?.user as any;
  if (!user?.id) throw new HTTPError(401, "UNAUTHORIZED");
  const role = user.role as AuthUser["role"];
  if (allowedRoles && !allowedRoles.includes(role)) throw new HTTPError(403, "FORBIDDEN");
  return { id: user.id as string, role };
}

export async function requireWorker(): Promise<{ user: AuthUser; profile: { id: string } }> {
  const u = await requireUser(["worker"]);
  const profile = await db.workerProfile.findUnique({ where: { userId: u.id }, select: { id: true } });
  if (!profile) throw new HTTPError(403, "FORBIDDEN"); // worker hasn't onboarded yet
  return { user: u, profile };
}

export async function requireEmployer(): Promise<{ user: AuthUser; profile: { id: string } }> {
  const u = await requireUser(["employer"]);
  const profile = await db.employerProfile.findUnique({ where: { userId: u.id }, select: { id: true } });
  if (!profile) throw new HTTPError(403, "FORBIDDEN");
  return { user: u, profile };
}

export async function requireAdmin(): Promise<AuthUser> {
  return requireUser(["admin"]);
}

// Employer-scoped query: only return rows whose job.employerId === caller's employerProfile.id
export async function assertJobOwner(jobId: string, employerProfileId: string): Promise<boolean> {
  const job = await db.job.findUnique({
    where: { id: jobId },
    select: { employerId: true },
  });
  return job?.employerId === employerProfileId;
}

export async function assertApplicationOwnerForEmployer(
  applicationId: string,
  employerProfileId: string,
): Promise<boolean> {
  const app = await db.application.findUnique({
    where: { id: applicationId },
    select: { job: { select: { employerId: true } } },
  });
  return app?.job.employerId === employerProfileId;
}

export async function assertApplicationOwnerForWorker(
  applicationId: string,
  workerProfileId: string,
): Promise<boolean> {
  const app = await db.application.findUnique({
    where: { id: applicationId },
    select: { workerId: true },
  });
  return app?.workerId === workerProfileId;
}

// HTTPError — a typed throwable so route handlers can map to { status, code } cleanly.
export class HTTPError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

export function errorResponse(err: unknown) {
  if (err instanceof HTTPError) {
    return new Response(JSON.stringify({ error: err.code }), {
      status: err.status,
      headers: { "content-type": "application/json" },
    });
  }
  // zod
  if (err && typeof err === "object" && "issues" in err) {
    return new Response(JSON.stringify({ error: "VALIDATION", issues: (err as any).issues }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
  console.error("[api] unhandled:", err);
  return new Response(JSON.stringify({ error: "INTERNAL" }), {
    status: 500,
    headers: { "content-type": "application/json" },
  });
}
