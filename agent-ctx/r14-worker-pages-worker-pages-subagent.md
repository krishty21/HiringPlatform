# r14-worker-pages worker-pages-subagent

Continuing the Master Prompt complete product redesign. Phase 1 (globals.css) and Phase 2 (landing + login) and Phase 3a (worker home + jobs board + JobCard) already complete. Picking up the remaining worker-facing pages + the public Kaam Card (signature component).

## Design language (already in place — src/app/globals.css)
- Tokens: navy `--primary` (#12355B), ivory `--background`, industrial orange `--accent`, professional green `--positive`.
- Three ink tones: `--ink`, `--ink-muted`, `--ink-subtle`.
- Surfaces: `.surface-raised`, `.surface-inset`, `.surface-sunken`.
- Status: `.status-dot.is-positive/.is-warning/.is-error/.is-info/.is-neutral` (color + shape).
- Trust: `.trust-pill.is-verified/.is-pending/.is-employer` (color + text + border).
- Tracker: `.tracker-step-done/.tracker-step-current/.tracker-step-todo`, `.tracker-line`.
- Passport: `.passport-card`, `.passport-stamp` (dashed accent border, rotated -4deg).
- Shadows: `.shadow-raise`, `.shadow-raise-md`, `.shadow-raise-lg` (restrained ink-tinted).
- Calm fade-in: `.animate-fade-in`, `.animate-bar-reveal`.

## Slop to remove
- Sparkles icon → replaced with semantic icons (ShieldCheck, Gauge, Clock, Mic, MapPin, IndianRupee, Briefcase, Handshake, HardHat, Check, ChevronRight, ArrowRight, X, IdCard, Award, Trophy, Ban, CornerUpLeft, Undo2, RefreshCcw, Loader2, Lock, FileText, Mic).
- `bg-gradient-to-*` (especially on cards/banners).
- `blur-3xl`/`blur-2xl` decorative blobs.
- `motion` stagger entrance animations (only `.animate-fade-in` for status transitions).
- `hover:scale-105` decorative transforms; only color/border hover changes.
- Watermark giant numbers, decorative gradient hairlines, "AI Match™" copy.
- Card-with-card-with-card layouts → use `dl/dt/dd` semantic data, `border-t border-border` sectioned layouts.

## i18n policy
- Existing keys must NOT be renamed/removed.
- New keys must be additive to en.ts/hi.ts/te.ts with byte-identical order.
- Prefer reusing existing keys.
- Translations are human-grounded (per Master Prompt §36). No "AI structures it" / "SmartMatch".

## Files in scope
1. `src/app/jobs/[id]/page.tsx` (job detail + match explanation)
2. `src/app/profile/page.tsx` (Workforce Passport — SIGNATURE)
3. `src/app/applications/page.tsx` (applications list)
4. `src/app/applications/[id]/page.tsx` (application tracker)
5. `src/app/onboarding/worker/page.tsx` (form UX)
6. `src/app/verify/page.tsx` (credential infrastructure)
7. `src/components/worker/{TrackerTimeline,TrustTimeline,TradeGrid,VoiceButton,NotificationsBell}.tsx`
8. `src/components/public/{KaamCard,KaamCardShared}.tsx` (signature)
9. (Indirect) `src/app/c/[slug]/page.tsx` wrapper shell — minor cleanup of the gradient on the shell.

## Frozen contracts (must NOT change)
- prisma/schema.prisma
- src/lib/schemas/index.ts
- src/lib/ai/*
- src/lib/auth.ts, src/lib/authz.ts
- src/lib/matching/*, src/lib/trust/recompute.ts
- src/app/api/** (no API route changes; only client surfaces)

## Verification plan
- Login as worker Ravi via /login?demo=demo-worker.
- Visit /jobs/[id] using a real job id.
- Visit /profile, /applications, /applications/[id], /onboarding/worker, /verify.
- Visit the public Kaam Card at /c/{worker-slug}.
- Take before/after screenshots at /tmp/r14-worker-*.png.
- Run `bun run lint` after each file.
