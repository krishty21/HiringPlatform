# EXPLANATION_LOG — Project ShramSetu

> Per-module: 5-line plain explanation + one edge case + one key file.
> Source: BUILD_PLAN.md §6 workstream briefs + the actual `src/` source.

---

## 1. Auth (AUTH-01..05)

**Plain explanation**: NextAuth v4 with JWT sessions, three credentials providers wired through one frozen `authOptions` object in `src/lib/auth.ts`. The `demo` provider lets reviewers one-click sign in as Ravi (worker) / Priya (employer) / Admin via the `/login` page; the `email` provider consumes a `SigninToken` row (preserves the SRD magic-link *concept* for a future Supabase swap); the `email-only` provider auto-creates any email as a fresh worker (sandbox convenience). The JWT callback stuffs `id` and `role` into the token; the session callback exposes them on `session.user`. `src/proxy.ts` (Next.js 16 replacement for `middleware.ts`) reads `token.role` and redirects role-mismatched requests to the caller's canonical home.

**Edge case**: If a worker signs in for the first time without onboarding, `requireWorker()` throws `HTTPError(403, "FORBIDDEN")` — but the worker pages (`/home`, `/profile`) catch this and redirect to `/onboarding/worker` via a `useEffect` on `session.status`. The proxy lets the worker through to `/onboarding/*` because it's in the worker-area pattern.

**Key file**: `src/lib/auth.ts` (97 lines) + `src/proxy.ts` (40 lines).

---

## 2. Worker onboarding (WRK-01/03/04)

**Plain explanation**: Three-step wizard at `/onboarding/worker` — (1) trade grid picker (lucide icons grouped by category), (2) details form with city auto-fill (the same coastal AP city list as the seed), (3) wage range + radius + shift + skills picker with per-skill proficiency. The VoiceButton on step 2 records via Web Speech API (hi-IN/te-IN/en-IN BCP-47), POSTs the transcript to `/api/ai/voice-profile`, and prefills the form — the user always sees a Continue button (directive §10: "always editable before save"). Live profile-strength meter updates via `useMemo` on every keystroke. On submit, `POST /api/onboarding/worker` validates with frozen `OnboardWorkerBody` zod schema, creates `WorkerProfile` + `WorkerSkill` rows, and precomputes `MatchScore` rows against every open job so the feed is fast on first load.

**Edge case**: If the worker already has a profile (revisits the URL), `POST /api/onboarding/worker` returns `409 ALREADY_ONBOARDED`. The page catches this and redirects to `/home`.

**Key file**: `src/app/onboarding/worker/page.tsx` + `src/app/api/onboarding/worker/route.ts`.

---

## 3. Worker feed (WRK-05/06/08/09)

**Plain explanation**: `/home` is the worker's home — top section is a 2x2 StatCards grid (in-review count, profile views, available-today toggle, recommended-jobs link) showing `GET /api/worker/dashboard` data; below is the feed (`GET /api/jobs` with filters: trade Select, distance slider, wage min/max, shift, urgent-only). Each `JobCard` shows match score badge, urgent ribbon, employer verification badge, wage display, distance, one-tap Apply button (becomes "Applied" on success), and a WhatsApp `wa.me/?text=…` deep link. Available-today toggle PATCHes `/api/worker/profile` optimistically (with rollback on error). The feed redirects to `/onboarding/worker` if no profile.

**Edge case**: If the feed takes >1.5s, a slow-toast warns the user "Taking longer than usual…" per NFR-05. We use `setTimeout(load, 0)` in the `useEffect` to satisfy the `react-hooks/set-state-in-effect` lint rule without losing the polling behavior.

**Key file**: `src/app/home/page.tsx` + `src/components/worker/JobCard.tsx`.

---

## 4. Worker tracker (WRK-07)

**Plain explanation**: `/applications/[id]` renders the application detail with the premium package-tracking timeline (`TrackerTimeline.tsx` using `.tracker-line` + `.tracker-step-done/current/todo` CSS classes from `globals.css`). Each step shows the timestamp (`appliedAt`, `shortlistedAt`, `interviewAt`, `offerAt`, `hiredAt`, `rejectedAt`) drawn from the `Application` row. The page polls every 5s for live status updates so the timeline reflects an employer action within 5s. WhatsApp share button on the page.

**Edge case**: Rejected applications render a dedicated destructive card (instead of the regular timeline) so the worker isn't confused by a "rejected → interview → offer" track that never happened.

**Key file**: `src/app/applications/[id]/page.tsx` + `src/components/worker/TrackerTimeline.tsx`.

---

## 5. Worker profile (WRK-02/04)

**Plain explanation**: `/profile` is the Skill Passport — `.passport-card` styled card with the worker's name, `TrustTierBadge` (lg), `yearsExp`, city, `WageDisplay` (lg), skills with proficiency stars, endorsements list, and a side rail with available-today toggle + passport-public toggle + profile-views StatCard + verify-now CTA. The `profileStrength` meter (0-100) is computed server-side in `GET /api/worker/profile` per the directive: `30 base + 10 × required fields filled + 5 × skills (cap 25) + 10 bio>50 + 10 photo + 10 verified`. All fields are editable inline; PATCH `/api/worker/profile` updates the row.

**Edge case**: `languages` is stored as a JSON string column (SQLite has no arrays). The GET endpoint parses `wp.languages` to an array before returning; the PATCH endpoint serializes the array back to a string. Parse failures default to `[]`.

**Key file**: `src/app/profile/page.tsx` + `src/app/api/worker/profile/route.ts`.

---

## 6. Employer post (EMP-01/02)

**Plain explanation**: `/employer/post` renders `JobPostForm.tsx` — `react-hook-form` + zod (`CreateJobBody`), trade Select from `/api/skills`, skills multi-select chips with per-skill required-toggle, known coastal AP cities dropdown auto-fills `lat/lng`, and an AI description button (EMP-02). The button calls `POST /api/ai/job-description` → `getAIProvider().generateJobDescription(fields)` → MockProvider returns deterministic 3-4 sentence text; the textarea is always editable before submit (NFR-10). Post time is measured and shown in a toast ("Posted in 1.2s").

**Edge case**: If the AI endpoint errors or times out, the form continues to work without AI — the description field is a plain textarea the user can fill manually.

**Key file**: `src/app/employer/post/page.tsx` + `src/components/employer/JobPostForm.tsx`.

---

## 7. Employer candidates (EMP-03/04/05)

**Plain explanation**: `/employer/candidates` shows the sidebar `CandidateFilters` (trade, experience range, distance slider, trust tier, wage range, language, available-today Switch) and a responsive grid of `CandidateCard` components. Each card shows `MatchScoreBadge` (lg) + top reason + `TrustTierBadge` + available-today chip + distance + skill chips + `WageDisplay`; clicking opens `/employer/candidates/[id]` (the Skill Passport view for employer). The candidate search calls `GET /api/candidates/search` (zod `SearchCandidatesQuery`) which computes match scores live via `computeMatch` and returns ranked workers. When `urgentJobId` is passed (from the "Find candidates" CTA on `/employer/jobs`), the API sorts `availableToday=true` workers first within the same score band (EMP-05).

**Edge case**: When `urgentJobId` is missing and only filters are provided, the API builds a "synthetic" scoring job (using the employer's city centroid as the job's lat/lng and the filters' wage range). This means the absolute scores in this mode are not directly comparable to a specific job posting — but the *ranking* is meaningful.

**Key file**: `src/app/employer/candidates/page.tsx` + `src/app/api/candidates/search/route.ts`.

---

## 8. Employer pipeline (EMP-06/07)

**Plain explanation**: `/employer/pipeline` renders `PipelineKanban.tsx` — a 6-column board (Applied → Shortlisted → Interview → Offer → Hired → Rejected) with `@dnd-kit/core` drag-and-drop (pointer + keyboard sensors). Each card has per-card action buttons (always visible) plus a dropdown menu for accessibility & mobile. Cross-column drag transitions the application via `PATCH /api/applications/:id`. The Applied column has bulk-shortlist checkboxes. Hiring a worker (move to Hired column or click the hire button) triggers the `EndorsementModal` (EMP-07) — the employer can pick a skill + write a comment, which POSTs to `/api/employer/endorsements` and bumps the worker's trust via `recomputeWorkerTrust`.

**Edge case**: Drag-and-drop on mobile (375px) becomes horizontally scrollable — the columns preserve their usability; touch targets stay ≥44px (enforced globally in `globals.css`). A local overrides map avoids setState-in-effect lint in the DnD handlers.

**Key file**: `src/app/employer/pipeline/page.tsx` + `src/components/employer/PipelineKanban.tsx`.

---

## 9. Employer dashboard (DSH-01/03)

**Plain explanation**: `/employer/dashboard` renders `GET /api/dashboard/employer` data — the headline `TimeToHireHeadline` (huge `38.5 hrs` numerals from real seeded data via `SELECT AVG((hiredAt - appliedAt) / 3600000.0) FROM Application WHERE status='hired' AND jobId IN (…)`), 4 StatCards (active jobs, new applicants today, hires this week, all-time hired), `FunnelChart` (CSS bars for Views → Applied → Shortlisted → Interview → Hired), and a list of `PerJobDrilldownRow` cards. Each drill-down row is expandable to show applicants-by-stage, total views, and a 5-bar SVG `ScoreDistributionSparkline` (buckets 0-20, 21-40, 41-60, 61-80, 81-100, colored rose→orange→amber→emerald). The row CTA links to `/employer/pipeline?jobId=…`.

**Edge case**: `julianday` formula returned NULL because Prisma+SQLite stores DateTime as INTEGER ms (verified via `typeof(appliedAt) === "integer"`). Switched to direct subtraction `(hiredAt - appliedAt) / 3600000.0` — validated against JS Date subtraction.

**Key file**: `src/app/employer/dashboard/page.tsx` + `src/app/api/dashboard/employer/route.ts`.

---

## 10. Verification upload (VER-01..06)

**Plain explanation**: `/verify` shows role-aware UI — workers see ID upload + skill cert upload dropzones (with skill picker from `/api/skills`); employers see company registration upload dropzone. The `VerificationList` below shows submitted docs with statuses, masked labels, and a Preview button that opens a Dialog with iframe (PDF) or img (image). On upload, `UploadDropzone` POSTs `multipart/form-data` to `/api/verifications` (zod `UploadVerificationBody`); the server validates MIME + size again, persists to `/storage` (mode `0o600`), replaces the user filename with a masked safe name (`id-proof.pdf` etc.), optionally calls `provider.ocrPrecheck?.(storedName)` (Mock doesn't support → `extractedJson` stays `"{}"`), and issues a fresh signed preview token.

**Edge case**: If the user names their file `aadhaar-1234-5678-9012.pdf`, the server replaces it with `id-proof.pdf` before storing in the DB — the Aadhaar never reaches the database (VER-06). The original filename is lost on disk too (stored name is `<timestamp>-<random>.pdf`).

**Key file**: `src/app/verify/page.tsx` + `src/components/verification/UploadDropzone.tsx` + `src/app/api/verifications/route.ts`.

---

## 11. Admin queue (ADM-01/02)

**Plain explanation**: `/admin` shows 4 StatCards (Users, Jobs, Hires, Pending Docs) from `GET /api/admin/stats` — the Pending Docs card links to `/admin/verifications` (the queue). The queue is a shadcn `Table` of pending docs (`GET /api/admin/verifications?status=pending`); each row shows masked label, owner name (resolved via `worker_profile.fullName` or `employer_profile.companyName`), submitted date, status badge, and a "Review" button. Clicking opens `AdminQueueItem` (a right-side Sheet drawer) that fetches a signed preview token via `POST /api/storage/sign { docId }`, renders the doc preview (iframe for PDF / img for image), shows extracted fields (or "Manual review required" AlertCircle note when Mock provider didn't extract), and provides Approve/Reject buttons + reviewer note Textarea. After PATCH, the row is removed from the queue and the owner's trust/verified flag is recomputed (VER-03/04) + a notification is pushed.

**Edge case**: Re-reviewing a closed doc returns `409 ALREADY_REVIEWED`. The admin drawer gracefully displays this and disables the action buttons.

**Key file**: `src/app/admin/verifications/page.tsx` + `src/components/verification/AdminQueueItem.tsx`.

---

## 12. Public Kaam Card (PUB-01/02/03)

**Plain explanation**: `/c/[slug]` is a public, logged-out-accessible page. The RSC server component fetches the worker directly from Prisma; if `passportPublic === false`, renders `KaamCardDisabled` (no other data exposed). If the worker doesn't exist, renders `KaamCardNotFound`. Otherwise, the client `KaamCard` component renders a passport-styled card with `.passport-stamp` rotated -6deg dashed-border stamp shown when `trustTier >= skill_verified`. Only **first name** (split on space, take first) is exposed — never the full name, email, phone, photo, lat/lng, address beyond city. The "Contact via ShramSetu" CTA gates behind `/login`. A "Share on WhatsApp" button uses `wa.me/?text=…` with first name + trade + share URL. `generateMetadata()` wires `openGraph` + `twitter` card meta tags pointing to `/c/[slug]/opengraph-image` (1200×630 PNG via `next/og` `ImageResponse`).

**Edge case**: If the worker toggles `passportPublic` to false, the public page returns a 404-equivalent UI — no metadata leak (the worker is treated as if they don't exist).

**Key file**: `src/app/c/[slug]/page.tsx` + `src/components/public/KaamCard.tsx` + `src/app/c/[slug]/opengraph-image.tsx`.

---

## 13. Matching engine (MAT-01/02/03)

**Plain explanation**: Pure TypeScript function `computeMatch(worker, job) → { score, breakdown: {S, D, E, W, T, bonus} }` in `src/lib/matching/score.ts`. The five components are weighted `0.35 S + 0.25 D + 0.15 E + 0.15 W + 0.10 T + bonus` (capped at +5) → `score = clamp(round(100 × weighted_sum + bonus), 0, 100)`. `explainMatch()` sorts the components by `weight × contribution` and returns the top 3 plain-language reasons. Scores are **cached** in the `MatchScore` table (`(jobId, workerId)` composite primary key) — `/api/jobs` POST precomputes against all workers, `/api/onboarding/worker` POST precomputes against all open jobs, `/api/jobs` GET reads cached scores and falls back to live `computeMatch` on cache miss. `/api/match/explain` calls `computeMatch` live for the "Why X" panel.

**Edge case**: When the job has zero `required:true` skills (rare in our seed but possible in user input), the S computation falls back to `1 if worker.tradeId === job.tradeId else 0` — so the trade match alone doesn't zero out the score.

**Key file**: `src/lib/matching/score.ts` + `src/lib/matching/explain.ts` + `src/lib/matching/haversine.ts`.

---

## 14. Trust recompute (VER-03/04)

**Plain explanation**: Pure `computeTrustScore(inputs)` in `src/lib/trust/recompute.ts` returns `30 + 20 (idVerified) + min(30, 10×approvedSkillCerts) + min(10, 5×completedHires) + min(12, 4×endorsements)` capped at 100. `tierFromScore(score)` maps 0-39→new, 40-59→id_verified, 60-84→skill_verified, 85+→top_pro. `recomputeWorkerTrust(db, workerId)` runs four parallel Prisma counts (id approved, skill_cert approved, hires, endorsements), calls `computeTrustScore` + `tierFromScore`, and updates `workerProfile.{trustScore, trustTier}`. `recomputeEmployerVerified(db, employerProfileId)` counts approved `company` docs → updates `employerProfile.isVerified`. Called from: admin verification PATCH (VER-03/04), employer endorsements POST (EMP-07), admin recompute fallback.

**Edge case**: If a worker has 3 approved skill certs (uncapped would be +30), the cap kicks in at +30 (so a 4th cert doesn't add more). The unit test in `src/lib/trust/__tests__/recompute.test.ts` explicitly verifies `4 certs → 80` (same as 3 certs).

**Key file**: `src/lib/trust/recompute.ts` (78 lines).

---

## 15. AI provider — Mock + ZAI

**Plain explanation**: Frozen `AIProvider` interface in `src/lib/ai/provider.ts` exposes three methods: `extractVoiceProfile(transcript, lang)`, `generateJobDescription(fields)`, and an optional `ocrPrecheck?(fileUrl)`. `MockProvider` is the default — deterministic regex/keyword extraction (Telugu trade keywords in Telugu Unicode; English word-to-number map for "eight" → 8; wage range parser for "₹800 to 1000 per day"; city keyword scan for Bhimavaram/Vijayawada/…). `ZAIProvider` is the opt-in real provider (set `AI_PROVIDER=zai`) — lazily imports `z-ai-web-dev-sdk`, sends a strict-JSON system prompt for voice extraction + a 3-4 sentence description prompt for job descriptions, and **silently falls back to Mock on any error**. The factory `getAIProvider()` caches the choice for the process lifetime.

**Edge case**: The Mock provider's `extractVoiceProfile` strips parsed fragments out of the bio (so the bio doesn't repeat "8 years, ₹800, Bhimavaram" after they've been parsed into structured fields). If the bio is empty after stripping, it falls back to `${trade ?? "Worker"} from ${city ?? "Andhra Pradesh"}.` so the field is never literally empty.

**Key file**: `src/lib/ai/mock-provider.ts` (129 lines) + `src/lib/ai/zai-provider.ts` (75 lines).

---

## 16. i18n (I18N-01..04)

**Plain explanation**: Three full dictionaries in `src/lib/i18n/{en,hi,te}.ts` — every visible string used by any screen has a key in all three languages. `LanguageProvider.tsx` wraps the app in client context; `useLanguage().t(key, vars?)` is the access pattern (vars are interpolated into the string). The language preference is persisted in `localStorage` and shared between the public landing + the authenticated app. The `LanguageToggle` (compact) component is wired into the `LandingHeader` + `KaamCardHeader` + `AppShell` so users can switch language from anywhere. All 21 NEW keys added by WS6 (kaamCard*, landingHowItWorks*, landingStep*, etc.) are present consistently in all three dictionaries.

**Edge case**: Some legacy strings in frozen-territory files (placeholders, aria-labels) are still hardcoded English — flagged in the WS6 audit log for a future i18n completion pass. These are not in the public-facing screens; users see them only when logged in as employer/admin on internal pages.

**Key file**: `src/lib/i18n/en.ts` (canonical) + `src/lib/i18n/LanguageProvider.tsx`.

---

## 17. Storage signed URLs

**Plain explanation**: `src/lib/storage/sign.ts` provides three functions: `persistUpload(buf, fileName)` writes file bytes to `/storage` (dir mode `0o700`, file mode `0o600`) with a random stored name `<timestamp>-<8 random bytes><ext>`; `signFileToken(storedName, ownerUserId, ttlSec=3600)` returns `base64url(storedName|ownerUserId|exp|HMAC_SHA256(payload))`; `verifyFileToken(token)` decodes, validates HMAC signature + expiry, returns `{storedName, ownerUserId, exp}` or `null` on any failure. The two API routes (`/api/storage/sign` POST + `/api/storage/file` GET) use these helpers. `/api/storage/sign` has two paths: worker/employer owner-path (must own the doc) + admin-path (signs token bound to the doc's true owner so any admin's token works for any doc). `/api/storage/file` validates the token, then streams the file bytes with the right `Content-Type`, `x-content-type-options: nosniff`, and `cache-control: private, max-age=300`.

**Edge case**: A token signed by an admin is bound to the doc's `ownerUserId` (not the admin's user id) — this is intentional so the same `verifyFileToken` works regardless of who signed. The auth check happens at `/api/storage/sign` (admin role required), not at `/api/storage/file` (which is auth-implicit via the signed token).

**Key file**: `src/lib/storage/sign.ts` (48 lines) + `src/app/api/storage/file/route.ts`.

---

## 18. Notifications (WRK-10)

**Plain explanation**: `src/lib/notifications.ts` provides `pushNotification(userId, type, payload)` (inserts a row), `listNotifications(userId, opts?)` (lists with optional unread filter), and `unreadCount(userId)`. The `useNotifications` hook (`src/hooks/use-notifications.ts`) polls `GET /api/notifications` every 15s and exposes `{ items, unread, refresh, markAllRead }`. The `NotificationsBell` component (in `src/components/worker/NotificationsBell.tsx`) is a bell icon with an unread badge + a dropdown scrollable list — clicking a notification navigates to the relevant page (`/applications/[id]` or `/jobs/[id]`). Mark-all-read calls `PATCH /api/notifications/[id]` per unread notification (owner-only — `notification.userId === caller.id`). Notifications are pushed on: apply (`application_status` to employer), stage transition (`application_status` to worker), endorsement (`endorsement` to worker), verification review (`verification` to owner).

**Edge case**: The hook silently swallows network errors during polling — no toast, no console.error. This means transient failures don't disrupt the worker's UX; the bell simply doesn't update that tick.

**Key file**: `src/hooks/use-notifications.ts` + `src/components/worker/NotificationsBell.tsx`.
