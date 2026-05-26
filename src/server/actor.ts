import "server-only";
import { cookies } from "next/headers";
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
