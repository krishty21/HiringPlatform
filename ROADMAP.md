# ROADMAP — Project ShramSetu

> Future work — explicit WON'T-list items (per `BUILD_PLAN.md` §3) + future enhancements identified during Phase 0–3.
> Each item has a one-paragraph "what + why + rough approach" so a future maintainer can pick it up.

---

## Part A — Explicit WON'T-list (per SRD §3.3 + directive §16)

These features were deliberately excluded from the hackathon build per the directive's WON'T list. They are product-grade features that would add real value but are out of scope for this submission.

### R1. In-app chat (worker ↔ employer)

**What**: A real-time chat between worker and employer after the worker is shortlisted — for confirming interview time, sharing address, etc.

**Why it's a WON'T**: Chat requires a persistent WebSocket server (or a third-party service like Stream/Ably) and message history + read receipts + presence — substantial scope. The golden path uses WhatsApp `wa.me/?text=…` deep links for off-platform contact, which is the canonical Indian-blue-collar pattern anyway.

**Rough approach**: Add a `Message` table (senderId, receiverId, applicationId, body, createdAt, readAt). Wire up a WebSocket server in `examples/websocket/server.ts` (already in the repo as reference). Add `/api/chat/send` POST + `/api/chat/[applicationId]` GET. Frontend: a `ChatPanel` component on `/applications/[id]` (worker) and `/employer/applications/[id]` (employer).

---

### R2. Payments (wage settlement after hire)

**What**: After a worker is hired and the job is completed, the employer pays the worker through ShramSetu (UPI, Razorpay, etc.).

**Why it's a WON'T**: Payments require PCI compliance, KYC, escrow logic, dispute resolution, and integration with Indian payment rails (UPI / IMPS / Razorpay X). Substantial scope + legal exposure. The SRD's north-star metric is "average time-to-hire", not "average wage settled" — payments are out of scope.

**Rough approach**: Add a `Payment` table (applicationId, amount, status: pending|settled|disputed, provider, txnId, createdAt). Integrate Razorpay X or Cashfree for UPI payouts. Admin gets a "Payments" tab on `/admin` with status + reconciliation.

---

### R3. Real SMS / WhatsApp API

**What**: Send SMS / WhatsApp notifications for stage transitions (instead of in-app notifications only).

**Why it's a WON'T**: Real SMS requires a Twilio / MSG91 / Gupshup integration with paid contracts and DLT template registration (India-specific). WhatsApp Business API requires Meta approval + template approval (weeks of lead time). The in-app bell + polling covers the demo use case; WhatsApp `wa.me/?text=…` deep links cover off-platform contact.

**Rough approach**: Wire up MSG91 (SMS) + Gupshup (WhatsApp Business) providers behind a `NotificationProvider` interface. Add a `notify(userId, channel, payload)` function that fans out to in-app + SMS + WhatsApp. Templates pre-registered with DLT.

---

### R4. Native apps (Android / iOS)

**What**: Native mobile apps for workers (the primary mobile-first user).

**Why it's a WON'T**: The web app is mobile-first at 375px and works offline-friendly via the browser. A native app would require a separate RN/Flutter codebase + Play Store / App Store review cycles. The PWA path (see R8 below) covers 90% of the native-app benefit at 10% of the cost.

**Rough approach**: React Native + Expo. Reuse the zod schemas + AIProvider interface. Native-only features: push notifications (FCM), offline mode (SQLite local + sync), camera for ID upload (better than `<input type="file">`).

---

### R5. DigiLocker integration (government-verified ID + skill certs)

**What**: Pull a worker's Aadhaar / PAN / ITI certificate directly from DigiLocker instead of asking them to upload a PDF.

**Why it's a WON'T**: DigiLocker API requires a DigiLocker partner account + document type approval (weeks of paperwork + Govt of India approval). The PDF upload + admin review flow (VER-01..06) is a fine substitute for the hackathon.

**Rough approach**: Wire up DigiLocker's OAuth flow. Add a "Pull from DigiLocker" button on `/verify` that opens DigiLocker's consent screen. On consent, fetch the doc URI + verify the issuer signature. Skip admin review for DigiLocker-issued docs (auto-approve).

---

### R6. Background-check APIs (criminal record, address verification)

**What**: Run a criminal-record + address-verification check before the worker is hired.

**Why it's a WON'T**: Background checks require integration with providers like AuthBridge / IDfy / Jumio (paid contracts + PII handling complexity). The trust score (§8.2) is a decent proxy for the hackathon.

**Rough approach**: Integrate AuthBridge / IDfy behind a `BackgroundCheckProvider` interface. Trigger on `status: "hired"`. Show results in a `BackgroundCheck` panel on the worker's profile + employer's passport view. Negative result → admin dispute flow.

---

### R7. Multi-city ops logic

**What**: Replicate the Bhimavaram/Vijayawada/Visakhapatnam playbook across multiple states/cities.

**Why it's a WON'T**: Multi-city ops require city-specific trade taxonomies + city-specific employer partnerships + city-wise ops dashboards. The seed covers coastal Andhra Pradesh — that's enough to demo the product. Scaling ops is a post-hackathon concern.

**Rough approach**: Add a `City` table with `state`, `lat`, `lng`, `radiusKm`. Worker + Job city columns become FKs. Admin gets a "Cities" tab. Filter the candidate search + worker feed by city. Per-city ops dashboard.

---

## Part B — Future enhancements (identified during the build)

### R8. PWA manifest + service worker (Phase 4)

**What**: Add a `public/manifest.json` + a Next.js 16 service worker (`public/sw.js`) so the app is installable + offline-friendly.

**Why**: Workers on mobile would benefit from "Add to Home Screen" + offline access to their tracker timeline + cached job feed.

**Approach**: Generate `manifest.json` with the ShramSetu logo + name + theme color. Add a service worker that caches the worker's profile + applications locally for offline read. Use Workbox via Next.js 16's experimental PWA support or a hand-rolled SW.

---

### R9. Real embeddings for MAT-04 (replacing the stubbed bonus)

**What**: Compute cosine similarity between worker.bio + job.description embeddings, multiply by 5 (capped at +5), and pass it as `embeddingBonus` to `computeMatch`.

**Why**: MAT-04 is currently stubbed to 0 because the Mock provider doesn't compute embeddings. With real embeddings, workers with semantically relevant bios (even if they don't have the exact skill) would get a small score boost — useful when the job's required skills list is sparse.

**Approach**: Add an `embeddings(text: string): Promise<number[]>` method to the `AIProvider` interface. Implement in `ZAIProvider` (uses `z-ai-web-dev-sdk`'s embeddings API). On `/api/jobs` POST + `/api/onboarding/worker` POST, precompute embeddings for the new job/worker + cosine-similarity against all existing workers/jobs. Store the similarity score in a new `EmbeddingSimilarity` table (or compute on-the-fly for small datasets). Update `computeMatch` callers to pass `embeddingBonus`.

---

### R10. Real OCR for VER-05 (replacing the manual-review fallback)

**What**: Implement `ocrPrecheck` in `ZAIProvider` so admin queue shows extracted name + cert_type automatically.

**Why**: VER-05 is currently a no-op for the Mock provider (returns null → admin drawer shows "Manual review required"). With real OCR, the admin sees the worker's name + cert type pre-extracted, which speeds up the review flow.

**Approach**: Use `z-ai-web-dev-sdk`'s vision API (or a third-party OCR like Google Vision / Azure Form Recognizer). Implement `ocrPrecheck(fileUrl: string)` to fetch the file bytes + send to the vision API + parse the response. Only extract `name` + `cert_type` (never ID numbers — PII minimization). The `/api/ai/ocr-precheck` route is already wired up to duck-type the provider.

---

### R11. Real-time push (WebSocket) for application status + notifications

**What**: Replace the 5s/15s polling pattern with WebSocket push for live application status + notifications.

**Why**: Polling every 5s for tracker timeline + 15s for notifications bell works for the demo, but a worker with the app open while an employer transitions their application from "shortlisted" to "interview" would see the update instantly with a WebSocket.

**Approach**: Use `examples/websocket/server.ts` as a starting point. Add a WebSocket server (Socket.IO or native `ws`). Connect on app mount. Server pushes on `pushNotification` + application PATCH. Replace `use-notifications.ts` polling with a socket subscription. Keep polling as a fallback when WS fails.

---

### R12. Rate limiting on `/api/ai/*` + `/api/auth/*`

**What**: Add rate limiters to prevent LLM cost abuse (on AI endpoints) + brute-force auth attempts.

**Why**: No rate limiters in the sandbox build. Production should rate-limit `/api/ai/voice-profile`, `/api/ai/job-description`, `/api/ai/ocr-precheck` (per-user, per-minute) and `/api/auth/signin` (per-IP, per-minute) for brute-force protection.

**Approach**: Use `@upstash/ratelimit` (works on Vercel Edge) or a simple in-memory limiter for the dev server. Wrap each rate-limited route with `await rateLimit(identifier)`.

---

### R13. Real email magic-link flow

**What**: Wire up a real email service (Resend / SendGrid) to send the magic-link email when a user enters their email on `/login`.

**Why**: The `SigninToken` table + `email` credentials provider already exist; the only missing piece is sending the actual email with the token URL. Currently the `email-only` provider auto-creates any email as a fresh worker (sandbox convenience) — that's insecure for production.

**Approach**: On `POST /api/auth/magic-link` (new route), generate a `SigninToken` row + send the email via Resend (`https://api.resend.com/emails`). User clicks the link → `/api/auth/callback?token=…` → calls the `email` provider's `authorize` with the token. Remove the `email-only` provider for production.

---

### R14. i18n completion pass for ~30 hardcoded English strings

**What**: Add the missing i18n keys for the placeholder text + aria-labels flagged by the WS6 audit (in frozen/other-WS files: `LanguageToggle`, `AppShell`, dashboard hints, employer page placeholders, etc.).

**Why**: WS6 added 21 new keys × 3 languages for its own territory, but ~30 legacy strings remain in frozen/other-WS files. They're not security-impacting and only appear on internal employer/admin pages — but a Telugu speaker on those pages would see mixed English + Telugu.

**Approach**: Run a `grep` for `placeholder=` + `aria-label=` + `description=` + `Label>` + `<CardTitle>` patterns in `src/app/employer/**`, `src/app/admin/**`, `src/components/dashboard/**`, `src/components/shared/**`. Add the missing keys to `src/lib/i18n/{en,hi,te}.ts`. Replace the hardcoded strings with `useLanguage().t()` calls.

---

### R15. Progressive Profiling (split onboarding across multiple sessions)

**What**: Instead of a 3-step onboarding wizard at signup, let workers sign up with just name + trade (1 step) and progressively fill the rest as they encounter prompts on the feed/profile.

**Why**: The directive's "<3 min onboarding" target is met by the current 3-step wizard, but workers who drop off after step 1 lose all their work. Progressive profiling means a worker who drops off after step 1 still has a usable profile (just lower `profileStrength`).

**Approach**: Split `OnboardWorkerBody` into `OnboardWorkerBodyBasic` (name + trade) + optional follow-up fields. Mark which fields are required for what downstream feature (e.g. wage range required for match score; lat/lng required for distance filter). Show inline prompts on the feed/profile to complete the missing fields.

---

### R16. Worker rating flow (RAT-01..03 — schema already exists)

**What**: Allow employers to rate workers (1-5) post-hire, and vice versa.

**Why**: The `Rating` table exists in `prisma/schema.prisma` (linked to `Application`), but no UI surface or API route uses it. Adding it would close the loop on worker trust (ratings could feed into `computeTrustScore` as another factor).

**Approach**: Add `/api/employer/ratings` POST (rate a worker post-hire) + `/api/worker/ratings` POST (rate an employer post-hire). Show a "Rate your worker/employer" prompt on the hired application's detail page after `hiredAt + 24h`. Optionally include a small `ratings_count + avg_rating` boost in `computeTrustScore`.

---

### R17. Multi-language support expansion (Marathi, Tamil, Kannada, Odiya, Bengali)

**What**: Add more Indian languages beyond EN/HI/TE.

**Why**: The directive specifies EN/HI/TE (coastal Andhra focus), but the i18n architecture is generic — adding a new language is one file (`src/lib/i18n/<lang>.ts`) + one entry in the `LanguageToggle`'s language list. Marathi (Maharashtra) + Tamil (Tamil Nadu) + Kannada (Karnataka) would unlock adjacent markets.

**Approach**: Translate the EN dictionary to each new language (one PR per language). Add to `LanguageProvider`'s supported list. Verify the Mock provider's `TRADE_KEYWORDS.<lang>` map covers the new language's trade names (e.g. `बिजली` for Hindi electrician).

---

### R18. Vercel deploy + production env swap

**What**: One `vercel --prod` deploy with the right env vars.

**Why**: The app is "deployment-shaped" per directive §0 — no localhost URLs in fetch, all secrets via env vars, Prisma swap to Postgres is one `DATABASE_URL` change.

**Approach**:
1. `vercel link` + `vercel --prod`.
2. Set env vars: `DATABASE_URL=postgres://...`, `NEXTAUTH_SECRET=<strong-secret>`, `STORAGE_HMAC_SECRET=<strong-secret>`, `AI_PROVIDER=zai`, `NEXT_PUBLIC_DEMO_MODE=false`.
3. Swap `db` directory from local `/storage` to S3 / Vercel Blob Storage.
4. Set `NEXTAUTH_URL=https://shramsetu.app`.
5. Run `prisma migrate deploy` to provision the Postgres schema.
6. Re-run the seed against production Postgres.

---

### R19. Analytics (product analytics + error tracking)

**What**: Add PostHog (product analytics) + Sentry (error tracking) for production observability.

**Why**: The directive's north-star metric (average time-to-hire) is computed live from real data, but there's no analytics on user behavior (drop-off, funnel, feature usage). Sentry would catch any runtime errors that escape `errorResponse()`'s 500 catch-all.

**Approach**: Add `posthog` + `@sentry/nextjs` to `package.json`. Initialize PostHog in `src/components/shared/AuthProvider.tsx` (or a new `<AnalyticsProvider>`). Wrap `errorResponse()`'s 500 branch in `Sentry.captureException(err)`.

---

### R20. Accessibility WCAG AA audit pass

**What**: Run a formal WCAG AA audit on every screen — keyboard navigation, focus management, screen-reader labels, color contrast.

**Why**: WS6 did a class-audit on its own pages (icon + text labels, ≥48px touch targets, focus-visible styling), but a formal audit with a screen reader (NVDA / VoiceOver) would catch issues invisible to sighted developers.

**Approach**: Use axe-core + Lighthouse for automated checks. Manually tab through every page with NVDA + VoiceOver. Document findings in `docs/accessibility.md` (new). Fix critical issues.

---

## Priority ranking for next 6 months

| Priority | Item | Effort | Impact |
|---|---|---|---|
| P0 | R14 — i18n completion pass | Small (1 day) | Medium (Telugu employer/admin UX) |
| P0 | R12 — Rate limiting | Small (1 day) | High (security + cost protection) |
| P0 | R13 — Real email magic-link | Medium (3 days) | High (production auth) |
| P0 | R18 — Vercel deploy | Small (1 day) | High (production launch) |
| P1 | R8 — PWA manifest + SW | Medium (3 days) | High (mobile install) |
| P1 | R9 — Real embeddings (MAT-04) | Medium (3 days) | Medium (match quality) |
| P1 | R10 — Real OCR (VER-05) | Medium (5 days) | Medium (admin ops speed) |
| P1 | R16 — Worker rating flow | Small (2 days) | Medium (trust loop) |
| P2 | R11 — Real-time push (WS) | Large (1-2 weeks) | Medium (UX latency) |
| P2 | R19 — Analytics + Sentry | Small (2 days) | Medium (observability) |
| P2 | R20 — WCAG AA audit | Medium (5 days) | High (accessibility compliance) |
| P3 | R1 — In-app chat | Large (2-3 weeks) | Medium (post-shortlist UX) |
| P3 | R2 — Payments | Large (3-4 weeks) | High (post-hire settlement) |
| P3 | R3 — Real SMS/WhatsApp | Large (2 weeks + DLT) | Medium (offline notifications) |
| P3 | R4 — Native apps | Large (4-6 weeks) | Medium (mobile UX) |
| P3 | R5 — DigiLocker | Large (2-3 weeks + partner approval) | High (verification automation) |
| P3 | R6 — Background-check APIs | Large (2-3 weeks + partner approval) | High (trust automation) |
| P3 | R7 — Multi-city ops | Large (2-3 weeks) | High (scale) |
| P3 | R15 — Progressive Profiling | Medium (1 week) | Medium (onboarding drop-off) |
| P3 | R17 — More languages | Small per language (2 days each) | High (market expansion) |
