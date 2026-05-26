import "server-only";
import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { serializeJSON } from "@/lib/money";

const HEADER = "idempotency-key";

export interface IdempotencyContext {
  scope: string;
  actorId: string;
  request: Request;
}

export async function withIdempotency(
  ctx: IdempotencyContext,
  handler: () => Promise<{ status: number; body: unknown }>,
): Promise<Response> {
  const key = ctx.request.headers.get(HEADER);
  if (!key) {
    const result = await handler();
    return jsonResponse(result.status, result.body);
  }

  const bodyText = await readBody(ctx.request);
  const requestHash = sha256(bodyText);

  const existing = await db.idempotencyKey.findUnique({
    where: {
      key_actorId_scope: { key, actorId: ctx.actorId, scope: ctx.scope },
    },
  });
  if (existing) {
    if (existing.requestHash !== requestHash) {
      return jsonResponse(422, {
        error: "idempotency_key_mismatch",
        message:
          "An Idempotency-Key was reused with a different request body. Use a fresh key or send the original body.",
      });
    }
    return new Response(JSON.stringify(existing.responseJson), {
      status: existing.statusCode,
      headers: { "content-type": "application/json", "idempotent-replay": "true" },
    });
  }

  const result = await handler();
  try {
    await db.idempotencyKey.create({
      data: {
        key,
        actorId: ctx.actorId,
        scope: ctx.scope,
        requestHash,
        responseJson: result.body as Prisma.InputJsonValue,
        statusCode: result.status,
      },
    });
  } catch (err) {
    // Race: another request stored first. Re-read and replay.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const stored = await db.idempotencyKey.findUnique({
        where: {
          key_actorId_scope: { key, actorId: ctx.actorId, scope: ctx.scope },
        },
      });
      if (stored) {
        return new Response(JSON.stringify(stored.responseJson), {
          status: stored.statusCode,
          headers: { "content-type": "application/json", "idempotent-replay": "true" },
        });
      }
    }
    throw err;
  }
  return jsonResponse(result.status, result.body);
}

export function jsonResponse(status: number, body: unknown): Response {
  return new Response(serializeJSON(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function readBody(req: Request): Promise<string> {
  if (req.method === "GET" || req.method === "HEAD") return "";
  try {
    return await req.clone().text();
  } catch {
    return "";
  }
}

function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}
