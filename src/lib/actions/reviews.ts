"use server";

import { revalidatePath } from "next/cache";
import { requireActor } from "@/server/actor";
import { reviewSubmissionSchema } from "@/lib/schemas";
import { reviewSubmission } from "@/server/services/reviews";

export async function reviewSubmissionAction(formData: FormData) {
  const actor = await requireActor("business");
  const parsed = reviewSubmissionSchema.safeParse({
    submissionId: formData.get("submissionId"),
    decision: formData.get("decision"),
    reviewerNotes: formData.get("reviewerNotes") || undefined,
  });
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const taskId = (formData.get("taskId") as string | null) ?? "";
  await reviewSubmission(parsed.data, actor);
  if (taskId) revalidatePath(`/business/tasks/${taskId}`);
  revalidatePath("/business");
  revalidatePath("/me");
  return { ok: true as const };
}
