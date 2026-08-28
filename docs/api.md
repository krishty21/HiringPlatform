# API Reference — Project ShramSetu

> **Source of truth**: `src/app/api/*/route.ts` — every endpoint listed below.
> All endpoints enforce auth via `src/lib/authz.ts` and validate input via zod schemas in `src/lib/schemas/index.ts`.
> Errors are JSON: `{ "error": "<code>", "issues"?: [...] }` with appropriate HTTP status. `errorResponse()` in `src/lib/authz.ts` is the canonical mapper.

## Authentication

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/auth/[...nextauth]` | GET/POST | public | NextAuth v4 handler. Three providers: `demo` (one-click seeded accounts), `email` (magic-link via `SigninToken` table), `email-only` (auto-create any email as a fresh worker). JWT session signed with `NEXTAUTH_SECRET`. Custom sign-in page at `/login`. |

The session is exposed on `session.user.id` and `session.user.role` (via the `jwt` + `session` callbacks in `src/lib/auth.ts`).

---

## Jobs

### `GET /api/jobs` — Feed (worker feed or employer browse)
- **Auth**: any authenticated user (`requireUser()`).
- **Query** (zod `FeedJobsQuery`):
  - `tradeId?: string`
  - `distanceKm?: number` (1-200)
  - `wageMin?: number`, `wageMax?: number`
  - `shift?: "day" | "night" | "any"`
  - `urgentOnly?: boolean`
  - `availableOnly?: boolean`
  - `lat?: number`, `lng?: number` (overrides worker's profile location)
  - `page?: number` (default 1), `pageSize?: number` (default 20, max 100)
- **Response 200**: `{ items: JobEnriched[], total, page, pageSize, hasNext }`
  - `JobEnriched` = full `Job` + `matchScore?: number` (cached or computed live) + `distanceKm?: number` + `inRadius: boolean` + `createdAt: ISO`.
- **Behavior**: For worker role, uses worker's profile `lat/lng/maxRadiusKm/skills` to compute match scores. Cache miss → computes live and persists via `db.matchScore.upsert`. Filters by `inRadius` when no explicit `distanceKm` is passed.

### `POST /api/jobs` — Create job (employer only)
- **Auth**: `requireEmployer()`.
- **Body** (zod `CreateJobBody`): `{ title, tradeId, headcount, wageMin, wageMax, city, lat, lng, shift, isUrgent, description, skills: [{skillId, required}] }`
- **Response 201**: `{ id, status: "open" }`
- **Behavior**: Creates `Job` + `JobSkill` rows. Pre-computes `MatchScore` rows for this job × every existing worker (so feed shows them immediately). Calls `recomputeEmployerVerified` to refresh the employer's `isVerified` flag in case admin approved meanwhile.

### `PATCH /api/jobs/:id` — Update / close job (owner only)
- **Auth**: `requireEmployer()` + `assertJobOwner(id, profile.id)`.
- **Body** (zod `UpdateJobBody`): `{ status?: "open"|"closed", title?: string, description?: string }`
- **Response 200**: `{ id, status }`

---

## Applications

### `POST /api/applications` — One-tap apply (worker only)
- **Auth**: `requireWorker()`.
- **Body**: `{ jobId: string }`
- **Response 201**: `{ id, status: "applied" }` or `{ id, status, alreadyApplied: true }` (200) on double-apply.
- **Behavior**: Unique constraint `(jobId, workerId)` prevents double-apply. Pushes a notification to the employer via `pushNotification(userId, "application_status", {…})`.

### `GET /api/applications/:id` — Application detail (worker owner or owning employer)
- **Auth**: `requireWorker()` OR `requireEmployer()` + `assertApplicationOwnerForEmployer` / `assertApplicationOwnerForWorker`.
- **Response 200**: full `Application` row + `job` (with `employer`, `trade`, `skills`) and (for employer path) `worker` (with `trade`, `skills`).

### `PATCH /api/applications/:id` — Stage transition (employer owner only)
- **Auth**: `requireEmployer()` + `assertApplicationOwnerForEmployer(id, profile.id)`.
- **Body** (zod `PatchApplicationBody`): `{ status: "applied"|"shortlisted"|"interview"|"offer"|"hired"|"rejected" }`
- **Response 200**: `{ id, status }`
- **Behavior**: Sets the matching stage timestamp (`shortlistedAt`, `interviewAt`, `offerAt`, `hiredAt`, `rejectedAt`) via the `STAGE_TIMESTAMP` map. Pushes a notification to the worker.

### `GET /api/applications/mine` — Worker's own applications list
- **Auth**: `requireWorker()`.
- **Response 200**: `{ items: ApplicationEnriched[] }` — each item includes `job` (with `employer`, `trade`) and stage timestamps. Sorted by `updatedAt desc, appliedAt desc`.

---

## Employer endpoints

### `POST /api/employer/shortlist` — Employer-initiated shortlist (EMP-07)
- **Auth**: `requireEmployer()` + `assertJobOwner(jobId, profile.id)`.
- **Body** (inline zod): `{ workerId: string, jobId: string }`
- **Response 201**: `{ id, status: "shortlisted" }` or `{ id, status, alreadyExisted: true }` (200) on re-shortlist.
- **Behavior**: Creates or transitions an application to `shortlisted`. Sets `shortlistedAt`. Notifies the worker.

### `POST /api/employer/endorsements` — Endorse a worker's skill (EMP-07 + VER-03)
- **Auth**: `requireEmployer()`.
- **Body** (inline zod): `{ workerId, skillId, comment? }`
- **Response 201**: `{ id, ok: true }`
- **Behavior**: Inserts `Endorsement`, calls `recomputeWorkerTrust(db, workerId)` (per §8.2: `+4 × endorsements, cap 12`), pushes `endorsement` notification to the worker.

### `GET /api/employer/jobs` — Caller's posted jobs
- **Auth**: `requireEmployer()`.
- **Response 200**: `{ items: JobWithCounts[] }` — each item has `applicantCount` and `applicationsByStatus: Record<stage, count>` aggregated per job.

### `GET /api/employer/applications` — All applications for caller's jobs (pipeline data)
- **Auth**: `requireEmployer()`.
- **Query**: `?jobId=…` (optional filter).
- **Response 200**: `{ items: ApplicationEnriched[] }` — each item includes full `job` (with `tradeName`) and full `worker` (with `tradeName`, `skills`, `trustTier`, `availableToday`, `photoUrl`). Sorted by `status asc, appliedAt desc` — pipeline-friendly order.

---

## Candidate search (employer)

### `GET /api/candidates/search` — Ranked workers by match score (EMP-03/04/05)
- **Auth**: `requireEmployer()`.
- **Query** (zod `SearchCandidatesQuery`):
  - `tradeId?: string`
  - `experienceMin?: number`, `experienceMax?: number` (0-50)
  - `distanceKm?: number` (1-200)
  - `trustTier?: "new"|"id_verified"|"skill_verified"|"top_pro"`
  - `wageMin?: number`, `wageMax?: number`
  - `availableToday?: boolean`
  - `language?: "en"|"hi"|"te"` (best-effort LIKE on JSON column)
  - `urgentJobId?: string` — when provided, uses this job's match scores and **sorts available-today workers first** within the same score band (EMP-05).
- **Response 200**: `{ items: CandidateRow[], total, urgentJobId }`
  - `CandidateRow` = `{ id, fullName, tradeId, tradeName, yearsExp, city, lat, lng, wageMin, wageMax, shiftPref, availableToday, trustTier, trustScore, bio, languages, skills[], matchScore, topReason, distanceKm, profileViews }`.
- **Behavior**: If `urgentJobId` is given, scores against that job. Otherwise builds a synthetic scoring job from the filters + employer's city centroid. Calls `computeMatch` + `explainMatch` live per candidate. Sorts by `matchScore desc` (with `availableToday` priority when `urgentJobId` is set).

---

## Worker endpoints

### `GET /api/worker/:id` — Candidate Skill Passport view (employer only) — EMP-04
- **Auth**: `requireEmployer()`.
- **Response 200**: `{ id, fullName, tradeId, tradeName, yearsExp, city, wageMin, wageMax, shiftPref, bio, photoUrl, availableToday, trustTier, trustScore, profileViews, passportPublic, languages, skills[], endorsements[], distanceKm }`.
- **Behavior**: Distance computed from the employer's city centroid (cheap heuristic — no exact job lat/lng available pre-application).

### `POST /api/worker/:id/view` — Increment profile_views (DSH-02 + EMP-04)
- **Auth**: `requireEmployer()`.
- **Response 200**: `{ ok: true }`
- **Behavior**: Increments `workerProfile.profileViews` (cumulative counter). Called by the client when an employer opens the candidate detail page.

### `GET /api/worker/profile` — Own profile (worker only)
- **Auth**: `requireWorker()`.
- **Response 200**: full `WorkerProfile` + `trade` + `skills` + `endorsements` + computed `profileStrength` (per directive: `30 base + 10 × required fields filled + 5 × skills (cap 25) + 10 bio>50 + 10 photo + 10 verified`).

### `PATCH /api/worker/profile` — Update profile (worker only)
- **Auth**: `requireWorker()`.
- **Body** (inline zod): `{ availableToday?, passportPublic?, fullName?, yearsExp?, city?, lat?, lng?, wageMin?, wageMax?, shiftPref?, languages?, bio?, photoUrl?, maxRadiusKm? }`
- **Response 200**: `{ id, availableToday, passportPublic, profileViews }`.

### `GET /api/worker/dashboard` — Worker dashboard (DSH-02)
- **Auth**: `requireWorker()`.
- **Response 200**: `{ inReviewCount, profileViews, topRecommendedJobs[] }`
  - `topRecommendedJobs` = top 3 `MatchScore` rows for the worker (with `job` + `employer` + `trade` attached) — `topReason` derived from the breakdown JSON.

---

## Worker onboarding

### `POST /api/onboarding/worker` — 3-step onboarding submit (WRK-01/03/04)
- **Auth**: `requireUser(["worker"])`.
- **Body** (zod `OnboardWorkerBody`): `{ fullName, tradeId, yearsExp, city, lat, lng, wageMin, wageMax, shiftPref, languages, bio?, photoUrl?, availableToday?, maxRadiusKm?, skills[] }`.
- **Response 201**: `{ id, status: "ok" }` or **409 `ALREADY_ONBOARDED`** if the worker already has a profile.
- **Behavior**: Creates `WorkerProfile` + `WorkerSkill` rows. Pre-computes `MatchScore` rows for this worker × every open job (so the feed shows them immediately on first `/home` load).

---

## Notifications (worker)

### `GET /api/notifications` — List + unread count (WRK-10)
- **Auth**: `requireWorker()`.
- **Query**: `?unreadOnly=true&limit=50` (limit max 100).
- **Response 200**: `{ items: Notification[], unread }` — each item has `id, type, read, createdAt, payload` (parsed JSON).

### `PATCH /api/notifications/:id` — Mark as read (WRK-10)
- **Auth**: `requireWorker()` + owner check (`notification.userId === caller.id`).
- **Body** (inline zod): `{ read?: boolean (default true) }`
- **Response 200**: `{ id, read }`.

---

## Verifications (worker + employer + admin)

### `POST /api/verifications` — Upload a verification document (VER-01/04)
- **Auth**: `requireUser(["worker", "employer"])`.
- **Content-Type**: `multipart/form-data`.
- **Form fields**:
  - `file`: File (PDF/JPG/PNG, ≤5MB — server-side re-validated).
  - `docType`: `"id" | "skill_cert" | "company"` (zod `UploadVerificationBody`).
  - `fileName`, `fileType`, `fileSize`.
  - `skillId?` (required when `docType === "skill_cert"`).
- **Response 201**: `{ id, status: "pending", previewToken }`.
- **Behavior**: 
  - Role↔docType alignment (worker → id/skill_cert, employer → company).
  - Persists file bytes to `/storage` with mode `0o600` via `persistUpload()`.
  - Optionally calls `provider.ocrPrecheck?.(storedName)` if supported (Mock provider doesn't — `extractedJson` stays `"{}"`).
  - **VER-06**: Replaces the user's `fileName` with a masked safe name (`id-proof.pdf` / `skill-cert.pdf` / `company-registration.pdf`) — even if user named file "aadhaar-1234.pdf" the Aadhaar never reaches the DB.
  - Issues a fresh `previewToken` (HMAC-signed, 1-hour TTL) so the uploader can preview immediately.

### `GET /api/verifications` — Caller's own submitted docs (VER-02)
- **Auth**: `requireUser(["worker", "employer"])`.
- **Response 200**: `{ items: VerificationItem[] }` — masked labels only (`ID Proof` / `Skill Certificate — <skillName>` / `Company Registration`), never raw ID numbers.

### `GET /api/verifications/:id` — Single doc (owner only)
- **Auth**: `requireUser(["worker", "employer"])` + `doc.ownerUserId === caller.id`.
- **Response 200**: `{ id, docType, maskedLabel, displayFileName, fileType, status, reviewerNote, reviewedAt, submittedAt, previewToken, skillName }`.

### `GET /api/admin/verifications` — Admin queue (ADM-01)
- **Auth**: `requireAdmin()`.
- **Query**: `?status=pending|all` (default `pending`).
- **Response 200**: `{ items: AdminVerificationItem[], count }` — each item includes `owner` (resolved name via `worker_profile.fullName` or `employer_profile.companyName`), `extractedJson`, masked label. File bytes NOT returned here — admin must `POST /api/storage/sign` per-doc for preview.

### `PATCH /api/admin/verifications/:id` — Approve or reject (VER-02/03/04 + ADM-01)
- **Auth**: `requireAdmin()`.
- **Body** (zod `PatchVerificationBody`): `{ status: "approved"|"rejected", reviewerNote?, extractedJson? }`.
- **Response 200**: `{ id, status, reviewedAt, reviewedBy, reviewerNote, trust?, employerVerified? }` or **409 `ALREADY_REVIEWED`** if doc is already closed.
- **Behavior**: 
  - Sets `reviewedAt = new Date()`, `reviewedBy = admin.id`.
  - On `approve`:
    - If `docType=id|skill_cert` → looks up the worker's `WorkerProfile` via `userId` → calls `recomputeWorkerTrust(db, wp.id)` (VER-03 trust tier upgrade).
    - If `docType=company` → looks up the `EmployerProfile` → calls `recomputeEmployerVerified(db, ep.id)` (VER-04 verified-employer badge).
  - Pushes `verification` notification to the owner (so the worker/employer bell rings on next 15s poll).

---

## Admin (platform stats)

### `GET /api/admin/stats` — Platform stats strip (ADM-02)
- **Auth**: `requireAdmin()`.
- **Response 200**: `{ users, jobs, hires, pendingDocs }` — real Prisma counts.

### `POST /api/recompute` — Manual trust/verified recompute (MAT-02 + admin fallback)
- **Auth**: `requireAdmin()`.
- **Body**: `{ workerId?: string }` OR `{ employerId?: string }`.
- **Response 200**: `{ workerId, trustScore, trustTier }` or `{ employerId, isVerified }`.
- **Behavior**: Used to fix a stale tier without re-approving a doc (admin fallback path). Calls `recomputeWorkerTrust` or `recomputeEmployerVerified`.

---

## Match explanation

### `GET /api/match/explain` — Score breakdown + top-3 reasons (MAT-02)
- **Auth**: `requireUser()` (any-auth — workers see why-this-job, employers see why-this-candidate).
- **Query**: `?jobId=…&workerId=…`.
- **Response 200**: `{ jobId, workerId, score, breakdown: {S, D, E, W, T, bonus}, reasons: string[], distanceKm, embeddingBonus }`.
- **Behavior**: Calls `computeMatch` (live) + `explainMatch`. `embeddingBonus` is stubbed to 0 (MAT-04 COULD).

---

## AI

### `POST /api/ai/voice-profile` — Voice transcript → structured profile (WRK-03)
- **Auth**: `requireWorker()`.
- **Body** (zod `VoiceProfileBody`): `{ transcript: string (5-2000), lang: "en"|"hi"|"te" }`.
- **Response 200**: `VoiceProfileJSON` = `{ trade, yearsExp, wageMin, wageMax, bio, languages, city, confidence }`.
- **Behavior**: Calls `getAIProvider().extractVoiceProfile(transcript, lang)`. MockProvider uses deterministic regex/keyword extraction (trade keyword map for EN/HI/TE; year/wage/city regex). ZAIProvider uses `z-ai-web-dev-sdk`'s `chat.completions.create` with a strict-JSON system prompt and falls back to Mock on any error.

### `POST /api/ai/job-description` — Structured fields → job description (EMP-02)
- **Auth**: `requireEmployer()`.
- **Body** (zod `JobDescriptionBody`): `{ title, tradeId, headcount, wageMin, wageMax, city, shift, isUrgent }`.
- **Response 200**: `{ description: string }` (3-4 sentences, always editable before post per NFR-10).
- **Behavior**: Calls `getAIProvider().generateJobDescription(fields)`. MockProvider uses a deterministic template. ZAIProvider uses the LLM and falls back to Mock on error.

### `POST /api/ai/ocr-precheck` — Optional OCR pre-extraction (VER-05 COULD)
- **Auth**: `requireUser(["worker", "employer"])`.
- **Body** (inline zod): `{ fileUrl: string, docType: "id"|"skill_cert"|"company" }`.
- **Response 200**: `{ name: string|null, cert_type: string|null, note: string }`.
- **Behavior**: Duck-types `provider.ocrPrecheck`. If not supported (Mock doesn't, ZAI doesn't), returns `{ name: null, cert_type: null, note: "Manual review required" }` — graceful fallback. Never throws 500 on a COULD feature.

---

## Storage (signed URLs)

### `POST /api/storage/sign` — Issue signed URL token
- **Auth**: `requireUser(["worker", "employer"])` (owner path) OR `requireUser(["admin"])` (admin path).
- **Body**: `{ docId: string }`.
- **Response 200**: `{ token, ttl: 3600 }`.
- **Behavior**: 
  - Owner path: looks up the doc, verifies `doc.ownerUserId === caller.id`, issues token bound to `(storedName, ownerUserId=caller)`.
  - Admin path: signs token bound to `(storedName, doc.ownerUserId)` so any admin's token works for any doc.
  - Token = `base64url(storedName|ownerUserId|exp|HMAC)` — see `src/lib/storage/sign.ts`. TTL default 1 hour.

### `GET /api/storage/file?token=…` — Stream file bytes
- **Auth**: Implicit (token must verify).
- **Response 200**: file bytes with `Content-Type: application/pdf | image/jpeg | image/png` + `x-content-type-options: nosniff` + `cache-control: private, max-age=300`.
- **Errors**: `400 VALIDATION` (no token), `403 FORBIDDEN` (invalid/expired token), `404 NOT_FOUND` (file missing on disk).
- **Behavior**: `verifyFileToken(token)` validates HMAC signature + expiry. Defense-in-depth: `path.basename(verified.storedName) !== verified.storedName` rejects any path traversal attempt.

---

## Skills (taxonomy)

### `GET /api/skills` — All skills (any-auth)
- **Auth**: `requireUser()`.
- **Response 200**: `{ items: Skill[] }` ordered by `category asc, nameEn asc`. Used by the worker onboarding form, employer post-job form, candidate filters, verification skill picker.

---

## Public (no auth)

### `GET /api/public/worker/:slug` — Public Kaam Card data (PUB-01)
- **Auth**: none.
- **Response 200**: `{ id, firstName, trade: {nameEn, nameHi, nameTe}, yearsExp, city, wageMin, wageMax, shiftPref, availableToday, trustTier, trustScore, skills[], slug }`.
  - **PII minimization (PUB-01)**: only the first name (split on space, take first). Deliberately NOT included: `fullName` (last name), `email`, `phone`, `photoUrl`, `lat`, `lng`, `languages`, `bio`, `profileViews`, `maxRadiusKm`, `passportPublic`, `userId`.
- **Errors**: **404 NOT_FOUND** when worker not found OR `passportPublic === false` (PUB-03 privacy toggle — treated as if worker doesn't exist, no metadata leak).
- **Caching**: `public, max-age=60, s-maxage=300, stale-while-revalidate=600`.

---

## Endpoint summary table

| # | Method | Path | Auth | IDs |
|---|---|---|---|---|
| 1 | GET | `/api/jobs` | any-auth | WRK-05 |
| 2 | POST | `/api/jobs` | employer | EMP-01 |
| 3 | PATCH | `/api/jobs/:id` | owner employer | EMP-01 |
| 4 | POST | `/api/applications` | worker | WRK-06 |
| 5 | GET | `/api/applications/:id` | worker owner / employer owner | WRK-07, EMP-06 |
| 6 | PATCH | `/api/applications/:id` | employer owner | EMP-06 |
| 7 | GET | `/api/applications/mine` | worker | WRK-07 |
| 8 | POST | `/api/employer/shortlist` | employer (job owner) | EMP-06/07 |
| 9 | POST | `/api/employer/endorsements` | employer | EMP-07 |
| 10 | GET | `/api/employer/jobs` | employer | EMP |
| 11 | GET | `/api/employer/applications` | employer | EMP-06 |
| 12 | GET | `/api/candidates/search` | employer | EMP-03/04/05 |
| 13 | GET | `/api/worker/:id` | employer | EMP-04 |
| 14 | POST | `/api/worker/:id/view` | employer | DSH-02 |
| 15 | GET | `/api/worker/profile` | worker | WRK-02/04 |
| 16 | PATCH | `/api/worker/profile` | worker | WRK-02/04/08 |
| 17 | GET | `/api/worker/dashboard` | worker | DSH-02 |
| 18 | POST | `/api/onboarding/worker` | worker | WRK-01/03/04 |
| 19 | GET | `/api/notifications` | worker | WRK-10 |
| 20 | PATCH | `/api/notifications/:id` | worker (owner) | WRK-10 |
| 21 | POST | `/api/verifications` | worker/employer | VER-01/04/05/06 |
| 22 | GET | `/api/verifications` | worker/employer | VER-02 |
| 23 | GET | `/api/verifications/:id` | owner | VER-02 |
| 24 | GET | `/api/admin/verifications` | admin | ADM-01 |
| 25 | PATCH | `/api/admin/verifications/:id` | admin | VER-02/03/04 + ADM-01 |
| 26 | GET | `/api/admin/stats` | admin | ADM-02 |
| 27 | POST | `/api/recompute` | admin | MAT-02 (fallback) |
| 28 | GET | `/api/match/explain` | any-auth | MAT-02 |
| 29 | POST | `/api/ai/voice-profile` | worker | WRK-03 |
| 30 | POST | `/api/ai/job-description` | employer | EMP-02 |
| 31 | POST | `/api/ai/ocr-precheck` | worker/employer | VER-05 (COULD) |
| 32 | POST | `/api/storage/sign` | worker/employer/admin | VER-01 |
| 33 | GET | `/api/storage/file` | (signed token) | VER-01 |
| 34 | GET | `/api/skills` | any-auth | MAT-03 |
| 35 | GET | `/api/public/worker/:slug` | public | PUB-01/03 |
| 36 | * | `/api/auth/[...nextauth]` | public | AUTH-01 |

---

## Error reference

Every API route returns errors in this canonical shape:

```json
{ "error": "<CODE>", "issues"?: [...] }
```

| HTTP | Code | Meaning | Thrown by |
|---|---|---|---|
| 400 | `VALIDATION` | zod parse failed or missing field | every route's zod parse |
| 401 | `UNAUTHORIZED` | no session | `requireUser` / `requireWorker` / `requireEmployer` / `requireAdmin` |
| 403 | `FORBIDDEN` | role mismatch or row ownership check failed | `requireUser(allowedRoles)`, `assertJobOwner`, `assertApplicationOwnerForEmployer/Worker`, ownership checks in `/api/verifications/[id]` and `/api/notifications/[id]` |
| 404 | `NOT_FOUND` | row not found | route handlers after lookup |
| 409 | `ALREADY_ONBOARDED` | worker already has a `WorkerProfile` | `/api/onboarding/worker` |
| 409 | `ALREADY_REVIEWED` | admin trying to re-review a closed verification doc | `/api/admin/verifications/[id]` |
| 500 | `INTERNAL` | unhandled error | `errorResponse()` catch-all |

`console.error("[api] unhandled:", err)` fires only on the 500 path — so a clean lint + zero `console.error` in normal flows is verifiable from the dev log.
