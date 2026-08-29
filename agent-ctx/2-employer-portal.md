# Work Record — Task ID: 2 (WS2) — Employer Portal

**Agent**: B2 Employer Portal
**Task**: Implement all 7 EMP requirements (post job + AI description, my jobs, candidate search ranked by match, Skill Passport view, urgent/available-today sort, pipeline Kanban, hire + endorsement).

## Work Log
- Read worklog + BUILD_PLAN + frozen contracts (schema, authz, auth, i18n, AI provider, matching, trust recompute, shared components).
- Built backend API routes (employer-scoped, zod-validated at boundary):
  - `GET /api/skills` — skills taxonomy (any-auth)
  - `GET /api/candidates/search` — ranked workers by match score (employer auth, uses `computeMatch` + `explainMatch`, EMP-05: urgentJobId promotes available-today workers)
  - `GET /api/employer/jobs` — jobs posted by caller + applicant counts (owner-scoped)
  - `GET /api/employer/applications` — all applications for caller's jobs (pipeline data source; optional `?jobId=` filter)
  - `POST /api/employer/endorsements` — insert Endorsement, then call `recomputeWorkerTrust` + notify worker (EMP-07)
  - `POST /api/employer/shortlist` — employer-initiated shortlist (creates or transitions application to "shortlisted", notifies worker)
  - `POST /api/worker/[id]/view` — increment `worker_profiles.profile_views` (DSH-02)
  - `GET /api/worker/[id]` — candidate Skill Passport payload for employer (EMP-04)
  - `POST /api/ai/job-description` — calls `getAIProvider().generateJobDescription()` (WS4 fallback — created here because the route was missing)
- Built shared employer components in `src/components/employer/`:
  - `JobPostForm.tsx` — react-hook-form + zod (CreateJobBody); trade Select populated from `/api/skills`; skills multi-select with required-toggle chips filtered by trade; known coastal AP cities dropdown auto-fills lat/lng; AI description button (EMP-02) → fills textarea, always editable before submit (NFR-10 human-in-the-loop); post time measured and shown in toast.
  - `CandidateCard.tsx` — MatchScoreBadge (lg) + top reason + TrustTierBadge + available-today + distance + skill chips + WageDisplay; links to passport view.
  - `CandidateFilters.tsx` — trade/experience/distance slider/trust tier/wage/language Select + available-today Switch; debounced auto-search.
  - `EndorsementModal.tsx` — Dialog with skill Select + comment Textarea; POSTs `/api/employer/endorsements`.
  - `PipelineKanban.tsx` — DndContext + DragOverlay + SortableContext per column; 6 columns (Applied→Shortlisted→Interview→Offer→Hired→Rejected); per-card action buttons (always visible) + dropdown menu for accessibility & mobile; bulk-shortlist checkboxes in Applied column; hire action triggers EndorsementModal; cross-column drag-and-drop via pointer/keyboard sensors; horizontal-scroll on mobile 375px. Local overrides map avoids setState-in-effect lint.
- Built employer pages in `src/app/employer/`:
  - `post/page.tsx` (EMP-01/02) — AppShell + JobPostForm + skills fetch
  - `jobs/page.tsx` — AppShell + shadcn Table of posted jobs with applicant counts + urgent flag + per-job pipeline link
  - `candidates/page.tsx` (EMP-03/04/05) — AppShell + sidebar CandidateFilters + responsive grid of CandidateCard; reads `?urgentJobId=` to honor EMP-05
  - `candidates/[id]/page.tsx` (EMP-04) — AppShell + passport-card styled Skill Passport view; avatar, TrustTierBadge (lg), skills with star proficiency, endorsements list, distance from caller's employer city; side rail with Shortlist (POST /api/employer/shortlist) + Endorse button; bumps profile_views on mount
  - `pipeline/page.tsx` (EMP-06/07) — AppShell + job filter Select + PipelineKanban
- Used frozen shared components (AppShell, MatchScoreBadge, TrustTierBadge, WageDisplay, VerificationBadge, EmptyState, LoadingSkeleton, StatCard) — did not redefine them.
- All visible strings via `useLanguage().t()` (i18n EN/HI/TE keys already present in frozen dictionary).
- Sonner toasts on every mutation (post job, shortlist, hire, endorse, stage transition).
- Lint: `bun run lint` — 0 errors in any file (own + existing).
- TypeScript strict — no `any` of consequence.

## Stage Summary
- All 7 EMP requirements + acceptance criteria met:
  - EMP-01 ✅ — job post live in feed <10s (route `/api/jobs` POSTs + precomputes match scores; form measures elapsed time and shows in toast)
  - EMP-02 ✅ — AI description generated in <5s via `/api/ai/job-description` → MockProvider returns deterministic 3-4 sentence text; editable textarea before post
  - EMP-03 ✅ — candidate search filters (trade, experience range, distance slider, trust tier, wage range, available-today, language) and results ranked by match score desc
  - EMP-04 ✅ — candidate card shows match score + top reason; passport view shows TrustTierBadge, skills with proficiency, experience, wage, distance, endorsements
  - EMP-05 ✅ — when `urgentJobId` is passed, available-today workers sort first within score band (visible in `/employer/candidates?urgentJobId=...` and pipeline cards)
  - EMP-06 ✅ — Kanban with 6 stages; drag-and-drop + per-card action buttons (always visible) + bulk shortlist; transitions PATCH `/api/applications/:id` and persist + notify worker (notifications.ts used by existing route)
  - EMP-07 ✅ — hire action sets `hiredAt` (existing PATCH route handles timestamp); EndorsementModal prompts optional endorsement → POST `/api/employer/endorsements` → `recomputeWorkerTrust` runs → badge visible next load + worker notified
- DSH-02 ✅ — employer opening candidate detail increments `worker_profiles.profile_views` via POST `/api/worker/[id]/view`
- Mobile 375px: pipeline columns become horizontally scrollable (`overflow-x-auto` + `shramsetu-scroll`); cards stay usable; touch targets ≥44px (enforced globally in globals.css)
- Files produced (own territory):
  - 5 employer pages
  - 5 employer components
  - 8 API routes (skills, candidates/search, employer/jobs, employer/applications, employer/endorsements, employer/shortlist, worker/[id], worker/[id]/view, ai/job-description)
- Frozen contracts consumed unchanged; no contract modifications requested.
