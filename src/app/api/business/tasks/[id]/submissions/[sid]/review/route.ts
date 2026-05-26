import type { NextRequest } from "next/server";
import { withIdempotency } from "@/server/idempotency";
import { errorBody, requireActorOrError } from "@/server/api-helpers";
import { reviewSubmissionSchema } from "@/lib/schemas";
import { reviewSubmission } from "@/server/services/reviews";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; sid: string }> },
) {
  const { sid } = await ctx.params;
  const actor = await requireActorOrError("business");
  if (actor instanceof Response) return actor;
  return withIdempotency({ scope: "reviews.create", actorId: actor.id, request: req }, async () => {
    const body = await req.json().catch(() => null);
    const parsed = reviewSubmissionSchema.safeParse({ ...body, submissionId: sid });
    if (!parsed.success) {
      return { status: 400, body: { error: "bad_request", issues: parsed.error.issues } };
    }
    try {
      const result = await reviewSubmission(parsed.data, actor);
      return { status: 200, body: result };
    } catch (err) {
      return errorBody(err);
    }
  });
}
