"use server";

import { revalidatePath } from "next/cache";
import { requireActor } from "@/server/actor";
import { submitWorkSchema } from "@/lib/schemas";
import { submitWork } from "@/server/services/submissions";

export async function submitWorkAction(formData: FormData) {
  const actor = await requireActor("user");
  const parsed = submitWorkSchema.safeParse({
    acceptanceId: formData.get("acceptanceId"),
    submissionUrl: formData.get("submissionUrl"),
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  await submitWork(parsed.data, actor);
  revalidatePath("/me");
  revalidatePath("/");
  return { ok: true as const };
}
