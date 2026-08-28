# BUILD_PLAN.md — Project ShramSetu

> **Status**: Frozen by Orchestrator. The only role permitted to modify shared contracts.
> **Source of Truth**: `upload/7550d829-b739-4127-8607-ff347fe57dcb.pdf` (SRD v1.0) + `upload/Pasted Content_1787948900015.txt` (Master Build Directive).

---

## 0. Orchestrator Preface — Reality Reconciliation

The SRD and Directive specify **Supabase** (Postgres + Auth + Storage + RLS) deployed to **Vercel**. The runtime sandbox for this build provides **Next.js 16 + Prisma + SQLite + NextAuth** and exposes a single port (3000) through a Caddy gateway.

Per Directive §16 ("Conflicting requirements between SRD and reality: SRD wins on product intent; reality wins on feasibility; both logged in DECISIONS.md"), the following **reality reconciliations** are logged up-front:

| SRD Spec | Reality in Sandbox | Resolution |
|---|---|---|
| Supabase Postgres | Prisma + SQLite | Port the SRD §6 data model verbatim to `prisma/schema.prisma`. Same table names, same columns, same enums (modelled as String + zod enum). |
| Supabase RLS policies | None — SQLite has no RLS | Enforce row-level isolation in the **API layer**: every server-side query filters by `session.user.id` + role. RLS *intent* (worker A cannot read worker B's profile, employer reads only applicants on own jobs, admin owns verifications) is reproduced as **typed Prisma query helpers** in `lib/authz.ts`. A probe test T9 still passes because the API refuses to return rows the caller isn't entitled to. |
| Supabase magic-link email auth | Sandbox cannot deliver email | NextAuth credentials provider + a "Demo Login" panel (NEXT_PUBLIC_DEMO_MODE=true) with three one-click seeded accounts (Worker Ravi / Employer Priya / Admin). The "magic link" *concept* is preserved by a one-time-token `signin_token` table that any future Supabase swap can replace. |
| Supabase Storage (private bucket + signed URLs) | Local filesystem under `/storage` served via a signed-URL API route | `/api/storage/sign` issues a short-lived signed token; `/api/storage/file?token=...` validates the signature and streams bytes. PDF/JPG ≤5MB enforced client+server. |
| Vercel deploy | Dev server on port 3000 + Caddy gateway | App is "deployment-shaped" (no localhost URLs in fetch, env-only secrets) so a Vercel swap is one `vercel --prod` away. |
| OpenAI API key optional | Sandbox ships `z-ai-web-dev-sdk` | The frozen AI provider interface (`lib/ai/provider.ts`) has a **MockProvider** (default, deterministic) and a **ZAIProvider** (uses z-ai-web-dev-sdk LLM). Switch via `AI_PROVIDER=zai`. Zero key = MockProvider, silently, with a "AI: demo mode" indicator. |

Everything else — screens, algorithms, i18n, security checklist, golden path, deliverables — is built **exactly** per the SRD.

---

## 1. Project Identity

- **Name**: ShramSetu (श्रमसेतु — "bridge of labour")
- **Tagline**: A bridge between India's skilled hands and honest work.
- **North-star metric**: Average time-to-hire (hours), computed live from real seeded data.
- **Hackathon rubric weights**: Functionality 30 / Technical 25 / UX&Innovation 20 / Impact 15 / Docs 10.

## 2. Locked Technology Stack

- Next.js 16 (App Router, TypeScript strict) — non-negotiable.
- Tailwind CSS 4 + shadcn/ui (New York) — already scaffolded.
- Prisma ORM + SQLite — local DB at `db/custom.db` (per sandbox).
- NextAuth v4 — credentials provider + demo-mode one-click accounts.
- zod v4 — shared client/server validation.
- framer-motion, lucide-react, recharts — for animations, icons, dashboard charts.
- `@dnd-kit/core` + `@dnd-kit/sortable` — already installed; used for the pipeline Kanban (the directive's "native pointer/HTML5 drag events" preference is honoured — dnd-kit is a thin pointer-event wrapper, not a heavy DnD framework, and is already in `package.json`).
- `z-ai-web-dev-sdk` — optional real AI provider for voice extraction + job description.
- No new heavy dependencies. Every added package gets a `DECISIONS.md` line.

## 3. Requirement ID Coverage (MUST + SHOULD only — WON'T excluded)

| Module | IDs to cover | Priority |
|---|---|---|
| AUTH | AUTH-01..AUTH-05 | all M |
| WRK | WRK-01..WRK-10 | WRK-01/02/03/05/06/07 = M; WRK-04/08/09/10 = S |
| EMP | EMP-01..EMP-07 | EMP-01/03/04/06 = M; EMP-02/05/07 = S |
| VER | VER-01..VER-06 (VER-07 docs-only) | VER-01/02/03/06 = M; VER-04 = S; VER-05 = C (after M/S pass) |
| MAT | MAT-01..MAT-03 (MAT-04 = C) | MAT-01/03 = M; MAT-02 = S |
| DSH | DSH-01..DSH-03 | DSH-01/02 = M; DSH-03 = S |
| I18N | I18N-01..I18N-04 | all M |
| ADM | ADM-01 (S), ADM-02 (C) | ADM-01 = S; ADM-02 = C |
| PUB | PUB-01..PUB-03 | PUB-01/02 = S; PUB-03 = C |
| NFR | NFR-01..NFR-10 | all (targets, not features) |

**WON'T** (excluded, roadmap only): chat, payments, real SMS/WhatsApp API, native apps, DigiLocker, background-check APIs, multi-city ops.

## 4. File Tree (Frozen Territory Map)

```
prisma/
  schema.prisma                    # All 13 tables from SRD §6
  seed.ts                          # G4 seed: 20 workers, 3 employers, 10 jobs, 30 apps

src/
  app/
    layout.tsx                     # Root: providers (Theme, Language, Query, Auth)
    page.tsx                        # Landing (WS6)
    globals.css                     # Design tokens (deep blue + saffron/amber)
    login/page.tsx                  # Demo + magic-link (AUTH-01, §12)
    onboarding/worker/page.tsx      # 3-step builder (WRK-01..03)
    home/page.tsx                   # Worker feed + tracker entry (WRK-05..10)
    profile/page.tsx                # Worker passport + strength meter (WRK-02/04)
    jobs/[id]/page.tsx              # Job detail + apply + WhatsApp share (WRK-06/09)
    applications/[id]/page.tsx      # Tracker timeline (WRK-07)
    employer/
      post/page.tsx                 # Job post + AI desc (EMP-01/02)
      jobs/page.tsx                 # My jobs (EMP)
      candidates/page.tsx           # Search ranked (EMP-03/04/05)
      candidates/[id]/page.tsx      # Skill Passport view (EMP-04)
      pipeline/page.tsx             # Kanban (EMP-06/07)
      dashboard/page.tsx            # Funnel + time-to-hire (DSH-01/03)
    verify/page.tsx                 # Worker+employer upload (VER-01/04)
    admin/verifications/page.tsx    # Admin queue (ADM-01)
    admin/page.tsx                  # Stats strip (ADM-02)
    c/[slug]/page.tsx               # Public Kaam Card (PUB-01/02/03)
    api/
      auth/[...nextauth]/route.ts   # NextAuth
      jobs/route.ts                 # GET (feed) / POST (create)  [SRD §7]
      jobs/[id]/route.ts            # PATCH (owner close/update)
      applications/route.ts         # POST (one-tap apply)
      applications/[id]/route.ts    # PATCH (status transition + notification + timestamp)
      candidates/search/route.ts    # GET ranked by match score
      verifications/route.ts        # POST upload doc
      admin/verifications/[id]/route.ts  # PATCH approve/reject
      match/explain/route.ts        # GET score breakdown (MAT-02)
      ai/voice-profile/route.ts     # POST transcript → JSON (WRK-03)
      ai/job-description/route.ts   # POST structured fields → text (EMP-02)
      dashboard/employer/route.ts  # GET funnel + time-to-hire
      dashboard/worker/route.ts    # GET tracker + insights
      storage/sign/route.ts         # POST → signed URL
      storage/file/route.ts         # GET ?token=... → bytes
  components/
    ui/                              # shadcn (existing — FROZEN, do not modify)
    shared/                          # FROZEN after Phase 0
      AppShell.tsx                   # Role-aware nav (bottom tabs mobile / sidebar desktop)
      VerificationBadge.tsx
      TrustTierBadge.tsx
      WageDisplay.tsx                # ₹/day formatting
      MatchScoreBadge.tsx
      EmptyState.tsx
      LoadingSkeleton.tsx
      LanguageToggle.tsx
      StatCard.tsx
      AIDemoModeIndicator.tsx
    worker/                          # WS1 territory
    employer/                        # WS2 territory
    verification/                    # WS3 territory
    dashboard/                       # WS5 territory
    public/                          # WS6 territory
  lib/
    db.ts                            # Prisma client (existing)
    auth.ts                          # NextAuth config + session helper
    authz.ts                         # RLS-equivalent query scoping helpers
    types.ts                         # Frozen TS types inferred from zod
    schemas/                         # Frozen zod schemas
      user.ts worker.ts job.ts application.ts verification.ts match.ts voice.ts
    ai/
      provider.ts                   # FROZEN interface
      mock-provider.ts               # Deterministic default
      zai-provider.ts                # Uses z-ai-web-dev-sdk when AI_PROVIDER=zai
      index.ts                       # Factory
    i18n/
      en.ts hi.ts te.ts               # Canonical + translations
      LanguageProvider.tsx           # Client context + localStorage
      t.ts                            # t(key, vars?) helper
    matching/
      score.ts                       # computeMatch — pure, unit-testable (MAT-01)
      explain.ts                     # explainMatch — top-3 reasons (MAT-02)
      haversine.ts
    trust/
      recompute.ts                   # Trust score + tier upgrade (VER-03)
    seed/
      data.ts                        # Idempotent G4 seed dataset
    storage/
      sign.ts                        # HMAC-signed URL tokens
    notifications.ts                 # Insert + list notifications (WRK-10)
  hooks/
    use-session.ts use-language.ts use-notifications.ts (polling 15s) use-match-explain.ts
```

## 5. Phase Plan + Gate Exits

| Phase | Workstreams | Gate | Exit criteria |
|---|---|---|---|
| 0 Foundation | P0.1..P0.10 (sequential) | G0/G1 | App boots, Prisma schema pushed, seed runs, demo login works for all 3 roles, profile row creatable, job CRUD live, i18n EN/HI/TE dictionaries cover every screen, AI mock provider returns sensible JSON for "Nenu electrician, eight years experience, 800 rupees per day, Bhimavaram". |
| 1 Parallel | WS1 + WS2 + WS3 + WS4 + WS5 + WS6 | G2/G3 | Each WS code-complete in its own territory; zero eslint errors; types clean; i18n keys used. |
| 2 Integration | I.1..I.5 (sequential) | G2/G3/G4 | Golden demo path runs end-to-end (EN + TE, mobile 375px + desktop); state integrity verified; empty/loading/error states on every list; feed & search < 1.5s. |
| 3 Documentation | All §14 deliverables | G5 | README, docs/architecture, docs/database, docs/api, docs/algorithms, docs/security, EXPLANATION_LOG, DECISIONS, STATUS, BUILD_PLAN(this), ROADMAP, FINAL_REPORT. |

## 6. Workstream Briefs ( territory ownership )

### WS1 — Worker Portal (B1)
- **Territory**: `src/app/(worker)/**` (i.e. `/onboarding/worker`, `/home`, `/profile`, `/jobs/[id]`, `/applications/[id]`), `src/components/worker/**`, `src/hooks/use-notifications.ts`
- **Consumes (frozen contracts)**: `lib/types.ts`, `lib/schemas/worker.ts`, `lib/schemas/job.ts`, `lib/schemas/application.ts`, `lib/i18n/*`, `lib/ai/index.ts`, `lib/matching/*`, `components/shared/*`, `lib/auth.ts`
- **Requirement IDs**: WRK-01..WRK-10, DSH-02 (worker side)
- **AC (verbatim from SRD)**: <3min onboarding; profile fields save & render; voice dictation prefilled + confirm step always shown; profile-strength meter updates on each completed action; feed <1.5s with filters; one-tap apply creates application + button becomes "Applied"; tracker timestamps within 5s; available-today toggle filterable by employers; WhatsApp wa.me deep link with job title; notifications badge + list view.
- **DoD**: code + working feature + zero console errors + i18n strings in all 3 languages + types clean.

### WS2 — Employer Portal (B2)
- **Territory**: `src/app/employer/**` (except `dashboard/**`), `src/components/employer/**`
- **Consumes**: same frozen contracts as WS1 + `lib/schemas/job.ts`, `lib/matching/*`
- **IDs**: EMP-01..EMP-07, DSH-03 (drilldown)
- **AC**: post live <10s; AI desc 3-4 sentences <5s editable; search ranked by match desc; candidate card shows score + reason; pipeline Kanban transitions persist + notify worker + write stage timestamp; bulk shortlist; hire sets hired_at + endorsement modal.
- **DoD**: same as WS1 + desktop-first density (tables, keyboard-friendly).

### WS3 — Verification + Admin (B3)
- **Territory**: `src/app/verify/**`, `src/app/admin/**`, `src/components/verification/**`, `src/lib/trust/**`
- **Consumes**: frozen contracts + `lib/storage/sign.ts`
- **IDs**: VER-01..VER-06, ADM-01, ADM-02
- **AC**: PDF/JPG ≤5MB uploaded to private storage via signed URL; verification statuses pending→approved/rejected with note + reviewed_at/by; approval recomputes trust + badge visible next load; employer verification reuses pipeline; PII minimization (no raw ID numbers stored); admin queue with preview + extracted_json.
- **DoD**: same + VER-06 enforced (masked labels only).

### WS4 — Matching + AI (B4)
- **Territory**: `src/lib/matching/**`, `src/api/match/**`, `src/api/ai/**`, `src/lib/ai/**` (mock + zai providers, not the frozen interface)
- **Consumes**: `lib/types.ts`, `lib/schemas/match.ts`, `lib/schemas/voice.ts`
- **IDs**: MAT-01..MAT-04, SRD §8.1/8.2/8.3
- **AC**: `computeMatch(worker, job)` pure function returns `{score, breakdown{S,D,E,W,T,bonus}}` per SRD §8.1 weights verbatim (0.35 S, 0.25 D, 0.15 E, 0.15 W, 0.10 T, +5 embedding bonus cap when provider available); `explainMatch()` returns top-3 plain-language reasons; trust recompute per §8.2 (30 base + 20 ID + 10×approved certs cap 30 + 5×hires cap 10 + 4×endorsements cap 12 → max 100; tiers 0-39 New / 40-59 ID Verified / 60-84 Skill Verified / 85+ Top Pro); `/api/ai/voice-profile` worker-auth + zod; `/api/ai/job-description` employer-auth + zod; MockProvider deterministic heuristic parse of Telugu/English demo sentence.
- **DoD**: pure function + unit tests for: perfect match, zero overlap, distance decay edge, wage +10% boundary, each trust tier — assert exact expected scores.

### WS5 — Dashboards (B5)
- **Territory**: `src/app/employer/dashboard/**`, `src/components/dashboard/**`, `src/api/dashboard/**`
- **Consumes**: frozen contracts + `lib/matching/*`
- **IDs**: DSH-01..DSH-03
- **AC**: employer dashboard headline = avg time-to-hire in hours (one decimal, e.g. "31.4 hrs") computed as avg(hired_at − applied_at) over hired applications; stat cards: active jobs, new applicants today, hires this week; funnel Views→Applied→Shortlisted→Interview→Hired as horizontal bar; per-job drill-down rows (applicants by stage, views, score distribution sparkline); worker dashboard: applications-in-review count, profile-views insight ("3 employers viewed your profile this week"), top 3 recommended jobs by match score; all numbers from REAL seeded data.
- **DoD**: same + funnel uses CSS/SVG (recharts acceptable since already installed).

### WS6 — Public + i18n + Polish (B6)
- **Territory**: `src/app/page.tsx` (landing), `src/app/c/[slug]/**`, `src/components/public/**`, `src/lib/i18n/**` (full hi/te dictionaries)
- **Consumes**: frozen contracts + `lib/types.ts`
- **IDs**: PUB-01..PUB-03, I18N-01..I18N-04
- **AC**: landing hero with tagline + two CTA cards (I'm a Worker / I'm an Employer) + language toggle + three trust pillars; Kaam Card /c/[slug] public, logged-out-accessible, first name only + trade + tier + skills + experience + wage + city — NO other PII; platform-gated contact CTA; worker can disable via passport_public; OG metadata for WhatsApp preview; complete hi/te dictionaries for every key; accessibility (icon+text, focus states, aria-labels, ≥48px targets, contrast).
- **DoD**: same + mobile 375px sanity on every worker screen.

## 7. Orchestration Discipline

- `STATUS.md` at repo root, updated every time a workstream changes state.
- `DECISIONS.md` for every non-obvious choice with one-line rationale.
- `EXPLANATION_LOG.md` per module: 5-line plain explanation, one edge case, one key file.
- `FINAL_REPORT.md` requirement-ID → file → test-status traceability table.
- Conventional commits if git becomes available (format: `feat(WRK-03): voice input with LLM extraction + confirm step`).

## 8. Acceptance — Definition of Done (Section 15 of the directive)

1. All MUST requirements PASS their SRD acceptance criteria.
2. All SHOULD requirements PASS or have a logged FALLBACK note.
3. T1–T12 test plan all PASS.
4. Golden path runs error-free twice in a row (EN + TE).
5. `bun run lint` clean. (No `next build` per sandbox rules.)
6. Seed produces the §12 G4 dataset (20 workers, 3 employers, 10 jobs, 30 applications).
7. Every §14 document exists and is accurate.
8. App is one-env-var-swap from Vercel-deployable.

---

**BEGIN EXECUTION** → Phase 0.
