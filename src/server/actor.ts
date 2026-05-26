import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Account, AccountKind } from "@prisma/client";
import { db } from "@/server/db";

export const ACTOR_COOKIE = "actorId";

export async function getCurrentActor(): Promise<Account> {
  const store = await cookies();
  const id = store.get(ACTOR_COOKIE)?.value;
  if (id) {
    const account = await db.account.findUnique({ where: { id } });
    if (account) return account;
  }
  return await db.account.findFirstOrThrow({
    where: { kind: "user" },
    orderBy: { createdAt: "asc" },
  });
}

export async function requireActor(kind?: AccountKind): Promise<Account> {
  const actor = await getCurrentActor();
  if (kind && actor.kind !== kind) {
    throw new ActorKindError(kind, actor.kind);
  }
  return actor;
}

/**
 * Same intent as `requireActor`, but for page rendering: when the wrong kind is
 * active (e.g. business viewing /me), redirect home instead of throwing. Server
 * Actions and route handlers still use `requireActor` so they can return a 403.
 */
export async function requirePageActor(kind: AccountKind): Promise<Account> {
  const actor = await getCurrentActor();
  if (actor.kind !== kind) redirect("/");
  return actor;
}

export async function listSwitchableAccounts(): Promise<Account[]> {
  return await db.account.findMany({
    orderBy: [{ kind: "asc" }, { name: "asc" }],
  });
}

export class ActorKindError extends Error {
  readonly status = 403 as const;
  constructor(
    readonly expected: AccountKind,
    readonly actual: AccountKind,
  ) {
    super(`Expected actor kind "${expected}" but actor is "${actual}".`);
    this.name = "ActorKindError";
  }
}
