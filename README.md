# ShramSetu — A bridge between India's skilled hands and honest work

> **Tagline**: Voice-first Kaam Profile, Skill Passport, explainable SmartMatch. Trust-first blue-collar hiring for India.

**Live**: _placeholder — `https://shramsetu.app` (deploy pending Vercel swap) · Local: `http://localhost:3000`

---

## One-liner

ShramSetu connects India's skilled blue-collar workers (electricians, welders, fitters, masons…) with honest employers through a **voice-first onboarding flow**, a **Skill Passport**, an **explainable match score**, and a **trust-tier system** that rewards verified identity and verified skills. Built for coastal Andhra Pradesh, with full English / Hindi / Telugu support, mobile-first design, and privacy by default.

---

## Three demo accounts

One-click access on the **`/login`** page → "Demo Login" panel.

| Role | Email | What you see |
|---|---|---|
| 👷 **Worker** | `ravi@shramsetu.demo` | 3-step voice onboarding, feed of 10 seeded jobs, Skill Passport, premium tracker timeline, available-today toggle, notifications bell |
| 🏭 **Employer** | `priya@shramsetu.demo` | Post job + AI description, candidate search ranked by match score, Skill Passport view, pipeline Kanban, employer dashboard (time-to-hire, funnel, per-job drill-down) |
| 🛡️ **Admin** | `admin@shramsetu.demo` | Platform stats strip (Users / Jobs / Hires / Pending Docs), verification queue with preview + approve/reject |

All three accounts are pre-seeded in `prisma/seed.ts` — sign in by clicking the corresponding Demo Login card.

---

## Tech stack

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38bdf8)
![shadcn/ui](https://img.shields.io/badge/shadcn%2Fui-New_York-000000)
![Prisma](https://img.shields.io/badge/Prisma-6-2d3748)
![SQLite](https://img.shields.io/badge/SQLite-3-003b57)
![NextAuth](https://img.shields.io/badge/NextAuth-v4-red)
![zod](https://img.shields.io/badge/zod-4-3e6397)
![framer-motion](https://img.shields.io/badge/framer--motion-12-0055ff)
![lucide-react](https://img.shields.io/badge/lucide--react-0.5-000)
![recharts](https://img.shields.io/badge/recharts-2-ff7300)
![@dnd-kit](https://img.shields.io/badge/@dnd--kit-core-6-e83a8c)
![z-ai-web-dev-sdk](https://img.shields.io/badge/z--ai--web--dev--sdk-0.0-9b59b6)

**Stack**: Next.js 16 (App Router, RSC, TypeScript strict) · Tailwind CSS 4 + shadcn/ui (New York) · Prisma ORM + SQLite (local at `db/custom.db`) · NextAuth v4 (JWT, credentials provider) · zod v4 (shared client/server schemas) · framer-motion · lucide-react · recharts · `@dnd-kit/core` + `@dnd-kit/sortable` · `z-ai-web-dev-sdk` (optional real AI provider — Mock is default).

---

## Local setup (3 steps)

> Prerequisites: Node 20+, `bun` 1.1+ (or npm/pnpm — `bun` recommended; this repo uses `bun.lock`).

```bash
# 1. Install deps
bun install

# 2. Configure env + push schema + seed
cp .env.example .env
bun run db:push && bun run db:seed

# 3. Run dev server
bun run dev
# → http://localhost:3000
```

The seed (`prisma/seed.ts`) is idempotent and produces the SRD §12 G4 dataset:
**20 Telugu workers**, **3 employers** (one verified), **10 open jobs** (2 urgent), **30 applications** distributed across pipeline stages with realistic timestamps, and **precomputed match scores** for Ravi × all 10 jobs so the feed shows them immediately.

The dev server runs on port 3000. The Caddy gateway in `Caddyfile` exposes the sandbox on port 81 (so the world sees the app at `http://<host>:81/`); local development goes direct to port 3000.

---

## Screenshots

All screenshots live in [`/docs/screenshots/`](./docs/screenshots) — captured live via `agent-browser` end-to-end verification (Phase 2 integration).

| # | File | What it shows |
|---|---|---|
| 01 | `01-landing.png` | Landing page hero + 3 trust pillars + how-it-works steps |
| 02 | `02-worker-feed.png` | Worker home — feed with filters, urgent ribbon, match score badges, available-today toggle, dashboard StatCards |
| 03 | `03-worker-passport.png` | Worker profile — Skill Passport card, trust tier badge, skills with proficiency stars, profile-strength meter |
| 04 | `04-worker-applications.png` | Worker applications list — per-card status badges, polled for live updates |
| 05 | `05-tracker-timeline.png` | Application detail — premium package-tracking timeline (Applied → Shortlisted → Interview → Offer → Hired) |
| 06 | `06-employer-dashboard.png` | Employer dashboard — avg time-to-hire headline, 4 StatCards, hiring funnel, per-job drill-down rows with score-distribution sparklines |
| 07 | `07-candidate-search.png` | Employer candidate search — filters sidebar + ranked candidate cards with match score + top reason |
| 07b | `07b-candidates-error.png` | Empty state on candidate search — graceful "try widening filters" message |
| 08 | `08-pipeline-kanban.png` | Employer pipeline — 6-stage Kanban with drag-and-drop + per-card action buttons |
| 09 | `09-admin-home.png` | Admin home — 4 StatCards (Users / Jobs / Hires / Pending Docs) |
| 10 | `10-kaam-card.png` | Public Kaam Card `/c/[slug]` — passport-styled credential with initials avatar, trust-tier badge, skills with stars, verified stamp |
| 11 | `11-mobile-worker-feed.png` | Mobile (375px) worker feed — mobile-first responsive layout |
| 12 | `12-sticky-footer-short.png` | Sticky footer — short viewport shows footer pinned to bottom |
| 13 | `13-post-job.png` | Employer post-job form — trade Select, skills multi-select with required-toggle, AI description button |
| 14 | `14-onboarding-step2.png` | Worker onboarding step 2 — details form with city auto-fill, live profile-strength meter |

---

## Documentation

- [`docs/architecture.md`](./docs/architecture.md) — System diagram (mermaid), stack rationale, request lifecycle.
- [`docs/database.md`](./docs/database.md) — ER diagram (mermaid) of all 14 tables + index/RLS-equivalent rationale.
- [`docs/api.md`](./docs/api.md) — Endpoint table per SRD §7 with request/response shapes.
- [`docs/algorithms.md`](./docs/algorithms.md) — Match (§8.1) + trust (§8.2) + voice pipeline (§8.3) formulas verbatim, with worked example (Ravi × Urgent Electrician → score 73).
- [`docs/security.md`](./docs/security.md) — Section 11 checklist with evidence file references.
- [`BUILD_PLAN.md`](./BUILD_PLAN.md) — Frozen contracts, territory map, phase plan.
- [`DECISIONS.md`](./DECISIONS.md) — Every non-obvious choice with one-line rationale.
- [`EXPLANATION_LOG.md`](./EXPLANATION_LOG.md) — Per-module 5-line plain explanation + one edge case + one key file.
- [`STATUS.md`](./STATUS.md) — Per-workstream status table.
- [`ROADMAP.md`](./ROADMAP.md) — WON'T-list features as future work.
- [`FINAL_REPORT.md`](./FINAL_REPORT.md) — Requirement-ID → file → test-status traceability + T1-T12 test plan results.

---

## Project structure (top-level)

```
prisma/
  schema.prisma        14 tables (13 SRD §6 + SigninToken + Rating + MatchScore + Notification + VerificationDocument + Endorsement)
  seed.ts              G4 seed: 20 workers, 3 employers, 10 jobs, 30 applications
src/
  app/                 App Router pages + API routes
  components/
    shared/            Frozen shared components (AppShell, badges, skeletons)
    worker/            WS1 worker UI (JobCard, TradeGrid, VoiceButton, TrackerTimeline, NotificationsBell)
    employer/          WS2 employer UI (JobPostForm, CandidateCard, CandidateFilters, PipelineKanban, EndorsementModal)
    verification/      WS3 verification UI (UploadDropzone, VerificationList, AdminQueueItem)
    dashboard/         WS5 dashboard widgets (FunnelChart, TimeToHireHeadline, ScoreDistributionSparkline, PerJobDrilldownRow)
    public/            WS6 public + landing (HeroSection, TrustPillar, HowItWorksStep, KaamCard, PublicFooter, LandingHeader)
    ui/                shadcn/ui (frozen)
  lib/
    auth.ts            NextAuth config + 3 credentials providers (demo, email-token, email-only)
    authz.ts           RLS-equivalent query scoping helpers + HTTPError + errorResponse
    schemas/index.ts   FROZEN zod schemas (shared client/server)
    matching/           computeMatch + explainMatch + haversine + unit tests
    trust/              computeTrustScore + tierFromScore + recomputeWorkerTrust + unit tests
    ai/                 AIProvider interface + MockProvider + ZAIProvider + factory
    i18n/               en/hi/te dictionaries + LanguageProvider
    storage/sign.ts     HMAC-signed file tokens
    notifications.ts    pushNotification + list + unreadCount
    db.ts               Prisma client
  proxy.ts             Next.js 16 proxy convention (role-based route guards — AUTH-03)
Caddyfile             Gateway on :81 (XTransformPort for cross-port)
docs/                  All Section 14 documentation (this folder + repo-root .md files)
storage/               Private file storage (mode 0o700) — verification docs
```

---

## What you can try right now (golden path)

1. Land on `/` → read hero + 3 trust pillars + how-it-works steps.
2. Click **I'm a Worker** → `/login` → click **Ravi** demo card.
3. Land on `/home` — see your dashboard (in-review count, profile views, top 3 recommended jobs) + the feed of 10 seeded jobs ranked by match score, with Ravi × Urgent Electrician showing score **73**.
4. Click any job → **Apply** (one-tap) → button becomes "Applied".
5. Open `/profile` — see your Skill Passport with `skill_verified` tier badge, skills with proficiency stars, profile-strength meter.
6. Open `/applications` → see your tracker timeline with all stage timestamps.
7. Log out → click **I'm an Employer** → **Priya** demo card.
8. Land on `/employer/dashboard` → see "31.4 hrs" time-to-hire, hiring funnel, per-job drill-down rows with score-distribution sparklines.
9. `/employer/candidates` → see ranked workers (Ravi scores 73 on Urgent Electrician); click **Urgent Electrician** row in `/employer/jobs` → **"Find candidates"** link → urgent candidates sort first (EMP-05).
10. `/employer/pipeline` → drag a card from **Applied** → **Shortlisted** (DnD + per-card buttons both work).
11. Log out → click **Admin** demo card → `/admin` → see stats strip → click **Pending Docs** → `/admin/verifications` → review queue → approve a doc → worker's trust tier upgrades on next load.

---

## License

Built for the ShramSetu hackathon submission. Source is private pending launch.
