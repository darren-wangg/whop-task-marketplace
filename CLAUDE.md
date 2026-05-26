@context/AGENTS.md

# Whop Task Marketplace — v1

A task-based marketplace inspired by Whop. Businesses post paid tasks with submission criteria; users browse, accept, submit work URLs, and get paid (DB ledger row) after the business approves. v1 has no real auth, no Stripe, no observability — focus is a clean, extensible structure.

For the system-design overview (data flow, request lifecycle, validator seam), see [`context/ARCHITECTURE.md`](./context/ARCHITECTURE.md).

## Stack

- Next.js 16 (App Router, Turbopack), React 19, TypeScript strict
- Tailwind v4 (CSS-config via `@import "tailwindcss"`) — **Path A** worked: frosted-ui consumed via `@import "frosted-ui/styles.css"`, no plugin needed
- `frosted-ui` `0.0.1-canary.143` (Whop design system)
- Prisma 7 + Neon Postgres (driver adapter: `@prisma/adapter-pg`)
- Zod 4 + react-hook-form + @hookform/resolvers
- Framer Motion (`FadeIn` wrapper applied across cards / hero / lists)
- Vitest (unit tests at the logic core only — 16 tests, ~200ms)
- pnpm

## Commands

| Command           | What                                                           |
| ----------------- | -------------------------------------------------------------- |
| `pnpm dev`        | Local dev server                                               |
| `pnpm build`      | `prisma generate && next build`                                |
| `pnpm lint`       | ESLint                                                         |
| `pnpm typecheck`  | `tsc --noEmit`                                                 |
| `pnpm format`     | Prettier write                                                 |
| `pnpm test`       | Vitest run (16 tests: money, manual validator, review service) |
| `pnpm db:push`    | `prisma db push` (schema sync, no migration file)              |
| `pnpm db:migrate` | `prisma migrate dev` (create migration file)                   |
| `pnpm db:seed`    | `tsx prisma/seed.ts`                                           |

To reset DB: `pnpm db:push --force-reset && pnpm db:seed`.

## Architecture invariants

These are load-bearing. Don't bypass.

1. **Services are the single source of truth.** All business logic lives in `src/server/services/*`. Route handlers (`app/api/**`) and Server Actions (`src/lib/actions/**`) are thin adapters that call services. No DB access outside `src/server/`.
2. **The validator strategy is the only path to approve/reject.** `src/server/services/reviews.ts` calls `getValidator().run(...)` from `src/server/validators/index.ts`. To add an LLM validator later, swap that factory. Never branch on validator type in callers.
3. **The actor cookie is NOT auth.** It's a demo seed selector (`actorId` cookie). `src/server/actor.ts` resolves it; never trust it for real authorization.
4. **Server Actions for in-app flows; API routes for the public surface.** Both wrap the same services. The dual surface is required by the brief.
5. **Money is BigInt cents, end to end.** Postgres `BIGINT` → Prisma `BigInt` → JSON decimal string at the API boundary. See `src/lib/money.ts`. Server-only modules must use `serializeJSON` / `bigIntReplacer` when serializing payloads that contain money.
6. **Mutating routes are idempotent.** All POSTs with side effects accept an `Idempotency-Key` header and route through `withIdempotency()` in `src/server/idempotency.ts`. The review endpoint (creates `Payment`) is the most critical. Same key + same body → replay; same key + different body → 422.

## Where to find things

- Pages: `src/app/**` (App Router)
- Business logic: `src/server/services/**`
- Validator seam: `src/server/validators/**`
- Shared Zod schemas: `src/lib/schemas.ts`
- Server Action wrappers: `src/lib/actions/**`
- Route handlers: `src/app/api/**`
- Money helpers: `src/lib/money.ts`
- Idempotency helper: `src/server/idempotency.ts`
- Actor resolution: `src/server/actor.ts`
- Theme cookies / reader: `src/server/theme.ts` + `src/lib/theme-types.ts`
- UI components: `src/components/**`
- Tests: `tests/**`

## Conventions

- Money is `BigInt` cents in DB and `bigint` in code. Display via `formatCents()`. JSON-serialize via `serializeJSON()` or the `bigIntReplacer`.
- IDs are cuids (Prisma `@default(cuid())`).
- Dates are `DateTime` in Prisma, ISO 8601 strings over the wire.
- One Zod schema per mutation, shared by route + action.
- Server-only modules import `db` from `@/server/db` (never `@prisma/client` directly); the client itself is lazy-instantiated by a `Proxy` so `next build` doesn't need `DATABASE_URL` at compile time.
- Server Components are the default; add `'use client'` only where interactivity is required.
- Server Action files (`"use server"`) can only export async functions — put shared types/constants in a sibling file (see `src/lib/theme-types.ts` next to `src/lib/actions/theme.ts`).

## Recipe: adding a new mutation

1. Add/update the Zod schema in `src/lib/schemas.ts`.
2. Implement the service function in `src/server/services/<area>.ts` (takes typed args + `actor: Account`, returns plain objects, throws typed `ServiceError`).
3. Wrap in a Server Action in `src/lib/actions/<area>.ts` (`"use server"`, parses FormData, calls service, `revalidatePath`, redirect).
4. Wrap in a route handler in `src/app/api/**` (calls `requireActorOrError(kind)`, parses JSON, calls service, returns `jsonResponse(status, body)`).
5. If the mutation has side effects (writes), wrap the handler body in `withIdempotency({ scope, actorId, request }, handler)`.
6. Use `errorBody(err)` from `src/server/api-helpers.ts` inside `handler` to translate `ServiceError`s into HTTP responses.

## Recipe: swapping in an LLM validator

Implement `Validator` (from `src/server/validators/types.ts`) in `src/server/validators/llm.ts`. In `src/server/validators/index.ts`, change `getValidator()` to return `new LLMValidator()`. No service, route, or UI changes required.

## Deploy (Vercel + Neon)

1. Create a Neon project. Copy the **pooled** connection string into Vercel env `DATABASE_URL` and the **direct** connection string into `DIRECT_URL` (set in Production + Preview + Development).
2. `postinstall: prisma generate` runs automatically on Vercel.
3. Provision the live schema once from local: `DATABASE_URL=<direct> pnpm prisma db push && pnpm db:seed`.
4. Future schema changes: `pnpm db:migrate` locally → `prisma migrate deploy` in a build hook.

`prisma.config.ts` loads `.env.local` first then `.env`, and only sets `datasource.url` when one is present — so `prisma generate` succeeds in CI before secrets are wired.

## Known risks / gotchas

- `frosted-ui` is canary (`0.0.0-canary.x`). Pin the version; expect occasional breaking changes. Some components have minor prop differences from what you might guess (e.g. `Separator` uses `className` for margin, not `my`; `TextField.Root` wraps `TextField.Input`).
- React 19 vs react-aria peer warnings: `frosted-ui` pulls in `react-aria-components@1.x` which lists React 18 as its peer. Works fine at runtime; pnpm warns on install.
- `pg` driver SSL deprecation warning at startup: harmless (warning about SSL mode aliases changing in pg v9). Add `sslmode=verify-full` to the connection string to silence.
- The dev server takes 5-6s on first request because Turbopack lazily compiles routes.

## See also

- [`README.md`](./README.md) — quickstart, API examples, deploy walkthrough.
- [`context/PLAN.md`](./context/PLAN.md) — phased delivery log (all phases shipped).
- [`context/ARCHITECTURE.md`](./context/ARCHITECTURE.md) — system-design overview with diagrams.
- [`context/AGENTS.md`](./context/AGENTS.md) — Next 16 caveat reminder; bundled docs at `node_modules/next/dist/docs/`.
