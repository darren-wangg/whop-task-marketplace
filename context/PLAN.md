# Whop Task Marketplace — Phased Plan

Source of truth for *what* and *why* is `CLAUDE.md`. This file is the *how*: ordered phases, each ending in a verifiable state.

The full plan (with rationale and tradeoffs) lives at `~/.claude/plans/here-is-the-project-cuddly-robin.md`.

---

## Phase 0 — Project hygiene

- [x] `CLAUDE.md` written
- [x] `context/PLAN.md` written (this file)
- [ ] Install runtime deps: `prisma @prisma/client zod react-hook-form @hookform/resolvers framer-motion frosted-ui`
- [ ] Install dev deps: `tsx vitest @vitest/coverage-v8`
- [ ] `package.json` scripts: `build` → `prisma generate && next build`; add `postinstall`, `db:push`, `db:migrate`, `db:seed`, `test`, `test:watch`; add `"prisma": { "seed": "tsx prisma/seed.ts" }`

**Exit criterion**: `pnpm typecheck && pnpm lint` green; deps installed.

---

## Phase 1 — Foundations

- [ ] `prisma/schema.prisma` — 6 models: `Account`, `Task`, `TaskAcceptance`, `Submission`, `Payment`, `IdempotencyKey`. `BigInt` for money. Indexes per plan.
- [ ] `src/server/db.ts` — Prisma singleton with `global.__prisma`
- [ ] `src/lib/money.ts` — `toCents`, `formatCents`, `bigIntReplacer`
- [ ] `tests/money.test.ts`
- [ ] `src/server/actor.ts` — `getCurrentActor()`, `requireActor(kind?)`
- [ ] `src/lib/actions/actor.ts` — `setActor(id)` cookie writer
- [ ] `src/components/theme/ThemeProvider.tsx` (`'use client'` wrapping frosted-ui `<Theme>`)
- [ ] `src/components/header/ThemeToggle.tsx`
- [ ] `src/lib/actions/theme.ts` — `setAppearance`, `setAccent`
- [ ] `src/components/header/Header.tsx` + `RoleSwitcher.tsx`
- [ ] `src/app/layout.tsx` — wraps `<Theme>`, mounts `<Header>`, reads theme + actor cookies
- [ ] `src/app/globals.css` — `@import "tailwindcss"; @import "frosted-ui/styles.css";`
- [ ] `prisma/seed.ts` — 4 accounts (`biz_acme`, `biz_pixel`, `usr_ada`, `usr_lin`), ~10 tasks, 3 pre-created acceptances (accepted / submitted / approved-with-payment)

**Exit criterion**: `pnpm db:push && pnpm db:seed && pnpm dev` → header renders, role switcher swaps actor, theme toggle persists across reloads, money tests pass.

**Decision point**: if frosted-ui breaks under Tailwind v4 (Path A), fall back to Tailwind v3 (Path B) per plan. Record which path won in `CLAUDE.md` § Stack.

---

## Phase 2 — Core flows

- [ ] `src/server/validators/types.ts` — `Validator`, `ValidatorInput`, `ValidatorResult`, `ValidatorVerdict`
- [ ] `src/server/validators/manual.ts` — `ManualValidator` (returns reviewer's decision)
- [ ] `src/server/validators/index.ts` — `getValidator()` factory
- [ ] `tests/validators/manual.test.ts`
- [ ] `src/lib/schemas.ts` — Zod schemas for `createTask`, `acceptTask`, `submitWork`, `reviewSubmission`
- [ ] `src/server/services/tasks.ts` — `createTask`, `listTasks` (filter/cursor), `getTask`, `acceptTask`
- [ ] `src/server/services/submissions.ts` — `submitWork`
- [ ] `src/server/services/reviews.ts` — `review(submissionId, decision)` using `db.$transaction`
- [ ] `tests/services/reviews.test.ts` — approve creates `Payment`; reject doesn't
- [ ] `src/server/services/payments.ts` — `listForUser`
- [ ] `src/lib/actions/{tasks,submissions,reviews}.ts` — Server Action wrappers
- [ ] Pages: `/`, `/tasks/[id]`, `/business`, `/business/tasks/new`, `/business/tasks/[id]`, `/me`
- [ ] Components: `TaskCard`, `TaskFilters`, `CreateTaskForm`, `SubmitWorkForm`, `ReviewControls`, `FadeIn`

**Exit criterion**: full end-to-end flow walkable in the browser (marketplace → accept → submit → approve → earnings).

---

## Phase 3 — API surface + idempotency

- [ ] `src/server/idempotency.ts` — `withIdempotency(scope, actor, req, handler)`
- [ ] `tests/idempotency.test.ts` — store/replay/422-on-hash-mismatch
- [ ] `app/api/tasks/route.ts` (GET search, POST create — wrapped)
- [ ] `app/api/tasks/[id]/accept/route.ts` (wrapped)
- [ ] `app/api/tasks/[id]/submit/route.ts` (wrapped)
- [ ] `app/api/business/tasks/[id]/submissions/[sid]/review/route.ts` (wrapped — critical)
- [ ] `app/api/payments/route.ts` (GET)

**Exit criterion**: `curl` smoke tests pass; replaying with the same `Idempotency-Key` returns identical response + status; replaying with a different body returns 422.

---

## Phase 4 — Polish + deploy prep

- [ ] Framer Motion: card mount, list transitions, modal mount
- [ ] Empty states + loading skeletons on every page
- [ ] `README.md` quickstart (local dev + Vercel deploy)
- [ ] Vercel project + Neon project provisioning notes
- [ ] First deploy: `DATABASE_URL=<direct> pnpm prisma db push && pnpm db:seed`, then `vercel --prod`
- [ ] Smoke-test deployed URL using the same verification walkthrough

**Exit criterion**: live URL passes the end-to-end walkthrough.

---

## Out of scope (do not build)

NextAuth/Clerk/sessions. Stripe/payouts/webhooks. File uploads. Notifications/email/realtime. Admin role. LLM validator (only the seam). Storybook. Analytics. i18n. Optimistic UI / React Query / SWR. Editing/deleting tasks. Trigram indexes. E2E or component tests. Nightly idempotency-key cleanup.
