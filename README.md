# Whop Tasks

A task-based marketplace inspired by Whop. Businesses post paid tasks; users accept, submit work, and get paid once a business approves. v1 — no real auth, no Stripe; payments are DB-ledger rows.

For architecture and the validator-strategy seam, see [`context/ARCHITECTURE.md`](./context/ARCHITECTURE.md). For the phased build log, see [`context/PLAN.md`](./context/PLAN.md). For architecture invariants and recipes (add a new mutation, swap in an LLM validator), see [`CLAUDE.md`](./CLAUDE.md).

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · `frosted-ui` (Whop design system) · Prisma 7 + Neon Postgres · Zod · react-hook-form · Framer Motion · Vitest · pnpm.

## Quickstart

```bash
pnpm install
cp .env.example .env.local           # paste your Neon DATABASE_URL + DIRECT_URL
pnpm db:push                          # provision schema
pnpm db:seed                          # seed 4 accounts, 10 tasks, 3 sample acceptances
pnpm dev                              # http://localhost:3000
```

Use the **role switcher** in the header (top right) to swap between seeded accounts. Selection persists in a cookie (this is the demo identity stub — not real auth):

- `Acme Studios` / `Pixel Forge` — businesses
- `Ada Lin` / `Lin Park` — users

## End-to-end walkthrough

1. As **Ada Lin** (default), browse the marketplace at `/`. Filter by status, category, or search query — URL params drive Prisma filters, so links are shareable.
2. Click into a task. Hit **Accept this task**.
3. The page re-renders with the submission form. Paste a URL + optional notes. Submit.
4. Use the switcher → **Pixel Forge**. Go to `/business`. The task you just submitted is in "Awaiting review".
5. Open it. Click **Approve & pay**. A `Payment` row is created in the same transaction that flips the acceptance status.
6. Switch back to **Ada Lin** → `/me`. The new payment appears under Earnings; the total ticks up.

## API

All mutations accept an `Idempotency-Key` header. Same key + same body → replays the stored response (with `idempotent-replay: true` header). Same key + different body → 422 `idempotency_key_mismatch`.

Money is serialized as decimal-string cents (e.g. `"22500"` = $225.00) so BigInt survives JSON.

```bash
# List tasks (filterable)
curl 'http://localhost:3000/api/tasks?status=open&category=design'

# Accept a task (idempotent)
curl -X POST -H "Cookie: actorId=usr_ada" -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" \
  http://localhost:3000/api/tasks/task_logo_iter/accept

# Submit work (idempotent)
curl -X POST -H "Cookie: actorId=usr_ada" -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d '{"acceptanceId":"<id>","submissionUrl":"https://example.com/work","notes":"done"}' \
  http://localhost:3000/api/tasks/<task_id>/submit

# Review (idempotent — creates Payment on approve, the most critical write)
curl -X POST -H "Cookie: actorId=biz_pixel" -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d '{"decision":"approve","reviewerNotes":"great"}' \
  http://localhost:3000/api/business/tasks/<task_id>/submissions/<sub_id>/review

# Payments for the current actor
curl -H "Cookie: actorId=usr_ada" http://localhost:3000/api/payments
```

## Commands

| Command | What |
| --- | --- |
| `pnpm dev` | Dev server (Turbopack) |
| `pnpm build` | `prisma generate && next build` |
| `pnpm lint` / `pnpm typecheck` / `pnpm format` | Quality gates |
| `pnpm test` | Vitest (16 unit tests covering money, manual validator, review service) |
| `pnpm db:push` | Sync schema → DB without migration files |
| `pnpm db:migrate` | Create a migration file |
| `pnpm db:seed` | Reseed deterministic fixtures (idempotent — re-runnable) |
| `pnpm db:push --force-reset && pnpm db:seed` | Nuke and reseed |

## Deploy to Vercel

1. Create a Neon project. Copy the **pooled** connection string into Vercel env `DATABASE_URL` and the **direct** connection string into `DIRECT_URL` (all environments).
2. `vercel --prod` — `postinstall: prisma generate` runs automatically.
3. Provision the live schema once from local: `DATABASE_URL=<direct> pnpm prisma db push && pnpm db:seed`.

`prisma.config.ts` loads `.env.local` first then `.env`, and only sets `datasource.url` when one is present, so `prisma generate` succeeds in CI before secrets are wired.

## What v1 deliberately doesn't do

NextAuth/Clerk/sessions · Stripe/payouts/webhooks · file uploads (submission is a URL string) · notifications/email/realtime · admin role · LLM validator (only the seam exists — see `src/server/validators/`) · React Query/SWR · editing or deleting tasks · trigram indexes · E2E/component tests · nightly idempotency-key cleanup.
