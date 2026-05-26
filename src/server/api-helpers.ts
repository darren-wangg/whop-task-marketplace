import "server-only";
import type { AccountKind } from "@prisma/client";
import { getCurrentActor, requireActor } from "@/server/actor";
import { ServiceError } from "@/server/errors";
import { jsonResponse } from "@/server/idempotency";

export async function requireActorOrError(kind: AccountKind) {
  try {
    return await requireActor(kind);
  } catch {
    const actor = await getCurrentActor().catch(() => null);
    return jsonResponse(403, {
      error: "forbidden",
      message: `Requires actor kind "${kind}". Current actor: ${actor?.kind ?? "none"}.`,
    });
  }
}

export function errorBody(err: unknown): { status: number; body: unknown } {
  if (err instanceof ServiceError) {
    return { status: err.status, body: { error: err.code, message: err.message } };
  }
  if (err instanceof Error) {
    return { status: 500, body: { error: "internal", message: err.message } };
  }
  return { status: 500, body: { error: "internal" } };
}
