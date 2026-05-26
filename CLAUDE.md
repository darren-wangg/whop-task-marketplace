@context/AGENTS.md

# Whop Task Marketplace — v1

A task-based marketplace inspired by Whop. Businesses post paid tasks with submission criteria; users browse, accept, submit work URLs, and get paid (DB ledger row) after the business approves. v1 has no real auth, no Stripe, no observability — focus is a clean, extensible structure.

## Stack

- Next.js 16 (App Router, Turbopack), React 19, TypeScript strict
- Tailwind v4 (CSS-config via `@import "tailwindcss"`)
- `frosted-ui` (Whop design system, canary)
- Prisma + Neon Postgres
- Zod + react-hook-form + @hookform/resolvers
- Framer Motion
- Vitest (unit tests at the logic core only)
- pnpm

## Commands

| Command | What |
| --- | --- |
| `pnpm dev` | Local dev server |
| `pnpm build` | `prisma generate && next build` |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm format` | Prettier write |
| `pnpm test` | Vitest run |
| `pnpm db:push` | `prisma db push` (schema sync, no migration file) |
| `pnpm db:migrate` | `prisma migrate dev` (create migration file) |
| `pnpm db:seed` | `tsx prisma/seed.ts` |

To reset DB: `pnpm db:push --force-reset && pnpm db:seed`.

## Architecture invariants

These are load-bearing. Don't bypass.

1. **Services are the single source of truth.** All business logic lives in `src/server/services/*`. Route handlers (`app/api/**`) and Server Actions (`src/lib/actions/**`) are ~10-line adapters that call services. No DB access outside `src/server/`.
2. **The validator strategy is the only path to approve/reject.** `src/server/services/reviews.ts` calls `getValidator().run(...)` from `src/server/validators/index.ts`. To add an LLM validator later, swap that factory. Never branch on validator type in callers.
3. **The actor cookie is NOT auth.** It's a demo seed selector. `src/server/actor.ts` resolves it; never trust it for real authorization.
4. **Server Actions for in-app flows; API routes for the public surface.** Both wrap the same services. The dual surface is required by the brief.
5. **Money is BigInt cents, end to end.** Postgres `BIGINT` → Prisma `BigInt` → JSON decimal string at the API boundary. See `src/lib/money.ts`.
6. **Mutating routes are idempotent.** All POSTs with side effects accept an `Idempotency-Key` header and route through `withIdempotency()` in `src/server/idempotency.ts`. The review endpoint (creates `Payment`) is the most critical.

## Where to find things

- Pages: `src/app/**`
- Business logic: `src/server/services/**`
- Validator seam: `src/server/validators/**`
- Shared Zod schemas: `src/lib/schemas.ts`
- Server Action wrappers: `src/lib/actions/**`
- Money helpers: `src/lib/money.ts`
- Idempotency helper: `src/server/idempotency.ts`
- Actor resolution: `src/server/actor.ts`
- UI components: `src/components/**`
- Tests: `tests/**`

## Conventions

- Money is `BigInt` cents in DB and `bigint` in code. Display via `formatCents()`. JSON-serialize via the replacer in `src/lib/money.ts`.
- IDs are cuids.
- Dates are `DateTime` in Prisma, ISO 8601 strings over the wire.
- One Zod schema per mutation, shared by route + action.
- Server-only modules import `db` from `@/server/db`, never `@prisma/client` directly.
- Server Components are the default; add `'use client'` only where interactivity is required.

## Recipe: adding a new mutation

1. Add/update the Zod schema in `src/lib/schemas.ts`.
2. Implement the service function in `src/server/services/<area>.ts` (takes typed args + `actor: Account`, returns plain objects, throws typed errors).
3. Wrap in a Server Action in `src/lib/actions/<area>.ts` (`'use server'`, parses FormData, calls service, `revalidatePath`, redirect).
4. Wrap in a route handler in `src/app/api/**` (parses JSON, calls `getCurrentActor()`, calls service, returns `NextResponse.json`).
5. If the mutation has side effects, wrap the handler body in `withIdempotency(scope, actor, req, handler)`.

## Recipe: swapping in an LLM validator

Implement `Validator` in `src/server/validators/llm.ts`. In `src/server/validators/index.ts`, change `getValidator()` to return `new LLMValidator()`. No service or route changes required.

## Deploy (Vercel + Neon)

- Set `DATABASE_URL` (Neon **pooled**) and `DIRECT_URL` (Neon **direct**) in Vercel envs for all environments.
- `postinstall: prisma generate` runs automatically on Vercel.
- Provision schema: `DATABASE_URL=<direct> pnpm prisma db push && pnpm db:seed` from local once.
- Future schema changes: `pnpm db:migrate` locally → `prisma migrate deploy` in build hook.

## Known risks

- `frosted-ui` is canary (`0.0.0-canary.x`). Pin the version; expect occasional breaking changes.
- Tailwind v4 + frosted-ui's plugin compatibility unknown. We use the CSS-only path (Path A); if components break, see plan notes for the v3 fallback (Path B).

## See also

- `context/PLAN.md` — phased delivery plan for the v1 surface.
- `context/AGENTS.md` — Next 16 caveat reminder; bundled docs at `node_modules/next/dist/docs/`.
