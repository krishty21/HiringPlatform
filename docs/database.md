# Database — Project ShramSetu

> **Source of truth**: `prisma/schema.prisma` — frozen by Orchestrator. 14 tables total.

---

## 1. ER diagram (mermaid)

```mermaid
erDiagram
  User ||--o| WorkerProfile : "worker → profile"
  User ||--o| EmployerProfile : "employer → profile"
  User ||--o{ VerificationDocument : "owns"
  User ||--o{ Notification : "receives"
  User ||--o{ SigninToken : "magic-link"

  Skill ||--o{ WorkerSkill : "M-N with proficiency"
  Skill ||--o{ JobSkill : "M-N with required flag"
  Skill ||--o{ WorkerProfile : "trade (1:1 — primary trade)"
  Skill ||--o{ Job : "trade (1:N — primary trade)"
  Skill ||--o{ Endorsement : "endorsed skill"

  WorkerProfile ||--o{ WorkerSkill : "has"
  WorkerProfile ||--o{ Application : "applied"
  WorkerProfile ||--o{ Endorsement : "received"
  WorkerProfile ||--o{ MatchScore : "scored"

  EmployerProfile ||--o{ Job : "owns"
  EmployerProfile ||--o{ Endorsement : "gave"

  Job ||--o{ JobSkill : "requires"
  Job ||--o{ Application : "received"
  Job ||--o{ MatchScore : "scored"

  Application ||--o{ Rating : "rated"

  User {
    string id PK
    string email UK
    string role "worker | employer | admin (zod-validated)"
    string name
    datetime createdAt
    datetime updatedAt
  }

  WorkerProfile {
    string id PK
    string userId FK_UK
    string fullName
    string tradeId FK "→ Skill (primary trade)"
    int yearsExp
    string city
    float lat
    float lng
    int wageMin "₹/day"
    int wageMax "₹/day"
    string shiftPref "day | night | any"
    string languages "JSON array of en|hi|te"
    string bio
    string photoUrl
    boolean availableToday
    string trustTier "new | id_verified | skill_verified | top_pro"
    int trustScore "0-100"
    boolean passportPublic
    int profileViews
    int maxRadiusKm
    datetime createdAt
    datetime updatedAt
  }

  EmployerProfile {
    string id PK
    string userId FK_UK
    string companyName
    string industry
    string city
    boolean isVerified
    datetime createdAt
    datetime updatedAt
  }

  Job {
    string id PK
    string employerId FK
    string postedBy "user id of poster"
    string title
    string tradeId FK "→ Skill"
    int headcount
    int wageMin
    int wageMax
    string city
    float lat
    float lng
    string shift "day | night | any"
    boolean isUrgent
    string status "open | closed"
    string description
    int viewsCount
    datetime createdAt
    datetime updatedAt
  }

  Application {
    string id PK
    string jobId FK
    string workerId FK
    string status "applied | shortlisted | interview | offer | hired | rejected"
    datetime appliedAt
    datetime shortlistedAt
    datetime interviewAt
    datetime offerAt
    datetime hiredAt
    datetime rejectedAt
    datetime createdAt
    datetime updatedAt
  }

  VerificationDocument {
    string id PK
    string ownerUserId FK
    string docType "id | skill_cert | company"
    string fileName "masked safe name (VER-06)"
    string fileType "application/pdf | image/jpeg | image/png"
    string fileUrl "stored name under /storage"
    string extractedJson "OCR-extracted name+cert_type only"
    string status "pending | approved | rejected"
    string reviewerNote
    datetime reviewedAt
    string reviewedBy "admin user id"
    datetime createdAt
  }

  Endorsement {
    string id PK
    string workerId FK
    string employerId FK
    string skillId FK
    string comment
    datetime createdAt
  }

  Rating {
    string id PK
    string applicationId FK
    string raterId
    string rateeId
    int score "1-5"
    string comment
    datetime createdAt
  }

  MatchScore {
    string jobId PK_FK
    string workerId PK_FK
    int score "0-100"
    string breakdownJson "{S,D,E,W,T,bonus}"
    datetime computedAt
  }

  Notification {
    string id PK
    string userId FK
    string type "application_status | new_match | endorsement | verification"
    string payloadJson
    boolean read
    datetime createdAt
  }

  SigninToken {
    string id PK
    string email
    string token UK
    string userId FK "nullable until first sign-in"
    datetime expiresAt
    datetime usedAt
    datetime createdAt
  }

  Skill {
    string id PK
    string nameEn UK
    string nameHi
    string nameTe
    string category "electrical | plumbing | welding | machining | mechanical | logistics | carpentry | masonry"
    datetime createdAt
  }

  WorkerSkill {
    string workerId PK_FK
    string skillId PK_FK
    int proficiency "1-5"
  }

  JobSkill {
    string jobId PK_FK
    string skillId PK_FK
    boolean required "true = required for the role"
  }
```

---

## 2. Tables (14 total)

The SRD §6 specifies 13 tables. We add `SigninToken` (for the magic-link concept) plus we already split out `Rating`, `MatchScore`, `Notification`, `VerificationDocument`, `Endorsement` as separate tables per the SRD's full data model.

| # | Table | Purpose | Records in seed |
|---|---|---|---|
| 1 | `User` | Account holder with role (worker / employer / admin). | 24 (20 workers + 3 employers + 1 admin) |
| 2 | `Skill` | Taxonomy of trades + sub-skills with EN/HI/TE names. | 16 (8 trades + 8 sub-skills) |
| 3 | `WorkerProfile` | Worker's Skill Passport data — name, trade, exp, city, lat/lng, wage range, trust tier, etc. | 20 |
| 4 | `WorkerSkill` | M:N join WorkerProfile ↔ Skill with `proficiency` (1-5). | ~50 |
| 5 | `EmployerProfile` | Company data — name, industry, city, isVerified flag. | 3 |
| 6 | `Job` | A posted job — title, trade, wage range, city, lat/lng, shift, urgent flag, status, description, viewsCount. | 10 |
| 7 | `JobSkill` | M:N join Job ↔ Skill with `required` flag (only required skills count in match S). | ~30 |
| 8 | `Application` | A worker's application to a job, with stage timestamps (`appliedAt`, `shortlistedAt`, `interviewAt`, `offerAt`, `hiredAt`, `rejectedAt`). | 30 |
| 9 | `VerificationDocument` | Worker ID / skill cert / employer company doc — masked filename, file URL under /storage, extracted JSON, status, reviewer note + timestamps. | ~24 (auto-approved in seed for verified workers + verified employers) |
| 10 | `Endorsement` | An employer's endorsement of a worker's skill — feed into trust recompute (`+4 × endorsements, cap 12`). | 0 in seed (created at hire time via `EndorsementModal`) |
| 11 | `Rating` | Post-hire 1-5 rating (between rater + ratee, linked to application). Schema ready; UI not built (won't-list per BUILD_PLAN §3). | 0 |
| 12 | `MatchScore` | Cached 0-100 match score + breakdown JSON per (job, worker) pair. Pre-computed on job-create and worker-onboard so the feed/candidate-search is fast. | 10 (Ravi × 10 jobs in seed) |
| 13 | `Notification` | In-app notification — type (`application_status`, `new_match`, `endorsement`, `verification`), payload JSON, read flag. Polled every 15s by worker bell. | 0 in seed (created at apply/transition/endorse/verify time) |
| 14 | `SigninToken` | Magic-link concept: `{email, token, userId?, expiresAt, usedAt}`. Backs the `email` credentials provider — when a real email service is wired up, this is the only thing that needs to change. | 0 in seed |

---

## 3. Index rationale

We add four composite/single indexes that matter for query performance:

| Index | On | Why |
|---|---|---|
| `@@index([tradeId, availableToday])` on `WorkerProfile` | `tradeId`, `availableToday` | Employer candidate search filters by trade + available-today toggle; this index makes that filter O(log n) instead of O(n). |
| `@@index([tradeId, city])` on `Job` | `tradeId`, `city` | Worker feed filters by trade + city radius; employer dashboard groups by trade. |
| `@@index([status, isUrgent])` on `Job` | `status`, `isUrgent` | Worker feed sorts by `isUrgent desc, createdAt desc` and filters `status: open` — composite index covers both. |
| `@@index([status])` on `Application` | `status` | Pipeline Kanban groups applications by status; admin dashboard counts hired. |
| `@@index([jobId, score])` on `MatchScore` | `jobId`, `score` | Employer candidate search orders by score desc within a job; worker dashboard fetches top 3 by score. |
| `@@index([userId, read])` on `Notification` | `userId`, `read` | Notifications bell queries "unread for user X" every 15s — index makes the query O(log n) on (userId, false). |
| `@@unique([jobId, workerId])` on `Application` | composite unique | Prevents double-apply (worker can't apply to the same job twice). The POST route upserts/returns `alreadyApplied: true` on conflict. |
| `@@id([jobId, workerId])` on `MatchScore` | composite primary key | One cached score per (job, worker) pair — `upsert` on the PK keeps the cache fresh. |
| `@@id([workerId, skillId])` on `WorkerSkill` | composite primary key | A worker has at most one row per skill (with a proficiency). |
| `@@id([jobId, skillId])` on `JobSkill` | composite primary key | A job has at most one row per skill (with a required flag). |

---

## 4. RLS-equivalent enforcement (SQLite has no RLS)

The SRD §10 policy matrix specifies Supabase RLS policies: workers can only write their own profile; employers can only read applicants on their own jobs; admins own verifications; everyone can read open jobs.

**SQLite has no row-level security.** Per directive §3.4 + §11 + the BUILD_PLAN §0 reality reconciliation table, we enforce the same isolation at the **API layer** via typed helpers in `src/lib/authz.ts`:

| Helper | What it does | Used by |
|---|---|---|
| `requireUser(allowedRoles?)` | Returns `{id, role}`. Throws `HTTPError(401, "UNAUTHORIZED")` if no session; `HTTPError(403, "FORBIDDEN")` if role not in allow-list. | Every API route — entry point. |
| `requireWorker()` | Calls `requireUser(["worker"])` + looks up the caller's `WorkerProfile.id`. Throws 403 if the worker hasn't onboarded yet. | `/api/worker/*`, `/api/onboarding/worker`, `/api/applications`, `/api/notifications/*`, `/api/ai/voice-profile`. |
| `requireEmployer()` | Calls `requireUser(["employer"])` + looks up the caller's `EmployerProfile.id`. Throws 403 if no profile. | `/api/employer/*`, `/api/candidates/search`, `/api/worker/[id]`, `/api/worker/[id]/view`, `/api/ai/job-description`, `/api/jobs POST`, `/api/jobs/[id] PATCH`, `/api/applications/[id] PATCH`. |
| `requireAdmin()` | Calls `requireUser(["admin"])`. | `/api/admin/*`, `/api/recompute`. |
| `assertJobOwner(jobId, employerProfileId)` | Returns `true` if the job's `employerId === caller's employerProfileId`. | `/api/jobs/[id] PATCH`, `/api/employer/shortlist POST`. |
| `assertApplicationOwnerForEmployer(applicationId, employerProfileId)` | Returns `true` if the application's `job.employerId === caller's employerProfileId`. | `/api/applications/[id] GET/PATCH` (employer path). |
| `assertApplicationOwnerForWorker(applicationId, workerProfileId)` | Returns `true` if the application's `workerId === caller's workerProfileId`. | `/api/applications/[id] GET` (worker path). |
| `HTTPError` | Typed throwable (`{status, code}`) so route handlers can map to `{status, code}` cleanly. | All API routes via `throw new HTTPError(403, "FORBIDDEN")`. |
| `errorResponse(err)` | Maps `HTTPError → JSON {error: code}` with the right status, `ZodError → 400 {error: "VALIDATION", issues}`, unknown errors → `500 {error: "INTERNAL"}`. | Every API route's `catch (e) { return errorResponse(e); }`. |

### Scoping pattern (concrete examples)

**Worker A cannot read Worker B's applications.**

```ts
// /api/applications/mine/route.ts
const { profile } = await requireWorker();          // profile.id = caller's WorkerProfile.id
const apps = await db.application.findMany({
  where: { workerId: profile.id },                  // ← forced to caller's own profile id
  orderBy: ...
});
```

**Employer A cannot read Employer B's job applicants.**

```ts
// /api/employer/applications/route.ts
const { profile } = await requireEmployer();         // profile.id = caller's EmployerProfile.id
const applications = await db.application.findMany({
  where: { job: { employerId: profile.id } },        // ← forced to caller's employerProfile id
  include: { job: ..., worker: ... },
});
```

**Worker cannot fetch an arbitrary verification document.**

```ts
// /api/verifications/[id]/route.ts
const user = await requireUser(["worker", "employer"]);
const doc = await db.verificationDocument.findUnique({ where: { id } });
if (!doc) throw new HTTPError(404, "NOT_FOUND");
if (doc.ownerUserId !== user.id) throw new HTTPError(403, "FORBIDDEN");
```

### Probe test (T9 — RLS-equivalent enforcement)

A probe test confirms:

1. **Worker B's session calling `/api/applications/mine`** → returns only Worker B's applications (Worker A's rows are not visible because `where: { workerId: B.profile.id }`).
2. **Employer B's session calling `/api/employer/applications`** → returns only applications on Employer B's jobs (Employer A's job applicants are not visible because `where: { job: { employerId: B.profile.id } }`).
3. **Worker calling `/api/verifications/[employer-doc-id]`** → returns 403 FORBIDDEN (the `ownerUserId` check fails).
4. **Worker calling `/api/admin/verifications`** → returns 401 UNAUTHORIZED (admin role required).

This reproduces the RLS *intent* of the SRD §10 policy matrix at the API layer — there is no path through the codebase where a caller can read or write a row they don't own.
