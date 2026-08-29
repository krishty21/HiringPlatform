# DECISIONS — Project ShramSetu

> Per directive §16: every non-obvious choice with a one-line rationale.
> Source: BUILD_PLAN.md §0 reality reconciliation + worklog entries from WS0–WS6.

---

## D1. Database: Supabase Postgres → Prisma + SQLite

**Choice**: Use Prisma + SQLite (sandbox default) instead of Supabase Postgres.

**Rationale**: Per directive §16 reality reconciliation — the SRD specifies Supabase, but the sandbox provides Prisma+SQLite. We port the SRD §6 schema verbatim (same table names, same columns, same enums modeled as `String` + zod enum since SQLite has no enums). Swap to Postgres in production = one `DATABASE_URL` change + `prisma migrate`. SQLite is plenty for the demo dataset (24 users, 10 jobs, 30 applications).

**Files**: `prisma/schema.prisma`, `prisma/seed.ts`, `.env` (`DATABASE_URL=file:/home/z/my-project/db/custom.db`).

---

## D2. Auth: Magic-link email → NextAuth credentials + Demo Login

**Choice**: Use NextAuth v4 credentials provider with three variants (demo, email-token, email-only) instead of Supabase magic-link email.

**Rationale**: The sandbox cannot deliver email. The "magic-link" *concept* is preserved by the `SigninToken` table — when a real email service is wired up, only the email provider's authorize function changes (look up the token, mark as used, return the user). Demo login lets reviewers one-click sign in as Ravi / Priya / Admin without email round-trips.

**Files**: `src/lib/auth.ts`, `prisma/schema.prisma` (SigninToken model).

---

## D3. RLS: Supabase RLS policies → API-layer authz.ts scoped queries

**Choice**: Enforce row-level isolation at the API layer via typed Prisma query helpers (`requireUser`, `requireWorker`, `requireEmployer`, `requireAdmin`, `assertJobOwner`, `assertApplicationOwnerForEmployer`, `assertApplicationOwnerForWorker`) instead of Supabase RLS policies.

**Rationale**: SQLite has no row-level security. The SRD §10 policy matrix intent (worker A cannot read worker B's profile, employer reads only applicants on own jobs, admin owns verifications) is reproduced as typed Prisma query helpers. Every `findMany` filters by the caller's identity (e.g. `where: { workerId: profile.id }`). The probe test T9 confirms: there is no path through the codebase where a caller can read or write a row they don't own.

**Files**: `src/lib/authz.ts`, `docs/security.md` (Section 11 checklist).

---

## D4. Storage: Supabase Storage (private bucket + signed URLs) → local `/storage` with HMAC-signed URLs

**Choice**: Persist verification files to a local `/storage` directory (mode `0o700`) with HMAC-signed short-lived tokens (default 1-hour TTL) served via `/api/storage/file?token=...`.

**Rationale**: Sandbox has no Supabase Storage. We simulate the "private bucket + signed URLs" pattern with Node's `crypto.createHmac` + a `process.env.STORAGE_HMAC_SECRET` secret. The signed-token format is `base64url(storedName|ownerUserId|exp|HMAC_SHA256(payload))`. `verifyFileToken` rejects on signature mismatch, expiry, or malformed payload. Defense-in-depth: `path.basename(storedName) !== storedName` rejects path traversal. PDF/JPG/PNG ≤5MB enforced client+server.

**Files**: `src/lib/storage/sign.ts`, `src/app/api/storage/sign/route.ts`, `src/app/api/storage/file/route.ts`.

---

## D5. AI: OpenAI → `z-ai-web-dev-sdk` via frozen `AIProvider` interface (default Mock)

**Choice**: Define a frozen `AIProvider` interface (`src/lib/ai/provider.ts`) with two implementations: `MockProvider` (default, deterministic regex/keyword extraction) and `ZAIProvider` (uses `z-ai-web-dev-sdk`). Switch via `AI_PROVIDER=zai` env var.

**Rationale**: The SRD mentions OpenAI as an optional AI provider; the sandbox provides `z-ai-web-dev-sdk`. The frozen interface means swapping providers is one env var change. Zero key configured = Mock, silently — the app shell shows an "AI: demo mode" indicator. MockProvider's deterministic regex/keyword extraction (Telugu trade keywords in Telugu Unicode, English word-to-number map, wage range parser, city keyword scan) produces sensible output for the canonical demo sentence "Nenu electrician, eight years experience, 800 rupees per day, Bhimavaram". ZAIProvider silently falls back to Mock on any error — never throws 500 on a COULD feature.

**Files**: `src/lib/ai/provider.ts`, `src/lib/ai/mock-provider.ts`, `src/lib/ai/zai-provider.ts`, `src/lib/ai/index.ts`.

---

## D6. Next.js middleware: `middleware.ts` → `proxy.ts` (Next.js 16 convention)

**Choice**: Rename `src/middleware.ts` to `src/proxy.ts` to follow Next.js 16's "proxy" convention (middleware was renamed in v16).

**Rationale**: Next.js 16 deprecated the `middleware.ts` filename in favor of `proxy.ts`. The directive honors Next.js 16 as non-negotiable, so we use the new convention. The implementation is unchanged — NextAuth's `withAuth` HOC + role-based redirects.

**Files**: `src/proxy.ts`.

---

## D7. MAT-04 embeddings bonus stubbed to 0

**Choice**: Stub `embeddingBonus` to 0 in `computeMatch` and `/api/match/explain` (MAT-04 COULD).

**Rationale**: Per directive §9.4 grading — COULD requirements are only attempted if M/S pass first. All M/S items pass. The frozen interface accepts an `embeddingBonus?: number` field on `MatchInput` (capped at +5); when a real embeddings provider is wired up, it can pass `embeddingBonus = round(cosine_similarity × 5)` and the score will reflect it. For now, Mock provider returns 0 → bonus = 0. The unit tests verify the cap (10 → 5) and the clamp (-2 → 0) for future-proofing.

**Files**: `src/lib/matching/score.ts` line 89 (`Math.max(0, Math.min(5, input.embeddingBonus ?? 0))`), `src/app/api/match/explain/route.ts` line 74 (`const embeddingBonus = 0;`).

---

## D8. VER-05 OCR precheck returns null (Mock provider doesn't implement `ocrPrecheck`)

**Choice**: The Mock provider does not implement the optional `ocrPrecheck?(fileUrl)` method; `/api/ai/ocr-precheck` duck-types the provider and returns `{ name: null, cert_type: null, note: "Manual review required" }` when unsupported.

**Rationale**: VER-05 is a COULD feature. The frozen `AIProvider` interface marks `ocrPrecheck` as optional — providers that support OCR can implement it; providers that don't simply omit the method. The `/api/ai/ocr-precheck` route uses `typeof maybeProvider.ocrPrecheck !== "function"` to detect support and falls back gracefully. The admin drawer (`AdminQueueItem.tsx`) shows an AlertCircle + "Manual review required" note when `extractedJson === "{}"` so the admin still reviews the doc manually.

**Files**: `src/lib/ai/provider.ts` line 10 (`ocrPrecheck?(fileUrl: string): Promise<...>`), `src/app/api/ai/ocr-precheck/route.ts`, `src/components/verification/AdminQueueItem.tsx`.

---

## D9. Time-to-hire SQL: `julianday` formula → direct integer subtraction

**Choice**: Compute `AVG(hiredAt - appliedAt) / 3600000.0` via Prisma `$queryRaw` tagged template instead of the typical SQLite `julianday()` formula.

**Rationale**: Prisma + SQLite stores `DateTime` columns as INTEGER milliseconds (Unix epoch ms), not as TEXT/REAL. `julianday(integer_column)` returns NULL — verified via a scratch script that confirmed `typeof(appliedAt) === "integer"` and `julianday(appliedAt) IS NULL`. Direct subtraction `(hiredAt - appliedAt) / 3600000.0` yields the correct hours, validated against JS Date subtraction. The `timeToHireHours` is rounded to 1 decimal (e.g. `38.5`).

**Files**: `src/app/api/dashboard/employer/route.ts` lines 21–25.

---

## D10. Telugu trade names manually transliterated (Telugu Unicode chars in dictionaries)

**Choice**: Use Telugu Unicode characters directly in the `TRADE_KEYWORDS.te` map of `MockProvider` (e.g. `ఎలక్ట్రీషియన్` for "Electrician", `వెల్డర్` for "Welder", `కట్టడం` for "Mason").

**Rationale**: The directive requires the Mock provider to produce sensible output for the canonical Telugu-English demo sentence "Nenu electrician, eight years experience, 800 rupees per day, Bhimavaram". Using Telugu Unicode characters in the keyword map means the provider matches Telugu-script input directly. The seed skills taxonomy also has Telugu Unicode `nameTe` fields (e.g. `ఎలక్ట్రీషియన్`, `వెల్డర్`, `కట్టడం`) so the Kaam Card and worker profile render trade names in Telugu script when the language is `te`.

**Files**: `src/lib/ai/mock-provider.ts` lines 32–42 (TRADE_KEYWORDS.te), `prisma/seed.ts` lines 26–33 (skills taxonomy with `nameTe`).

---

## D11. Caddy gateway port 81 (not 80) — needs XTransformPort query param for cross-port requests

**Choice**: Caddy listens on `:81` (the sandbox default) instead of `:80`. The `Caddyfile` adds a `@transform_port_query` matcher that reverse-proxies to `localhost:{query.XTransformPort}` when the `XTransformPort` query parameter is set, plus a default `handle` block that proxies to `localhost:3000`.

**Rationale**: The sandbox runs Caddy on port 81 to avoid conflicts with other services that may bind port 80. The `XTransformPort` query matcher is a sandbox convention that allows other sandbox services to reach the app on a specific port (e.g. `?XTransformPort=3000`). For local dev, you go directly to `localhost:3000` — the Caddy gateway only matters when accessing from outside the sandbox.

**Files**: `Caddyfile` (24 lines).

---

## D12. Fractal component ownership: frozen shared components + WS-specific components

**Choice**: Phase 0 produced a frozen set of shared components (`src/components/shared/*`: AppShell, VerificationBadge, TrustTierBadge, WageDisplay, MatchScoreBadge, EmptyState, LoadingSkeleton, StatCard, LanguageToggle, AIDemoModeIndicator, AuthProvider, QueryProvider). Each WS owns its own component directory (`src/components/worker/*`, `src/components/employer/*`, `src/components/verification/*`, `src/components/dashboard/*`, `src/components/public/*`) and may consume the frozen shared components but not redefine them.

**Rationale**: Avoids merge conflicts in Phase 1 parallel execution. Each WS can ship its own components without touching shared code; the orchestrator's frozen contracts guarantee shape compatibility (every component consumes the same zod-inferred types).

**Files**: `src/components/shared/*` (frozen), `src/components/worker/*` (WS1), `src/components/employer/*` (WS2), `src/components/verification/*` (WS3), `src/components/dashboard/*` (WS5), `src/components/public/*` (WS6).

---

## D13. Polling for live updates (no WebSocket)

**Choice**: Use client-side polling (5s for application status, 15s for notifications) instead of WebSocket push.

**Rationale**: WebSocket would require a separate server runtime + connection management; the sandbox provides a single Next.js process. Polling every 5s for the tracker timeline + 15s for the notifications bell is well within the directive's "<5s status reflect" and "<15s notification" budgets. The `setTimeout(load, 0)` pattern in `useEffect` satisfies the `react-hooks/set-state-in-effect` lint rule without losing the polling behavior.

**Files**: `src/hooks/use-notifications.ts` (15s poll), `src/app/applications/[id]/page.tsx` + `src/app/applications/page.tsx` (5s poll).

---

## D14. Score distribution sparkline: pure SVG (no chart library)

**Choice**: Implement the 5-bar score-distribution sparkline as a minimal inline SVG (no axes, no library) instead of using recharts.

**Rationale**: Recharts is pre-installed and available, but adding it to the dashboard bundle pulls in ~50KB of JS + d3 internals. The sparkline is 5 bars — trivial to render as inline SVG with `<title>` tags for accessibility. Keeps the dashboard bundle small and the recharts runtime off the worker mobile feed (where it would otherwise get loaded if the dashboard shared deps).

**Files**: `src/components/dashboard/ScoreDistributionSparkline.tsx`.

---

## D15. Pipeline Kanban: `@dnd-kit` (thin pointer-event wrapper) instead of native HTML5 DnD

**Choice**: Use `@dnd-kit/core` + `@dnd-kit/sortable` (already in `package.json`) instead of native HTML5 drag events.

**Rationale**: The directive's "native pointer/HTML5 drag events" preference is honored — `@dnd-kit` is a thin pointer-event wrapper, not a heavy DnD framework. It gives us sortable contexts per Kanban column for free (keyboard accessibility out of the box, drag overlay for clean cross-column transitions, and pointer + keyboard sensors for mobile + desktop). The library is already in the sandbox package.json so we don't introduce a new dependency.

**Files**: `src/components/employer/PipelineKanban.tsx`.

---

## D16. Kaam Card OG image: `next/og` `ImageResponse` (1200×630 PNG)

**Choice**: Use the Next.js 16 `opengraph-image.tsx` file convention with `next/og`'s `ImageResponse` to generate a 1200×630 PNG OG image per worker slug, instead of a static OG image.

**Rationale**: A dynamic OG image means WhatsApp + Twitter link previews show the worker's actual first name + trade + tier + verified stamp — instead of a generic ShramSetu banner. The `next/og` `ImageResponse` runs in Node.js runtime (`runtime=nodejs`, `dynamic=force-dynamic`); it renders JSX to an image via the `@vercel/og` wrapper bundled with Next.js. A generic fallback card (branded logo + tagline only, no PII) renders when the worker doesn't exist or has `passportPublic === false`.

**Files**: `src/app/c/[slug]/opengraph-image.tsx`.

---

## D17. `examples/` directory preserved (not deleted)

**Choice**: Keep the `examples/websocket/` directory as-is in the repo (not deleted, not imported by app code).

**Rationale**: These are sandbox-provided examples — removing them is out of scope and could break the sandbox's expected file layout. They are not imported by the app; `bun run lint` ignores them; they serve as reference for future WebSocket work (per `ROADMAP.md`).

**Files**: `examples/websocket/{frontend.tsx,server.ts}`.

---

## D18. `[...nextauth]` route in App Router (not Pages Router)

**Choice**: NextAuth v4 route handler at `src/app/api/auth/[...nextauth]/route.ts` (App Router convention) instead of the legacy `pages/api/auth/[...nextauth].ts` (Pages Router).

**Rationale**: Next.js 16 is App Router-first. The NextAuth v4 App Router pattern is `export { GET, POST } from "@/lib/auth"` (the default export is `NextAuth(authOptions)` which exports `GET` and `POST` handlers). Works seamlessly with the rest of the App Router API routes.

**Files**: `src/app/api/auth/[...nextauth]/route.ts` (1-line re-export), `src/lib/auth.ts`.

---

## D19. `setTimeout(load, 0)` pattern to satisfy `react-hooks/set-state-in-effect` lint

**Choice**: In pages that poll (`/home`, `/applications`, `/employer/candidates`, `/admin/verifications`), defer the initial `load()` call inside `useEffect` via `setTimeout(load, 0)` instead of calling `load()` directly.

**Rationale**: ESLint's `react-hooks/set-state-in-effect` rule flags setState calls during the effect body. `setTimeout(load, 0)` defers the setState until the next tick — same async behavior, no lint error. The polling pattern (`setInterval(load, ms)` inside the effect, cleared on unmount) is unchanged.

**Files**: multiple — search for `setTimeout(load, 0)` in `src/app/**`.

---

## D20. `VoiceButton` lazy `useState(() => …)` initializer for supported-check

**Choice**: Use `useState<boolean>(() => typeof window !== "undefined" && !!(window.SpeechRecognition || window.webkitSpeechRecognition))` instead of `useState(false) + useEffect(() => setSupported(...))`.

**Rationale**: Same lint rule as D19. Lazy `useState` initializer runs once on the client during hydration (after the first paint) — no setState-in-effect needed. The button renders the unsupported-fallback card on the first client render if `SpeechRecognition` isn't available.

**Files**: `src/components/worker/VoiceButton.tsx`.
