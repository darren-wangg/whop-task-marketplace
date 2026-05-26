import "server-only";
import type { Account, Submission } from "@prisma/client";
import { db } from "@/server/db";
import { conflict, forbidden, notFound } from "@/server/errors";
import type { SubmitWorkInput } from "@/lib/schemas";

export async function submitWork(input: SubmitWorkInput, actor: Account): Promise<Submission> {
  const acceptance = await db.taskAcceptance.findUnique({
    where: { id: input.acceptanceId },
    include: { submission: true },
  });
  if (!acceptance) throw notFound("Acceptance");
  if (acceptance.userId !== actor.id) throw forbidden("Not your acceptance.");
  if (acceptance.submission) throw conflict("Work already submitted.");
  if (acceptance.status !== "accepted") {
    throw conflict(`Cannot submit when status is ${acceptance.status}.`);
  }
  return db.$transaction(async (tx) => {
    const submission = await tx.submission.create({
      data: {
        acceptanceId: acceptance.id,
        submissionUrl: input.submissionUrl,
        notes: input.notes ?? null,
      },
    });
    await tx.taskAcceptance.update({
      where: { id: acceptance.id },
      data: { status: "submitted" },
    });
    return submission;
  });
}
