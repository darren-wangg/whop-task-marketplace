# Whop Tasks

A task-based marketplace inspired by Whop. Businesses post paid tasks; users accept, submit work, and get paid once a business approves. v1 — no real auth, no Stripe; payments are DB-ledger rows.

## Quickstart

```bash
pnpm install
cp .env.example .env.local           # fill in Neon DATABASE_URL + DIRECT_URL
pnpm db:push                          # provision schema
pnpm db:seed                          # seed 4 accounts, 10 tasks, sample acceptances
pnpm dev                              # http://localhost:3000
```

Use the role switcher in the header (top right) to swap between seeded accounts:

- `Acme Studios` / `Pixel Forge` — businesses
- `Ada Lin` / `Lin Park` — users

## End-to-end walkthrough

1. As **Ada Lin** (default), browse the marketplace, click a task, **Accept**.
2. Submit a URL + notes via the form that appears.
3. Switch to the task's owner business (e.g. **Pixel Forge**), open `/business/tasks/<id>`, **Approve & pay**.
4. Switch back to **Ada Lin**; `/me` shows the new payment under Earnings.

## API

All mutations accept an `Idempotency-Key` header; same key + same body replays the original response.

```bash
# List tasks
curl http://localhost:3000/api/tasks

# Accept a task (idempotent)
curl -X POST -H "Cookie: actorId=usr_ada" -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" \
  http://localhost:3000/api/tasks/task_logo_iter/accept

# Submit work
curl -X POST -H "Cookie: actorId=usr_ada" -H "Content-Type: application/json" \
  -d '{"acceptanceId":"<id>","submissionUrl":"https://example.com/work","notes":"done"}' \
  http://localhost:3000/api/tasks/<task_id>/submit

# Review (creates Payment row on approve — most critical idempotency target)
curl -X POST -H "Cookie: actorId=biz_pixel" -H "Content-Type: application/json" \
  -d '{"decision":"approve","reviewerNotes":"great"}' \
  http://localhost:3000/api/business/tasks/<task_id>/submissions/<sub_id>/review

# Payments for the current actor
curl -H "Cookie: actorId=usr_ada" http://localhost:3000/api/payments
```

## Commands

| | |
| --- | --- |
| `pnpm dev` | Dev server (Turbopack) |
| `pnpm build` | `prisma generate && next build` |
| `pnpm lint` / `pnpm typecheck` / `pnpm format` | Quality gates |
| `pnpm test` | Vitest (16 unit tests covering money, validator, review service) |
| `pnpm db:push` | Sync schema → DB without migration files |
| `pnpm db:migrate` | Create a migration file |
| `pnpm db:seed` | Reseed deterministic fixtures |

## Deploy to Vercel

1. Create a Neon project; copy the **pooled** URL into Vercel env `DATABASE_URL` and the **direct** URL into `DIRECT_URL` (all environments).
2. `vercel --prod` — `postinstall: prisma generate` runs automatically.
3. Provision the live schema once: `DATABASE_URL=<direct> pnpm prisma db push && pnpm db:seed`.

See [`CLAUDE.md`](./CLAUDE.md) for architecture invariants, the validator-swap recipe, and the "add a new mutation" walkthrough; [`context/PLAN.md`](./context/PLAN.md) for the phased delivery log.
