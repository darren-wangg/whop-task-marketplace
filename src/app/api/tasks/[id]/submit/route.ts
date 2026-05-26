import type { NextRequest } from "next/server";
import { withIdempotency } from "@/server/idempotency";
import { errorBody, requireActorOrError } from "@/server/api-helpers";
import { submitWorkSchema } from "@/lib/schemas";
import { submitWork } from "@/server/services/submissions";

export async function POST(req: NextRequest) {
  const actor = await requireActorOrError("user");
  if (actor instanceof Response) return actor;
  return withIdempotency(
    { scope: "submissions.submit", actorId: actor.id, request: req },
    async () => {
      const body = await req.json().catch(() => null);
      const parsed = submitWorkSchema.safeParse(body);
      if (!parsed.success) {
        return { status: 400, body: { error: "bad_request", issues: parsed.error.issues } };
      }
      try {
        const submission = await submitWork(parsed.data, actor);
        return { status: 201, body: { submission } };
      } catch (err) {
        return errorBody(err);
      }
    },
  );
}
