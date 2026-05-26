# Architecture

Fundamentals of how Whop Tasks fits together. Read this once; the rest of the codebase will make sense. For invariants, see [`CLAUDE.md`](../CLAUDE.md). For the phased build log, see [`PLAN.md`](./PLAN.md).

---

## The big picture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              Browser                                          │
│  Pages (Server Components) + Client Components (forms, toggles, filters)      │
└─────────────┬──────────────────────────────────────────┬─────────────────────┘
              │                                          │
       Server Action call                          fetch /api/*
       (in-app forms)                              (external clients)
              │                                          │
              ▼                                          ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                              Next.js server                                   │
│                                                                               │
│  src/lib/actions/*        src/app/api/**                                     │
│  (Server Actions)         (Route handlers)                                   │
│        │                        │                                            │
│        │                        ├── withIdempotency()  ← stores + replays    │
│        │                        │                        responses           │
│        └──────────┬─────────────┘                                            │
│                   ▼                                                           │
│        src/server/services/*  ← only place that touches the DB              │
│           tasks  submissions  reviews  payments                              │
│                   │                                                           │
│                   ├── getValidator().run(...)  ← strategy seam              │
│                   │     (ManualValidator today;                              │
│                   │      LLMValidator one swap away)                         │
│                   │                                                           │
│                   └── db.$transaction(...)                                   │
│                              │                                                │
└──────────────────────────────┼───────────────────────────────────────────────┘
                               ▼
                       ┌─────────────────┐
                       │  Neon Postgres  │
                       │  (via @prisma/  │
                       │   adapter-pg)   │
                       └─────────────────┘
```

**The rule that holds the whole thing together**: business logic lives in **one place per operation** — a service function. Both the Server Action and the API route are ~10-line adapters that call that service. Adding a new mutation means: schema → service → action → route. Five steps, predictable.

---

## Data model (5 tables + idempotency log)

```
Account ─┐ (kind: business | user)
         │
         ├──< Task ──< TaskAcceptance ──< Submission ──< Payment
         │             (status flows:    (1:1 with         (1:1 with
         │              accepted →        acceptance)       submission)
         │              submitted →
         │              approved/rejected)
         │
         └──< Payment.userId / Payment.businessId

IdempotencyKey  (key + actorId + scope) → (requestHash, responseJson, statusCode)
```

- `Account.kind` discriminates business vs user (no separate tables — add a `BusinessProfile` 1:1 when per-kind columns appear).
- Money lives in `BigInt` columns (`rewardCents`, `amountCents`). Postgres `BIGINT` → Prisma `bigint` in TS → decimal string at the API boundary (`"22500"` = $225.00).
- `@@unique([taskId, userId])` on `TaskAcceptance` enforces "a user can't accept the same task twice".
- `@@unique` on `Submission.acceptanceId` and `Payment.submissionId` enforces "one submission per acceptance, one payment per approved submission" — the DB is the last line of defense against double-firing.

---

## The happy path (accept → submit → approve → pay)

```
1. usr_ada clicks "Accept"
   ↓ Server Action: acceptTaskAction(taskId)
   ↓ services/tasks.acceptTask(taskId, actor)
       INSERT TaskAcceptance(taskId, userId)  ──→  unique constraint catches dupes
   ↓ revalidatePath('/tasks/[id]')

2. usr_ada submits a URL
   ↓ Server Action: submitWorkAction(formData)
   ↓ services/submissions.submitWork(input, actor)
   ↓ db.$transaction:
       INSERT Submission(acceptanceId, url, notes)
       UPDATE TaskAcceptance.status = submitted

3. biz_pixel clicks "Approve & pay"
   ↓ Server Action: reviewSubmissionAction(formData)
   ↓ services/reviews.reviewSubmission(input, actor)
   ↓ getValidator().run({ task, submission, reviewer, reviewerDecision })
       ManualValidator: enforces reviewer.kind === 'business'
                              && reviewer.id === task.businessId
       returns { verdict: 'approve' }
   ↓ db.$transaction (THE critical write):
       UPDATE Submission.reviewedAt, reviewerNotes
       UPDATE TaskAcceptance.status = approved
       INSERT Payment(submissionId, userId, businessId, amountCents)
                       └── Submission.@unique stops a second insert

4. usr_ada loads /me
   ↓ services/payments.listPaymentsForUser(actor)
   ↓ SELECT Payment WHERE userId = actor.id
       totalCents = Σ amountCents
```

Everything below the dotted line is identical when called via `POST /api/business/tasks/.../review` — the route handler just wraps step 3 in `withIdempotency()` and serializes the result as JSON.

---

## The validator seam (designed to swap)

```
services/reviews.ts                              validators/index.ts
  ┌─────────────────────────────┐                ┌──────────────────────┐
  │  const v = getValidator();  │ ─────────────▶ │  return new          │
  │  const r = await v.run({…});│                │    ManualValidator() │  ← TODAY
  │  if (r.verdict === 'approve') { tx... }     │  return new          │
  └─────────────────────────────┘                │    LLMValidator()    │  ← LATER
                                                  └──────────────────────┘
```

The whole point: **`services/reviews.ts` never branches on validator type.** Adding an LLM validator is one new file (`validators/llm.ts`) + one line change in `validators/index.ts`. Zero changes to services, routes, actions, or UI.

The `Validator` interface (`src/server/validators/types.ts`):

```ts
interface Validator {
  id: string;
  run(input: ValidatorInput): Promise<ValidatorResult>;
}

// ValidatorInput  = { task, submission, reviewer?, reviewerDecision?, reviewerNotes? }
// ValidatorResult = { verdict: 'approve' | 'reject' | 'needs_review', notes?, meta? }
```

`needs_review` exists in the type so an LLM validator can punt back to a human without forcing a verdict.

---

## Identity (cookie, not auth)

```
RoleSwitcher (header dropdown)
       │ onChange
       ▼
setActor(id) Server Action  ─── writes cookie 'actorId' ──→  revalidatePath('/', 'layout')
                                                                   │
                                                                   ▼
                                                       Tree re-renders.
                                                       getCurrentActor() reads cookie.
```

`src/server/actor.ts` exposes:

- `getCurrentActor(): Promise<Account>` — reads the cookie, falls back to the first seeded user.
- `requireActor(kind?)` — throws `ActorKindError` (403) if the wrong kind.

Every service takes `actor: Account` as a typed argument. Routes/actions call `requireActorOrError(kind)` first. **This is not auth.** It's a demo identity selector.

---

## Idempotency (the safety belt on writes)

```
POST /api/tasks/.../accept
  Header: Idempotency-Key: <uuid>
  Body:   {}
       │
       ▼
withIdempotency({ scope: 'tasks.accept', actorId, request }, handler)
       │
       ▼
SELECT IdempotencyKey WHERE (key, actorId, scope)
       │
       ├── hit, same requestHash  ──→  replay stored response  (header: idempotent-replay: true)
       ├── hit, different hash    ──→  422 idempotency_key_mismatch
       └── miss                    ──→  run handler()
                                          ├── service call returns { status, body }
                                          └── INSERT IdempotencyKey(..., responseJson, statusCode)
                                                │   └── on @@id collision (race): re-SELECT + replay
                                                ▼
                                          return jsonResponse(status, body)
```

Wrapped routes (everything that writes):

- `POST /api/tasks` — create task
- `POST /api/tasks/[id]/accept`
- `POST /api/tasks/[id]/submit`
- `POST /api/business/tasks/[id]/submissions/[sid]/review` — **most critical**: creates `Payment`

`Payment.submissionId @unique` is the DB-level backstop if idempotency is somehow bypassed.

---

## Money (BigInt, end to end)

```
form input         "12.50"                 (string)
       ↓ Zod
service input      toCents("12.50")  =  1250n   (bigint)
       ↓
Prisma column      rewardCents BigInt        (Postgres BIGINT)
       ↓ read back
JSON serialization "1250"                    (string via bigIntReplacer)
       ↓
display            formatCents(1250n)  =  "$12.50"
```

JS BigInt doesn't `JSON.stringify` natively, so the API uses `serializeJSON()` (which installs `bigIntReplacer`). Clients receive decimal-string cents; the route layer is the only place that needs to know about this.

---

## Theme (cookie + frosted-ui)

```
themeAppearance cookie  ─┐
themeAccent cookie       ├─► getThemePrefs() (server)  ─►  ThemeProvider (client)
                         │                                     │
                         │                                     ▼
                         │                               frosted-ui <Theme appearance accentColor>
                         │                                     │
                         │                                     ▼
                         │                          adds 'light'/'dark' class + color-scheme
                         │                          to <html> at hydration time
                         │
                ←── setAppearance() / setAccent() Server Actions write cookies → revalidatePath
```

To prevent flash-of-wrong-theme on first paint, `layout.tsx` pre-renders the `light`/`dark` class and `color-scheme` style itself on the server. `<body suppressHydrationWarning>` silences harmless attribute mismatches from browser extensions (Grammarly, password managers).

---

## Request types

Two parallel surfaces, one source of truth:

|                   | Server Action                 | Route handler                  |
| ----------------- | ----------------------------- | ------------------------------ |
| **Trigger**       | `<form action={…}>`           | `fetch('/api/…')`              |
| **Input parsing** | FormData → Zod                | JSON → Zod                     |
| **Auth check**    | `requireActor(kind)`          | `requireActorOrError(kind)`    |
| **Service call**  | same                          | same                           |
| **After success** | `revalidatePath()` + redirect | `jsonResponse(status, body)`   |
| **Idempotency**   | (not needed — forms)          | `withIdempotency(...)`         |
| **Used by**       | Whop Tasks UI                 | external clients per the brief |

If you need to add a third caller (Slack bot, cron job, mobile app), reach for the API route. Don't add a new service path.

---

## Tests (16, focused on the logic core)

| File                              | What it proves                                                                                                       |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `tests/money.test.ts`             | `toCents` parses + rejects malformed input; `formatCents` rounds correctly; BigInt JSON roundtrips                   |
| `tests/validators/manual.test.ts` | `ManualValidator` returns the reviewer's decision; rejects wrong-kind reviewer, non-owner business, missing decision |
| `tests/services/reviews.test.ts`  | Approve creates a `Payment` and flips status in one transaction; reject does neither; double-review throws           |

No UI tests, no E2E, no idempotency unit test — the curl walkthrough in [`README.md`](../README.md) covers that surface.

---

## What would change first as v1 grows

- **Real auth** — replace the cookie + `getCurrentActor()` with a session lookup. Service signatures already take `actor: Account`, so the swap is hidden inside `getCurrentActor()`.
- **Stripe payouts** — `Payment` is currently a row insertion. Add a `paymentIntentId` column; have `services/reviews.ts` enqueue a Stripe transfer in the same transaction (use a write-ahead log if the transfer must survive partial failures).
- **LLM-based validation** — implement `LLMValidator` in `src/server/validators/llm.ts`; flip `getValidator()`. No other code moves.
- **Heavier search** — current `ILIKE %q%` works for thousands of tasks. Add a Postgres GIN trigram index when latency hurts.
