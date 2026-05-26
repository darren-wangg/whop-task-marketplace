import type { NextRequest } from "next/server";
import { withIdempotency } from "@/server/idempotency";
import { errorBody, requireActorOrError } from "@/server/api-helpers";
import { acceptTask } from "@/server/services/tasks";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const actor = await requireActorOrError("user");
  if (actor instanceof Response) return actor;
  return withIdempotency({ scope: "tasks.accept", actorId: actor.id, request: req }, async () => {
    try {
      const acceptance = await acceptTask(id, actor);
      return { status: 200, body: { acceptance } };
    } catch (err) {
      return errorBody(err);
    }
  });
}
