import type { NextRequest } from "next/server";
import { jsonResponse, withIdempotency } from "@/server/idempotency";
import { errorBody, requireActorOrError } from "@/server/api-helpers";
import { createTaskSchema, listTasksFiltersSchema } from "@/lib/schemas";
import { createTask, listTasks } from "@/server/services/tasks";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const parsed = listTasksFiltersSchema.safeParse({
    q: url.searchParams.get("q") ?? undefined,
    status: url.searchParams.get("status") ?? "open",
    category: url.searchParams.get("category") ?? undefined,
    minRewardCents: url.searchParams.get("minRewardCents") ?? undefined,
    maxRewardCents: url.searchParams.get("maxRewardCents") ?? undefined,
    cursor: url.searchParams.get("cursor") ?? undefined,
  });
  if (!parsed.success) {
    return jsonResponse(400, { error: "bad_request", issues: parsed.error.issues });
  }
  const result = await listTasks(parsed.data);
  return jsonResponse(200, result);
}

export async function POST(req: NextRequest) {
  const actor = await requireActorOrError("business");
  if (actor instanceof Response) return actor;
  return withIdempotency({ scope: "tasks.create", actorId: actor.id, request: req }, async () => {
    const body = await req.json().catch(() => null);
    const parsed = createTaskSchema.safeParse(body);
    if (!parsed.success) {
      return { status: 400, body: { error: "bad_request", issues: parsed.error.issues } };
    }
    try {
      const task = await createTask(parsed.data, actor);
      return { status: 201, body: { task } };
    } catch (err) {
      return errorBody(err);
    }
  });
}
