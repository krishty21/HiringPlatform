# r14-employer-pages employer-pages-subagent

Master Prompt Phase 4 (employer dashboard / candidates / pipeline / jobs / post) + Phase 5 admin polish. Picking up after r14-orchestrator + r14-worker-pages.

## Files redesigned (priority order)

### Foundational shared + dashboard components
1. src/components/shared/StatCard.tsx — Removed motion, blur-2xl corner glow, whileHover:y-2 transform, tone-colored card backgrounds. Added: surface-raised + shadow-raise, h-0.5 top hairline (color via tone), text-meta uppercase label.
2. src/components/shared/MatchScoreBadge.tsx (per r14-worker-pages rec #4) — Removed Sparkles icon, color-only Badge tones, "%" suffix. Added: status-dot (color + shape), text-meta "MATCH" eyebrow + numeric value.
3. src/components/dashboard/FunnelChart.tsx — Removed gradient bars (from-primary to-accent etc.), motion width animation. Added: solid ink tones per stage, status-dot per stage label, border + border on each bar track. Semantic <ol>/<li>.
4. src/components/dashboard/ScoreDistributionSparkline.tsx — Removed rainbow palette (rose/orange/amber/emerald-600). Added: ink-only palette (var(--ink-subtle) ×2 → var(--info) ×2 → var(--accent)).
5. src/components/dashboard/TimeToHireHeadline.tsx — Removed rounded-xl + ring-1 ring-inset. Added: rounded-md + border-border chip, text-ink typography alignment.
6. src/components/dashboard/PerJobDrilldownRow.tsx — Removed STAGE_TONES color-only Badge backgrounds. Added: STAGE_DOT status-dot per stage, surface-raised + shadow-raise, neutral border-border + bg-surface stage chips, semantic dl/dt/dd on expand.

### Employer components
7. src/components/employer/EmployerReputationCard.tsx — Removed motion entrance + motion.span spring pill, blur-3xl amber corner glow, top gradient hairline, amber-tinted card backgrounds, amber Star icon. Added: surface-raised + shadow-raise, h-0.5 bg-positive hairline when top-employer, Award icon, trust-pill.is-verified, surface-inset for empty-state CTA + nudge box.
8. src/components/employer/EndorsementModal.tsx — Removed Star icon (replaced with Award — semantic). Functional dialog intact.
9. src/components/employer/CandidateFilters.tsx — Removed emerald/amber-tinted toggle row backgrounds, fill-amber-400 Star icon. Added: surface-inset neutral toggle rows, status-dot (is-positive/is-warning) for on/off state, Gauge icon (semantic match signal).
10. src/components/employer/CandidateCard.tsx — Removed motion entrance, gradient top hairline, Sparkles on top-reason, hover:-translate-y-0.5 + hover:shadow-md, emerald available-today Badge, amber Star proficiency chips. Added: surface-raised + shadow-raise, status-dot for available-today, inline dl/dt/dd for skills with proficiency dots (no chips), "Open dossier →" CTA row.
11. src/components/employer/PipelineKanban.tsx — Removed STATUS_TONE decorative top-gradient column tones, rose/amber/sky/violet color-only action buttons, emerald available-today Badge. Added: STATUS_DOT status-dot per stage (color + shape), surface-raised cards, **accessible Select dropdown per card** ("Move to…") per Master Prompt §30. Kept DnD + bulk-shortlist + EndorsementModal flow.
12. src/components/employer/JobPostForm.tsx — Removed Sparkles icon (replaced with Wand2), accent/40 bg-accent/10 urgent toggle card, rounded-full pill skill chips. Added: surface-inset neutral urgent toggle with status-dot, surface-raised form cards, text-meta uppercase labels with Step 1/Step 3 progression, rounded-md chipless buttons with required/optional toggle chip.

### Employer pages
13. src/app/employer/dashboard/page.tsx (§31) — Removed motion entrance, blur-2xl corner glow, PipelineSummaryRow motion animation, "Click any job to expand" copy. Added: border-b sectioned header, dl/dt/dd headline panel (time-to-hire + new shortlist-rate supplementary metric), h-0.5 bg-primary top hairline, semantic <section> + text-meta uppercase headings, surface-raised + shadow-raise for funnel + reputation.
14. src/app/employer/candidates/page.tsx (§28 — ATS-style) — Removed amber urgent boost pill, rounded-full count badge. Added: border-b sectioned header, inline-meta p with total count.
15. src/app/employer/candidates/[id]/page.tsx (§29 — professional dossier) — Removed motion entrance, big primary-tinted avatar, emerald Badge, amber Star proficiency chips, accent-tinted endorsement cards, gradient amber rating-prompt. Added: passport-card + passport-stamp, **border-t sectioned dl dossier layout following the exact 10-step hierarchy** (Identity → Verification → Skills → Experience/Availability/Location → Wage → Match → Reputation → Actions), status-dot primitives, trust-pill.is-verified for verified endorsements, neutral surface-inset rating prompt.
16. src/app/employer/pipeline/page.tsx (§30 — operational) — Removed border-dashed bg-muted/30 tip Card. Added: border-b sectioned header + surface-inset operational tip section with two hint lines.
17. src/app/employer/jobs/page.tsx — Removed animate-in stagger, emerald/slate Badge pills, hover:bg-accent/40 row tint. Added: StatusPill component with status-dot, surface-raised + shadow-raise table Card, hover:bg-surface-sunken row tint, text-meta uppercase table headers. Preserved two-step arm→confirm close UX.
18. src/app/employer/post/page.tsx (§64 — form UX) — Added: border-b sectioned header (eyebrow + h1 + subtitle), max-w-3xl mx-auto for focused form width.

### Admin
19. src/app/admin/page.tsx (§33 — credential infrastructure) — Removed hover:scale-[1.02] decorative transform, hover:bg-accent/40 quick-action tint, primary/10 amber corner-chip icon. Added: border-b sectioned header (adminEyebrow + h1 with FileCheck icon chip), dl grid of StatCards, surface-raised + shadow-raise quick-action Link card with ChevronRight affordance.
20. src/app/admin/verifications/page.tsx (§33 — credential queue) — Removed hover:bg-accent/40 row tint, RefreshCw icon. Added: border-b sectioned header + Refresh (RefreshCcw) button, surface-raised + shadow-raise table Card with hover:bg-surface-sunken row tint, text-meta uppercase table headers.
21. src/components/admin/AnalyticsCharts.tsx — Removed motion.section entrance, amber Zap icon chip, saffron hardcoded color. Added: plain <section> + <header> + <h2>, surface-raised + shadow-raise cards, status-dot is-warning urgent-of pill, Gauge icon hires-weeks pill, chart palette aligned with design tokens (PRIMARY=#12355B navy, ACCENT=#D97732 orange, INFO=#1E4F8B, POSITIVE=#238B67, INK_SUBTLE=#8A949E — no rainbow).

## i18n parity (additive, EN+HI+TE byte-identical order — verified with grep -c)
- Added 48 new keys (verified `grep -c "^  KEY:"` returning 1 across all three langs):
  - Employer dashboard: dashEyebrow, dashStatsAria, dashStatsHeading, dashActiveJobsHint, dashShortlistRate, dashShortlistRateHint, dashFunnelHint, dashPerJobHint (8)
  - Candidates: candidatesEyebrow, candidatesFiltersTitle, candidatesFiltersReset, candidatesFilterExpMin, candidatesFilterExpMax, candidatesFilterWageMin, candidatesFilterWageMax, candidatesBack, candidatesDossierAria, candidatesIdentity, candidatesExperienceAvail, candidatesAvailable, candidatesNotToday, candidatesNoSkills, candidatesMatchExplainer, candidatesActionsAria, candidatesOpenDossier, candidatesMoreSkills (18)
  - Pipeline: pipelineEyebrow, pipelineCardAriaRole, pipelineCardActions, pipelineCardMoveTo, pipelineHintLine1, pipelineHintLine2 (6)
  - My jobs: myJobsEyebrow (1)
  - Post job: postJobEyebrow, postJobSubtitle, postJobStep1Label, postJobStep3Label, postJobSkillsHint, postJobAiDescShort, postJobDescPlaceholder (7)
  - Admin: adminEyebrow, adminStatsAria, adminStatsHeading, adminQuickActionsAria, adminQuickActionVerifyDesc, adminQueueEyebrow, adminQueueRefresh (7)
  - Unit: unitDay (1)
- Total dictionary key count after this round: 686 (en=686 hi=686 te=686).

## Frozen contracts preserved
- prisma/schema.prisma — untouched
- src/lib/schemas/index.ts — untouched
- src/lib/ai/* — untouched
- src/lib/auth.ts, src/lib/authz.ts — untouched
- src/lib/matching/*, src/lib/trust/recompute.ts — untouched
- src/app/api/** — untouched

## Lint
- `bun run lint` clean (0 errors) after every file written, and after the i18n additions. Final state: eslint . exits 0.

## Verification (agent-browser at http://localhost:3000)
- Logged in as employer Priya (demo button @e8 on /login) → /employer/dashboard (screenshot: /tmp/r14-employer-dashboard.png).
- /employer/candidates (screenshot: /tmp/r14-employer-candidates.png).
- /employer/candidates/cmtdf4p9q000trwjdp7f4ai64 (Ravi Kumar dossier — screenshot: /tmp/r14-employer-candidate-dossier.png).
- /employer/pipeline (screenshot: /tmp/r14-employer-pipeline.png).
- /employer/jobs (screenshot: /tmp/r14-employer-jobs.png) — clicked Close on Mason row, confirmed two-step arm→Confirm close UX.
- /employer/post (screenshot: /tmp/r14-employer-post.png).
- Logged out + back in as Admin Demo (@e9).
- /admin (screenshot: /tmp/r14-admin-home.png).
- /admin/verifications (screenshot: /tmp/r14-admin-verifications.png).
- All routes return HTTP 200 when authenticated; redirect to /login (307) when unauthenticated.
