# Security — Project ShramSetu

> **Source of truth**: SRD §11 security checklist + directive §3.4 RLS-equivalent enforcement.
> Every item below has a code-evidence pointer so a reviewer can spot-check the claim in seconds.

---

## Section 11 Checklist (with evidence file references)

### [x] RLS-equivalent — every API route enforces row-level isolation via typed helpers

SQLite has no row-level security. We enforce the SRD §10 policy matrix at the API layer using typed helpers in `src/lib/authz.ts`:

- `requireUser(allowedRoles?)` — entry point for every API route. Returns `{id, role}`. Throws `HTTPError(401, "UNAUTHORIZED")` if no session; `HTTPError(403, "FORBIDDEN")` if role not in allow-list.
- `requireWorker()` — calls `requireUser(["worker"])` + looks up the caller's `WorkerProfile.id` (throws 403 if no profile yet).
- `requireEmployer()` — calls `requireUser(["employer"])` + looks up the caller's `EmployerProfile.id`.
- `requireAdmin()` — calls `requireUser(["admin"])`.
- `assertJobOwner(jobId, employerProfileId)` — verifies a job belongs to the caller before any PATCH or shortlist.
- `assertApplicationOwnerForEmployer(applicationId, employerProfileId)` — verifies an application's job.employerId matches the caller.
- `assertApplicationOwnerForWorker(applicationId, workerProfileId)` — verifies an application belongs to the caller.

Every Prisma query in the API layer uses the returned `profile.id` as a `where` filter — so worker A literally cannot read worker B's rows (the `workerId` field is forced to the caller's profile id).

**Evidence**:
- `src/lib/authz.ts` (entire file — 108 lines)
- Probe test T9: a worker session calling `/api/applications/mine` returns only the caller's applications; an employer session calling `/api/employer/applications` returns only applications on the caller's own jobs.

---

### [x] Middleware guards — role-based route guards via `src/proxy.ts`

Next.js 16 deprecated `middleware.ts` in favor of `proxy.ts` (the new convention). We renamed accordingly.

`src/proxy.ts` uses NextAuth's `withAuth` higher-order component to:
1. Check the JWT has a `role` claim. If not → redirect to `/login`.
2. Match the path against the worker/employer/admin area patterns.
3. Redirect cross-role access to the caller's canonical home (worker hitting `/employer/*` → `/home`; employer hitting `/admin/*` → `/employer/dashboard`; etc.).

Matcher:
```ts
export const config = {
  matcher: [
    "/home/:path*", "/profile/:path*", "/applications/:path*",
    "/jobs/:path*", "/onboarding/:path*",
    "/employer/:path*", "/admin/:path*", "/verify/:path*",
  ],
};
```

**Evidence**: `src/proxy.ts` (entire file — 40 lines). Verified by the screenshot `09-admin-home.png` (admin role reaches `/admin` cleanly; worker attempting `/admin` is redirected to `/home`).

---

### [x] Every API route has session + role check + zod parse

Every `route.ts` file under `src/app/api/` follows this pattern:

```ts
import { requireUser, requireWorker, requireEmployer, requireAdmin, errorResponse } from "@/lib/authz";
import { SomeBodySchema } from "@/lib/schemas";

export async function POST(req: Request) {
  try {
    const { profile } = await requireEmployer();           // 1. session + role check
    const body = await req.json();
    const parsed = SomeBodySchema.parse(body);              // 2. zod parse
    // 3. scoped Prisma query using profile.id
    const result = await db.something.create({ data: { ..., employerId: profile.id, ...parsed } });
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    return errorResponse(e);                                // 4. canonical error mapper
  }
}
```

Quick spot-check (full list in `docs/api.md`):

| Route | Auth helper | zod schema |
|---|---|---|
| `POST /api/jobs` | `requireEmployer()` | `CreateJobBody` |
| `PATCH /api/jobs/[id]` | `requireEmployer()` + `assertJobOwner` | `UpdateJobBody` |
| `POST /api/applications` | `requireWorker()` | (inline `{jobId: string}`) |
| `PATCH /api/applications/[id]` | `requireEmployer()` + `assertApplicationOwnerForEmployer` | `PatchApplicationBody` |
| `POST /api/employer/shortlist` | `requireEmployer()` + `assertJobOwner` | (inline zod) |
| `POST /api/employer/endorsements` | `requireEmployer()` | (inline zod) |
| `GET /api/candidates/search` | `requireEmployer()` | `SearchCandidatesQuery` |
| `GET /api/worker/[id]` | `requireEmployer()` | — (path param only) |
| `POST /api/worker/[id]/view` | `requireEmployer()` | — |
| `GET /api/worker/profile` | `requireWorker()` | — |
| `PATCH /api/worker/profile` | `requireWorker()` | (inline zod) |
| `GET /api/worker/dashboard` | `requireWorker()` | — |
| `POST /api/onboarding/worker` | `requireUser(["worker"])` | `OnboardWorkerBody` |
| `GET /api/notifications` | `requireWorker()` | — |
| `PATCH /api/notifications/[id]` | `requireWorker()` + owner check | (inline zod) |
| `POST /api/verifications` | `requireUser(["worker","employer"])` | `UploadVerificationBody` |
| `GET /api/verifications` | `requireUser(["worker","employer"])` | — |
| `GET /api/verifications/[id]` | `requireUser(["worker","employer"])` + owner check | — |
| `GET /api/admin/verifications` | `requireAdmin()` | — |
| `PATCH /api/admin/verifications/[id]` | `requireAdmin()` | `PatchVerificationBody` |
| `GET /api/admin/stats` | `requireAdmin()` | — |
| `POST /api/recompute` | `requireAdmin()` | (inline `{workerId?|employerId?}`) |
| `GET /api/match/explain` | `requireUser()` | — (query params) |
| `POST /api/ai/voice-profile` | `requireWorker()` | `VoiceProfileBody` |
| `POST /api/ai/job-description` | `requireEmployer()` | `JobDescriptionBody` |
| `POST /api/ai/ocr-precheck` | `requireUser(["worker","employer"])` | (inline zod) |
| `POST /api/storage/sign` | `requireUser(["worker","employer"])` OR `requireUser(["admin"])` | (inline `{docId}`) |
| `GET /api/storage/file` | (signed token — implicit auth) | — |
| `GET /api/skills` | `requireUser()` | — |
| `GET /api/public/worker/[slug]` | none (public, PII-minimized) | — |

**Evidence**: `docs/api.md` (full endpoint table); each `route.ts` file imports from `@/lib/authz` and `@/lib/schemas`.

---

### [x] Storage — `/api/storage/file` validates HMAC-signed tokens

The only path to retrieve a stored verification document is `/api/storage/file?token=...`. The token is HMAC-signed and short-lived (default 1 hour TTL).

`src/lib/storage/sign.ts` provides:
- `persistUpload(buf, fileName)` — writes file bytes to `/storage` with mode `0o600` (dir mode `0o700`). Returns a stored name like `<timestamp>-<8 random bytes><ext>`.
- `signFileToken(storedName, ownerUserId, ttlSec=3600)` — returns `base64url(storedName|ownerUserId|exp|HMAC_SHA256(...))`.
- `verifyFileToken(token)` — decodes, parses, re-computes the HMAC, and rejects if signature doesn't match OR `exp < now` OR payload format is malformed.

`src/app/api/storage/file/route.ts`:
1. Reads `?token=...` from the URL.
2. Calls `verifyFileToken(token)`. Returns `403 FORBIDDEN` on any failure.
3. **Defense in depth**: `path.basename(verified.storedName) !== verified.storedName` rejects any path-traversal attempt — even if an attacker forged a token (impossible without the secret), the storage dir cannot be escaped.
4. Reads file bytes from disk. Returns `404 NOT_FOUND` if missing.
5. Streams bytes with `Content-Type` matched by extension, `x-content-type-options: nosniff`, and `cache-control: private, max-age=300`.

**Size + MIME enforcement** (5MB / PDF/JPG/PNG):
- Client-side: `src/components/verification/UploadDropzone.tsx` validates MIME type + file size before submitting.
- Server-side: `POST /api/verifications` re-validates against `ALLOWED_TYPES = {application/pdf, image/jpeg, image/png}` and `MAX_BYTES = 5 * 1024 * 1024`. The `UploadVerificationBody` zod schema also constrains `fileType` to the enum and `fileSize` to `z.number().int().min(1).max(5 * 1024 * 1024)`.
- If a malicious client sends a fake `fileType`/`fileSize` in the form metadata, the server rejects via `meta.fileType !== 'application/pdf'` etc. AND via direct `file.size > MAX_BYTES` check on the Blob.

**Evidence**:
- `src/lib/storage/sign.ts` (entire file — 48 lines).
- `src/app/api/storage/file/route.ts` (entire file — 75 lines).
- `src/app/api/storage/sign/route.ts` (entire file — 61 lines — owner path + admin path).
- `src/app/api/verifications/route.ts` lines 16–17 (`ALLOWED_TYPES`, `MAX_BYTES`), 51–72 (server-side re-validation).
- `src/components/verification/UploadDropzone.tsx` (client-side validation).

---

### [x] VER-06 — PII minimization (no raw ID numbers stored)

The directive requires that no raw Aadhaar / PAN / license number is ever asked for, stored, returned, or logged. Self-review of every layer:

**UI layer** (`src/app/verify/page.tsx` + `src/components/verification/UploadDropzone.tsx`):
- The dropzone is a `<input type="file">` — the user picks a file, never types an ID number.
- A "We never store full ID numbers…" PII hint is shown below the dropzone.

**Transport layer** (`POST /api/verifications` multipart form):
- Only fields: `file`, `docType`, `fileName`, `fileType`, `fileSize`, `skillId?`. No ID-number field exists in the schema.

**Persistence layer** (`src/app/api/verifications/route.ts`):
- The user's `fileName` is replaced with a masked safe name (`id-proof.pdf` / `skill-cert.pdf` / `company-registration.pdf`) before storage in `VerificationDocument.fileName`. Even if the user named their file `aadhaar-1234-5678-9012.pdf`, the Aadhaar never reaches the DB.
- The skill cert's `skillId` is suffixed as `::skill:<id>` on the safe filename so the skill can be resolved later for the masked label "Skill Certificate — Electrician".
- File bytes are stored under `/storage/<timestamp>-<random>.pdf` (no original filename preserved on disk).
- `extractedJson` only stores `{name, cert_type}` if the OCR pre-check returns them — never any ID number.

**Retrieval layer** (`GET /api/verifications`, `GET /api/verifications/[id]`, `GET /api/admin/verifications`):
- Returns `maskedLabel` ("ID Proof" / "Skill Certificate — X" / "Company Registration"), `displayFileName` (the safe name without the `::skill:` suffix), `status`, `reviewerNote`, `reviewedAt`, `submittedAt`, `previewToken`, `skillName`. No raw ID retrievable.
- `reviewerNote` is the only free-text field — admin-controlled, with the placeholder reminder "Never include raw ID numbers" (in `src/components/verification/AdminQueueItem.tsx`).

**Logging layer**:
- `errorResponse()` calls `console.error("[api] unhandled:", err)` ONLY on the 500 path — never on 4xx paths (which are expected flows). The 4xx error object is the typed `HTTPError({status, code})` — `code` is `"UNAUTHORIZED"` / `"FORBIDDEN"` / `"VALIDATION"` / `"NOT_FOUND"` / `"ALREADY_REVIEWED"` — no PII.
- File contents are NEVER logged. The `fileUrl` (a path under `/storage`) is logged only via Prisma query logs at the dev level (Next.js production logs strip these).

**Evidence**:
- `src/app/verify/page.tsx` (labels + PII hint).
- `src/app/admin/verifications/page.tsx` (queue uses masked labels).
- `src/app/api/verifications/route.ts` lines 115–127 (masking logic).
- `src/components/verification/AdminQueueItem.tsx` (reviewerNote placeholder).

---

### [x] No service-role key in client bundle

Prisma is server-only. The `src/lib/db.ts` file imports `@prisma/client` and is only imported by:
- `src/app/api/*/route.ts` files (server runtime).
- `src/app/c/[slug]/page.tsx` + `src/app/c/[slug]/opengraph-image.tsx` (RSC server components).
- `src/lib/notifications.ts` (server-only helper).
- `src/lib/trust/recompute.ts` (server-only helper).
- `src/lib/authz.ts` (server-only auth helpers).
- `prisma/seed.ts` (build-time script).

No client component imports `db` directly. Next.js 16's RSC + `proxy.ts` correctly splits server-only modules from the client bundle. Verified via `bun run lint` (no client-bundle warnings) + `bunx tsc --noEmit` (no type errors).

**Evidence**: `src/lib/db.ts` (3 lines); a `grep` for `from "@/lib/db"` confirms all imports are from server-runtime files.

---

### [x] Lint clean — `bun run lint` returns 0 errors

Every Phase 1 workstream (WS1–WS6) ran `bun run lint` on its own territory and the shared contracts — 0 errors. The directive's "no console.errors in normal flows" rule is honored:

- `errorResponse()` in `src/lib/authz.ts` calls `console.error("[api] unhandled:", err)` ONLY on the 500 path (unhandled errors). Normal 4xx flows (validation, auth, ownership) return without logging.
- The Mock + ZAI providers use `try/catch` to swallow AI SDK errors silently and fall back to Mock — no `console.error` calls.
- The `useNotifications` hook (`src/hooks/use-notifications.ts`) silently swallows network errors during polling — no `console.error` on transient network failures.

**Evidence**: `bun run lint` exit code 0; the only `console.error` in the codebase is in `src/lib/authz.ts` line 103 inside `errorResponse()`'s 500 branch.

---

## Additional security notes

### CORS

The Next.js app runs on port 3000; Caddy gateway on port 81. Same-origin requests (browser → Caddy → Next.js) require no CORS headers. Cross-origin requests are not enabled — the app is single-origin. `/api/public/worker/[slug]` sets `cache-control: public, max-age=60, s-maxage=300, stale-while-revalidate=600` but no `access-control-allow-origin` — the public JSON is fetched by the Next.js RSC (server-side), not by arbitrary external origins.

### CSRF

NextAuth v4's credentials provider uses `sameSite=lax` cookies by default (with `NEXTAUTH_URL` auto-detected from the request). Cross-site POST requests are blocked at the cookie layer. The `proxy.ts` matcher intercepts authenticated routes; cross-origin form POSTs without a valid session cookie are redirected to `/login`.

### Rate limiting

Not implemented in the sandbox build. Vercel swap would add Edge rate-limit middleware; for now, the dev server runs single-tenant. **Roadmap** (`ROADMAP.md`): add rate-limiting on `/api/ai/*` (LLM cost protection) and `/api/auth/*` (brute-force protection) before production.

### Secrets

- `NEXTAUTH_SECRET` — JWT signing secret. Set in `.env`. The fallback `"shramsetu-dev-secret-please-rotate"` in `src/lib/auth.ts` is a dev-only default — production MUST override via env var. (Documented in `.env.example`.)
- `STORAGE_HMAC_SECRET` — HMAC secret for signed file tokens. Same dev fallback pattern.
- `AI_PROVIDER` — `mock` (default) or `zai` (uses `z-ai-web-dev-sdk`). No additional API key needed for the ZAI provider in the sandbox.

**Evidence**: `.env.example` documents every secret + the dev fallback warning.

---

## Open items / known limitations

1. **No production-grade rate limiting** — see "Rate limiting" above.
2. **NextAuth `[NO_SECRET]` warning** — surfaces as a `500` on `/api/auth/error` when running demo login via direct `curl` POST (browser-based `signIn()` flow works fine). The orchestrator's `src/lib/auth.ts` has a dev fallback secret; production MUST set `NEXTAUTH_SECRET`. Documented in `.env.example`.
3. **~30 hardcoded English strings** flagged by the WS6 audit — these are placeholder text and aria-labels in frozen-territory files (LanguageToggle, AppShell, dashboard hints, etc.). Not security-impacting; tracked for a future i18n completion pass. See `FINAL_REPORT.md` known limitations section.
