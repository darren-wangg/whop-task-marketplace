"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireActor } from "@/server/actor";
import { createTaskSchema } from "@/lib/schemas";
import { acceptTask, createTask } from "@/server/services/tasks";

export async function createTaskAction(formData: FormData) {
  const actor = await requireActor("business");
  const parsed = createTaskSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    submissionCriteria: formData.get("submissionCriteria"),
    rewardDollars: formData.get("rewardDollars"),
    category: formData.get("category") || undefined,
    deadlineISO: formData.get("deadlineISO") || undefined,
  });
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const task = await createTask(parsed.data, actor);
  revalidatePath("/business");
  revalidatePath("/");
  redirect(`/business/tasks/${task.id}`);
}

export async function acceptTaskAction(taskId: string) {
  const actor = await requireActor("user");
  await acceptTask(taskId, actor);
  revalidatePath(`/tasks/${taskId}`);
  revalidatePath("/me");
  revalidatePath("/");
}
