# Whop Task Marketplace — Phased Plan

Source of truth for *what* and *why* is `CLAUDE.md`. This file is the *how*: ordered phases, each ending in a verifiable state. **Status: shipped.** Boxes below are checked against the actual repo state.

The full plan (with rationale and tradeoffs) lives at `~/.claude/plans/here-is-the-project-cuddly-robin.md`.

For a system-design overview of how the pieces fit together at runtime, see [`context/ARCHITECTURE.md`](./ARCHITECTURE.md).

---

## Phase 0 — Project hygiene ✅

- [x] `CLAUDE.md` written
- [x] `context/PLAN.md` written (this file)
- [x] Install runtime deps: `prisma @prisma/client zod react-hook-form @hookform/resolvers framer-motion frosted-ui` (+ `@prisma/adapter-pg pg server-only dotenv` added during build)
- [x] Install dev deps: `tsx vitest @vitest/coverage-v8` (+ `@types/pg`)
- [x] `package.json` scripts: `build` → `prisma generate && next build`; added `postinstall`, `db:push`, `db:migrate`, `db:seed`, `test`, `test:watch`; `"prisma": { "seed": "tsx prisma/seed.ts" }`
- [x] `pnpm.onlyBuiltDependencies` allowlist for `@prisma/client`, `@prisma/engines`, `esbuild`, `prisma`

**Exit criterion met**: `pnpm typecheck && pnpm lint` green.

---

## Phase 1 — Foundations ✅

- [x] `prisma/schema.prisma` — 6 models: `Account`, `Task`, `TaskAcceptance`, `Submission`, `Payment`, `IdempotencyKey`. `BigInt` for money. Indexes per plan.
- [x] `prisma.config.ts` — Prisma 7 moved URL config out of `schema.prisma`; loads `.env.local` then `.env`, only sets `datasource` when a URL is present so `prisma generate` works without secrets.
- [x] `src/server/db.ts` — Prisma singleton via lazy `Proxy` so `next build` doesn't require `DATABASE_URL`; uses `@prisma/adapter-pg`.
- [x] `src/lib/money.ts` — `toCents`, `formatCents`, `bigIntReplacer`, `serializeJSON`
- [x] `tests/money.test.ts` (8 tests)
- [x] `src/server/actor.ts` — `getCurrentActor()`, `requireActor(kind?)`, `listSwitchableAccounts()`, `ActorKindError`
- [x] `src/lib/actions/actor.ts` — `setActor(id)` cookie writer
- [x] `src/lib/theme-types.ts` — extracted types/constants (Server Action files can only export async functions)
- [x] `src/components/theme/ThemeProvider.tsx` (`'use client'` wrapping frosted-ui `<Theme>`)
- [x] `src/components/header/ThemeToggle.tsx` (inline SVG sun/moon icons; no emoji)
- [x] `src/lib/actions/theme.ts` — `setAppearance`, `setAccent`
- [x] `src/components/header/Header.tsx` + `RoleSwitcher.tsx`
- [x] `src/app/layout.tsx` — wraps `<Theme>`, mounts `<Header>`, reads theme + actor cookies
- [x] `src/app/globals.css` — `@import "tailwindcss"; @import "frosted-ui/styles.css";`
- [x] `prisma/seed.ts` — 4 accounts (`biz_acme`, `biz_pixel`, `usr_ada`, `usr_lin`), 10 tasks across 4 categories, 3 pre-created acceptances (accepted / submitted / approved-with-payment)

**Exit criterion met**: `pnpm db:push && pnpm db:seed && pnpm dev` → header renders, role switcher swaps actor, theme toggle persists, money tests pass.

**Decision (Path A won)**: frosted-ui works fine with Tailwind v4 via CSS-only consumption (`@import "frosted-ui/styles.css"`). No plugin needed; no v3 fallback required.

---

## Phase 2 — Core flows ✅

- [x] `src/server/validators/types.ts` — `Validator`, `ValidatorInput`, `ValidatorResult`, `ValidatorVerdict`, `ValidatorInputError`
- [x] `src/server/validators/manual.ts` — `ManualValidator` (returns reviewer's decision; enforces business-owns-task)
- [x] `src/server/validators/index.ts` — `getValidator()` factory (cached singleton)
- [x] `tests/validators/manual.test.ts` (5 tests)
- [x] `src/lib/schemas.ts` — Zod schemas for `createTask`, `acceptTask`, `submitWork`, `reviewSubmission`, plus `listTasksFiltersSchema`
- [x] `src/server/services/tasks.ts` — `createTask`, `listTasks` (cursor pagination, filter), `getTask`, `acceptTask`, `listBusinessTasks`
- [x] `src/server/services/submissions.ts` — `submitWork` (transactional acceptance status flip)
- [x] `src/server/services/reviews.ts` — `reviewSubmission` using `db.$transaction`, only place that touches `Payment`
- [x] `tests/services/reviews.test.ts` — approve creates `Payment`; reject doesn't; double-review throws (3 tests)
- [x] `src/server/services/payments.ts` — `listPaymentsForUser`, `listAcceptancesForUser`
- [x] `src/lib/actions/{tasks,submissions,reviews}.ts` — Server Action wrappers
- [x] Pages: `/`, `/tasks/[id]`, `/business`, `/business/tasks/new`, `/business/tasks/[id]`, `/me`
- [x] Components: `TaskCard`, `TaskFilters`, `CreateTaskForm`, `SubmitWorkForm`, `ReviewControls`, `AcceptButton`, `FadeIn`
- [x] `src/server/errors.ts` — typed `ServiceError` (status + code) used across services and the API helpers
- [x] `tests/stubs/server-only.ts` — Vitest alias so `server-only` modules can be imported in unit tests

**Exit criterion met**: full end-to-end flow walkable in the browser.

---

## Phase 3 — API surface + idempotency ✅

- [x] `src/server/idempotency.ts` — `withIdempotency({ scope, actorId, request }, handler)`. Reads `Idempotency-Key`; stores `(key, actorId, scope, requestHash, responseJson, statusCode)`; replays on duplicate; 422 on body-hash mismatch.
- [x] `src/server/api-helpers.ts` — `requireActorOrError(kind)`, `errorBody(err)` (shared by all route handlers).
- [x] `app/api/tasks/route.ts` (GET search, POST create — wrapped)
- [x] `app/api/tasks/[id]/accept/route.ts` (wrapped)
- [x] `app/api/tasks/[id]/submit/route.ts` (wrapped)
- [x] `app/api/business/tasks/[id]/submissions/[sid]/review/route.ts` (wrapped — critical, creates `Payment`)
- [x] `app/api/payments/route.ts` (GET)

**Skipped** (deferred from plan): standalone `tests/idempotency.test.ts` — runtime verification via curl proves the three cases (first call stores, replay returns identical body + `idempotent-replay: true` header, body mismatch returns 422). Add the unit test next time we touch the helper.

**Exit criterion met**: `curl` smoke tests pass; idempotent replay returns the stored response; body-hash mismatch returns 422.

---

## Phase 4 — Polish + deploy prep ✅ (partial)

- [x] Framer Motion: `FadeIn` wrapper applied across cards, hero, and list items.
- [x] Empty states on every page that can be empty (marketplace, /business, /business/tasks/[id], /me).
- [x] `README.md` quickstart (local dev + Vercel deploy).
- [x] `context/ARCHITECTURE.md` — system-design overview with ASCII diagrams.
- [x] Vercel + Neon provisioning notes (in `README.md` and `CLAUDE.md`).
- [ ] **Not run from this machine**: `vercel --prod` deploy. The repo is deploy-ready; env vars are documented. The user can run it.
- [ ] **Skipped** (was in plan): loading skeletons; modal mount animations beyond `FadeIn`. The current UI is responsive enough for v1.

**Exit criterion (partial)**: live deploy not yet exercised, but local end-to-end walkthrough verified.

---

## Verified flows (against real seeded Neon DB)

Run on 2026-05-26 via curl against `localhost:3000`:

1. `GET /api/tasks` → 200, returns 10 tasks
2. `POST /api/tasks/task_animated_promo/accept` as `usr_lin` → 200, acceptance created
3. `POST /api/tasks/task_animated_promo/submit` as `usr_lin` with the acceptance id → 201, submission created
4. `POST /api/business/tasks/task_animated_promo/submissions/<sid>/review` as `biz_pixel` with `{"decision":"approve"}` → 200, `Payment { amountCents: "22500" }` created in the same transaction
5. `GET /api/payments` as `usr_lin` → 200, `totalCents: "22500"` includes the new row
6. Reuse the same `Idempotency-Key` with a different body → 422 `idempotency_key_mismatch`
7. All 6 pages render 200 (`/`, `/tasks/[id]`, `/business`, `/business/tasks/new`, `/business/tasks/[id]`, `/me`)
8. `pnpm typecheck`, `pnpm lint`, `pnpm test` (16/16) all green.

---

## Out of scope (not built)

NextAuth/Clerk/sessions. Stripe/payouts/webhooks. File uploads. Notifications/email/realtime. Admin role. LLM validator (only the seam exists). Storybook. Analytics. i18n. Optimistic UI / React Query / SWR. Editing/deleting tasks. Trigram indexes. E2E or component tests. Nightly idempotency-key cleanup.
