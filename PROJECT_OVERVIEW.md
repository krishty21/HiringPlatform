# Job Hunt — Project Documentation

> **A voice-first, trust-tier hiring platform connecting India's skilled blue-collar workers with honest employers.**
>
> Coastal Andhra Pradesh · English / हिन्दी / తెలుగు · Mobile-first · Privacy by default

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Solution Overview](#2-solution-overview)
3. [Key Features](#3-key-features)
4. [System Architecture](#4-system-architecture)
5. [Technology Stack](#5-technology-stack)
6. [Data Model](#6-data-model)
7. [Authentication & Security](#7-authentication--security)
8. [The SmartMatch Algorithm](#8-the-smartmatch-algorithm)
9. [Trust & Verification System](#9-trust--verification-system)
10. [User Portals](#10-user-portals)
11. [Internationalization](#11-internationalization)
12. [API Design](#12-api-design)
13. [Requirements Traceability](#13-requirements-traceability)
14. [Known Limitations & Roadmap](#14-known-limitations--roadmap)

---

## 1. Problem Statement

India's blue-collar labour market is fundamentally broken for both workers and employers:

**For workers (electricians, welders, fitters, masons, carpenters…):**
- No formal way to prove skills — verbal reputation is unverifiable
- Dependence on word-of-mouth and middlemen who take cuts
- No application tracking — they never know where they stand
- Language barrier — most platforms are English-only
- No smartphone typing — voice is the natural interface

**For employers (small factories, construction firms, manufacturing units):**
- No way to verify worker skills before hiring
- Candidate search is slow, manual, and relationship-dependent
- No structured pipeline — paper applications are lost
- Urgently needed workers are impossible to find quickly

**The result:** Skilled workers sit idle. Employers cannot fill critical roles. India's manufacturing backbone is held together by informal trust networks that exclude the most capable workers.

Job Hunt ("Bridge of Labour") solves this by combining **voice-first digital identity**, **cryptographically-verifiable skill credentials**, and **explainable AI matching** into a single, mobile-first platform built for the realities of coastal Andhra Pradesh.

---

## 2. Solution Overview

Job Hunt is a full-stack hiring platform with three distinct user roles:

| Role | What They Do |
|---|---|
| 👷 **Worker** | Create a voice-recorded Kaam Profile, upload verification documents, browse and apply to jobs, track application status in real time |
| 🏭 **Employer** | Post jobs (with AI-assisted descriptions), search ranked candidates, manage a Kanban hiring pipeline, endorse hired workers |
| 🛡️ **Admin** | Review uploaded verification documents, approve/reject with notes, monitor platform-wide analytics |

**Three differentiating ideas:**

1. **Voice-First Onboarding** — workers speak their trade and experience in Telugu, Hindi, or English. The AI extracts structured data and pre-fills the form. The worker reviews and confirms. No typing required.

2. **Skill Passport** — a shareable public URL (`/c/{slug}`) with a branded credential card. Verified skills are badged. Employers can see it without login. WhatsApp share button included.

3. **SmartMatch** — a transparent 0–100 score computed across 5 dimensions (Skills, Distance, Experience, Wage, Trust). The top reason is shown on every card ("3/3 skills match", "Available today", "Wage within range").

---

## 3. Key Features

### Worker Portal

| Feature | Description |
|---|---|
| **3-Step Voice Onboarding** | Step 1: Trade grid (visual tile selection). Step 2: Voice dictation (Web Speech API, hi-IN/te-IN/en-IN) → AI extracts trade, experience, city → form pre-filled → user confirms. Step 3: Wage range + radius + shift preference. Completes in under 3 minutes. |
| **Job Feed** | Ranked by SmartMatch score. Filterable by trade, distance (slider), wage range, shift, urgent-only. Each card shows score + top reason + employer verification badge. |
| **One-Tap Apply** | Apply with a single tap. Button morphs to "Applied ✓". Unique constraint prevents double-apply. |
| **Application Tracker** | Premium package-tracking timeline with 5 stages (Applied → Shortlisted → Interview → Offer → Hired), exact timestamps, 5-second polling. |
| **Available-Today Toggle** | Switches a boolean flag on the profile, immediately surfacing the worker to employers filtered for availability. |
| **Notifications Bell** | Real-time badge + scrollable dropdown. Polls every 15 seconds. Mark-all-read. Receives status changes, endorsements, verification results. |
| **Public Kaam Card** | Shareable URL with first name only + trade + tier + skills + wage + city. No email, no phone, no last name. Contact CTA gated behind login. Privacy toggle hides it completely. |

### Employer Portal

| Feature | Description |
|---|---|
| **Job Posting** | Full form + AI-assisted description (3–4 sentences generated in <5s). Posted jobs immediately precompute match scores against all registered workers. |
| **Candidate Search** | Filter by trade, experience range, distance, trust tier, wage range, available-today, language. Results ranked by match score. Each card shows score + top reason + availability. |
| **Skill Passport View** | Full worker profile in a dedicated page — skills with proficiency stars, trust timeline, endorsements, wage range, distance. |
| **Pipeline Kanban** | Drag-and-drop 6-column board (Applied → Shortlisted → Interview → Offer → Hired → Rejected). Each transition sets a timestamp and sends a notification to the worker. Bulk shortlist. |
| **Endorsement Modal** | On hire, employer can select a skill and write an endorsement comment. Posted to the worker's profile and recomputes their trust score. |
| **Employer Dashboard** | Average time-to-hire headline, conversion funnel (Views → Applied → Shortlisted → Interview → Hired), stat cards, per-job drill-down with score-distribution sparkline. |
| **Employer Reputation Card** | Aggregated employer rating based on ratings received from hired workers. |

### Admin Portal

| Feature | Description |
|---|---|
| **Platform Stats** | 4 live stat cards: total users, active jobs, all-time hires, pending docs. |
| **Verification Queue** | Table of pending documents. Sheet drawer with inline preview (PDF iframe / image), extracted fields from OCR hook, reviewer note textarea, Approve/Reject buttons. |
| **Analytics Charts** | Visual breakdown of platform activity. |

---

## 4. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER (Client)                          │
│  React 19 + Next.js 16 App Router + shadcn/ui + framer-motion  │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS + JWT cookie (NextAuth)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                  NEXT.JS SERVER (Vercel Serverless)              │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │  App Router  │  │  API Routes  │  │  NextAuth v4 (JWT)   │   │
│  │  RSC Pages   │  │  /api/**     │  │  Credentials +       │   │
│  │              │  │              │  │  Demo providers      │   │
│  └──────────────┘  └──────┬───────┘  └──────────────────────┘   │
│                            │                                      │
│  ┌─────────────────────────▼────────────────────────────────┐    │
│  │                   Prisma ORM                              │    │
│  │  Authorization layer (authz.ts) — per-row scoping        │    │
│  └─────────────────────────┬────────────────────────────────┘    │
└────────────────────────────┼────────────────────────────────────┘
                             │ PostgreSQL wire protocol
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SUPABASE (PostgreSQL)                          │
│  15 tables: User, WorkerProfile, EmployerProfile, Job,           │
│  Application, Skill, WorkerSkill, JobSkill, MatchScore,          │
│  Rating, Notification, VerificationDocument, Endorsement,        │
│  SigninToken, (future: WorkerBadge)                              │
└─────────────────────────────────────────────────────────────────┘

Optional (not required for deploy):
┌─────────────────────────────────────────────────────────────────┐
│                 NOTIFICATIONS MINI-SERVICE (:3003)               │
│  Socket.io server — real-time push. Falls back to 15s polling   │
│  if offline. Non-critical.                                       │
└─────────────────────────────────────────────────────────────────┘
```

**Key architectural decisions:**
- **No client-side database access** — all data flows through Next.js API routes
- **JWT sessions** — stateless, Vercel-compatible
- **Relative API URLs only** — no hardcoded localhost, Vercel proxy works out of the box
- **Prisma as the authorization boundary** — `authz.ts` scopes every query to the session user's ID
- **AI with graceful degradation** — all AI endpoints have deterministic fallbacks; the app works 100% without an LLM configured

---

## 5. Technology Stack

| Layer | Technology | Why |
|---|---|---|
| **Framework** | Next.js 16 (App Router, RSC) | File-based routing, server components, API routes in one codebase |
| **Language** | TypeScript 5 (strict) | Full type safety across client + server + shared schemas |
| **UI Components** | shadcn/ui (New York) + Radix UI | Accessible, composable, unstyled-by-default — full design control |
| **Styling** | Tailwind CSS 4 | Utility-first, co-located, zero dead CSS |
| **Animation** | framer-motion 12 | Smooth micro-animations (page transitions, pipeline drag) |
| **ORM** | Prisma 6 | Type-safe database access, schema-first migrations |
| **Database** | Supabase (PostgreSQL) | Serverless-compatible, connection pooling via PgBouncer |
| **Auth** | NextAuth v4 (Credentials) | JWT strategy, demo accounts + email/password |
| **Validation** | Zod v4 | Shared schemas used on both client and server |
| **Drag & Drop** | @dnd-kit/core + @dnd-kit/sortable | Accessible Kanban pipeline |
| **Charts** | Recharts 2 | Employer dashboard funnel + sparklines |
| **Icons** | lucide-react | Consistent icon set |
| **Password hashing** | bcryptjs | Secure password storage (12 rounds) |

---

## 6. Data Model

The database has 15 tables organized around 3 core entities:

```
User (auth identity)
 ├─ WorkerProfile (1:1) ──┬─ WorkerSkill[] (M:N → Skill)
 │                        ├─ Application[] → Job
 │                        ├─ Endorsement[] (received)
 │                        └─ MatchScore[] → Job
 │
 ├─ EmployerProfile (1:1) ┬─ Job[]
 │                        └─ Endorsement[] (given)
 │
 ├─ VerificationDocument[]
 ├─ Notification[]
 └─ SigninToken[]

Job
 ├─ JobSkill[] (M:N → Skill)
 ├─ Application[] → WorkerProfile
 └─ MatchScore[] → WorkerProfile

Application
 └─ Rating[]

Skill (shared taxonomy, 16 seeded entries)
```

**Key design choices:**
- `role`, `status`, `tier` etc. are `String` columns validated at the API boundary by Zod (PostgreSQL compatible without native enums)
- JSON arrays (skills, languages) stored as serialized strings, parsed at type boundaries
- `MatchScore` is a pre-computed cache table — updated on job create, worker onboard, profile edit
- All timestamps for application stages (`appliedAt`, `shortlistedAt`, `interviewAt`, `offerAt`, `hiredAt`, `rejectedAt`) are discrete columns for efficient querying

---

## 7. Authentication & Security

### Authentication Providers

| Provider | ID | How it works |
|---|---|---|
| **Demo Login** | `demo` | One-click access with pre-seeded accounts. Upserts the user on every login. For presentation/judging. |
| **Email + Password** | `credentials` | Standard login. Password validated via bcrypt (12 rounds). Account created via `POST /api/auth/register`. |

### Security Measures

- **Row-level scoping** — `src/lib/authz.ts` enforces that every data query is filtered by the session user's ID. Workers can never see another worker's applications. Employers can only see their own jobs' candidates.
- **Role enforcement** — every API route calls `requireUser()`, `requireWorker()`, `requireEmployer()`, or `requireAdmin()`. Middleware (`src/proxy.ts`) blocks wrong-role navigation at the routing layer.
- **File security** — uploaded verification documents are stored with mode `0o600`. Access requires an HMAC-signed token with a TTL, served via `/api/storage/file?token=...`. Direct file access returns 403.
- **PII minimization** — the public Kaam Card API deliberately omits last name, email, phone, photo, latitude, and longitude. Filenames are replaced with masked safe names on upload.
- **Password security** — bcrypt with 12 salt rounds. Passwords are never logged or returned in API responses.
- **NEXTAUTH_SECRET** — must be set in production. Fallback dev secret is clearly labeled for rotation.

---

## 8. The SmartMatch Algorithm

Every worker–job pair receives a score from 0–100, computed by `src/lib/matching/score.ts`.

### Formula

```
Score = 100 × (32·S + 18·D + 20·E + 18·W + 12·T) + bonus
```

| Component | Weight | How it's computed |
|---|---|---|
| **S** — Skills | 32 | `|worker_skills ∩ required_job_skills| / |required_job_skills|` |
| **D** — Distance | 18 | Haversine distance. 1.0 if within radius, linear decay to 0 at 2× radius |
| **E** — Experience | 20 | Linear score: worker's `yearsExp` vs job's expected range |
| **W** — Wage | 18 | Overlap between worker's `[wageMin, wageMax]` and job's `[wageMin, wageMax]` |
| **T** — Trust | 12 | Normalized trust score (worker's `trustScore` / 100) |
| **bonus** | +0 to +5 | Embedding similarity bonus (stubbed to 0; interface ready for future LLM embeddings) |

Scores are **pre-computed and cached** in the `MatchScore` table whenever a job is posted or a worker completes onboarding. This makes the job feed response time typically under 1 second.

### Explainability

`src/lib/matching/explain.ts` derives top-3 plain-language reasons from the score breakdown, e.g.:
- _"3/3 required skills match"_
- _"Available today"_
- _"Wage within your range"_
- _"8 years of experience"_

These are shown on every job card and candidate card.

---

## 9. Trust & Verification System

Workers build trust through a 4-tier system, tracked as a numeric score (0–100):

| Tier | Score Range | How to reach it |
|---|---|---|
| 🆕 **New** | 0–39 | Account created |
| ✅ **ID Verified** | 40–59 | Government ID document approved by admin |
| 🎓 **Skill Verified** | 60–79 | Skill certificate approved by admin |
| ⭐ **Top Pro** | 80–100 | Consistent positive ratings from employers |

### Score Formula (`src/lib/trust/recompute.ts`)

```
trustScore = 30 (base)
           + 15 × (ID doc approved ? 1 : 0)
           + 15 × (Skill cert approved ? 1 : 0)
           + min(12, 4 × endorsement_count)
           + min(28, avg_rating × 5.6)
```

Capped at 100. Tier boundaries: 40 → `id_verified`, 60 → `skill_verified`, 80 → `top_pro`.

Trust is recomputed automatically on:
- Verification document approval/rejection
- New endorsement from an employer
- New rating submitted after hire

---

## 10. User Portals

### Worker Flow

```
/login → /onboarding/worker (3-step wizard) → /home (job feed)
  → /jobs/[id] (job detail + apply)
  → /applications (tracker list)
  → /applications/[id] (tracker timeline)
  → /profile (Kaam Profile editor)
  → /verify (document upload)
  → /c/[slug] (public Kaam Card — visible to anyone)
```

### Employer Flow

```
/login → /employer/dashboard (stats + funnel)
  → /employer/post (post new job)
  → /employer/jobs (manage active jobs)
  → /employer/candidates (search + filter ranked candidates)
  → /employer/candidates/[id] (full Skill Passport)
  → /employer/pipeline (Kanban board)
```

### Admin Flow

```
/login → /admin (platform stats)
  → /admin/verifications (document review queue)
```

---

## 11. Internationalization

All UI strings are defined in three language dictionaries:

- `src/lib/i18n/en.ts` — English
- `src/lib/i18n/hi.ts` — हिन्दी (Hindi)
- `src/lib/i18n/te.ts` — తెలుగు (Telugu)

The language is stored in `localStorage` and toggled via the `LanguageToggle` component in every header. The `useLanguage()` hook provides the `t()` translation function to any client component.

Voice dictation supports `hi-IN`, `te-IN`, and `en-IN` speech recognition modes.

---

## 12. API Design

All API routes follow a consistent pattern:

- **Authentication** — every route calls one of `requireUser()` / `requireWorker()` / `requireEmployer()` / `requireAdmin()` from `src/lib/authz.ts`. Returns `401` or `403` on failure.
- **Validation** — input validated with Zod schemas from `src/lib/schemas/index.ts`. Returns `400` with a structured error on failure.
- **Response shape** — `200 OK` with JSON data, `201 Created` for new resources, `409 Conflict` for duplicates, `404 Not Found` for missing resources.

### Key Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/jobs` | Job feed with filters. Returns cached match scores. |
| `POST` | `/api/jobs` | Create a job. Precomputes match scores against all workers. |
| `GET` | `/api/candidates/search` | Ranked candidate search for employers. |
| `POST` | `/api/applications` | Apply to a job (worker only). |
| `PATCH` | `/api/applications/[id]` | Update application stage (employer). Sets timestamp + sends notification. |
| `GET` | `/api/worker/dashboard` | Worker home stats (in-review count, profile views, top 3 recommended jobs). |
| `GET` | `/api/employer/dashboard` | Employer stats (time-to-hire, funnel, per-job drill-down). |
| `POST` | `/api/auth/register` | Register new user with email + password. |
| `POST` | `/api/verifications` | Upload verification document (worker/employer). |
| `PATCH` | `/api/admin/verifications/[id]` | Approve/reject document. Triggers trust recomputation. |
| `GET` | `/api/public/worker/[slug]` | Public worker data (no auth required). PII-minimized. |
| `GET` | `/api/match/explain` | Score breakdown + plain-language reasons for a job–worker pair. |
| `POST` | `/api/ai/voice-profile` | Extract structured data from voice transcript. |
| `POST` | `/api/ai/job-description` | Generate AI-assisted job description. |

---

## 13. Requirements Traceability

All features map to requirement IDs. Full traceability is documented in [FINAL_REPORT.md](./FINAL_REPORT.md).

**Summary of coverage:**

| Category | MUST | SHOULD | COULD | Status |
|---|---|---|---|---|
| AUTH | 5 | 0 | 0 | ✅ All PASS |
| WRK (Worker) | 6 | 4 | 0 | ✅ All PASS |
| EMP (Employer) | 4 | 3 | 0 | ✅ All PASS |
| VER (Verification) | 5 | 0 | 1 | ✅ All PASS (COULD gracefully stubbed) |
| MAT (Matching) | 2 | 1 | 1 | ✅ All PASS (COULD stubbed with live interface) |
| DSH (Dashboards) | 2 | 1 | 0 | ✅ All PASS |
| I18N | 4 | 0 | 0 | ✅ All PASS |
| ADM (Admin) | 0 | 1 | 1 | ✅ All PASS |
| PUB (Public) | 0 | 2 | 1 | ✅ All PASS |
| NFR | 10 targets | — | — | ✅ All PASS |

**T1–T12 Test Results:** All 12 tests PASS. See [FINAL_REPORT.md](./FINAL_REPORT.md) Part 2 for details.

---

## 14. Known Limitations & Roadmap

### Current Limitations

1. **No real email delivery** — magic-link login is stubbed; the `SigninToken` table exists for future integration with a transactional email service (Resend, SendGrid).
2. **No real OCR** — the OCR pre-check hook is wired but the mock provider returns "Manual review required". Real OCR (e.g. Google Document AI) is a production swap.
3. **No real LLM embeddings** — the `embeddingBonus` in SmartMatch is stubbed to 0. The interface is frozen and ready; a real embedding provider is a drop-in.
4. **No real-time push** — the WebSocket notifications mini-service is optional. Without it, the app falls back to 15-second polling, which works perfectly.
5. **No production rate limiting** — `/api/ai/*` and `/api/auth/*` routes lack rate limiting. Required before high-traffic production deployment.

### Production Checklist

- [ ] Set `NEXTAUTH_SECRET` to a cryptographically random string
- [ ] Set `STORAGE_HMAC_SECRET` to a cryptographically random string
- [ ] Configure `NOTIFICATIONS_WS_SECRET` if deploying the mini-service
- [ ] Add rate limiting to auth + AI routes
- [ ] Connect a transactional email provider for magic-link login
- [ ] Configure a real AI provider (`AI_PROVIDER=zai`) for production LLM features

---

*Job Hunt — Built for India's skilled workers. Every line of code in this repository.*

*Stack: Next.js 16 · TypeScript · Tailwind CSS · Prisma · Supabase · NextAuth · Zod · framer-motion · @dnd-kit · Recharts · bcryptjs*
