import "server-only";
import type { Account, Payment } from "@prisma/client";
import { db } from "@/server/db";
import { conflict, notFound } from "@/server/errors";
import { getValidator } from "@/server/validators";
import type { ReviewSubmissionInput } from "@/lib/schemas";

export interface ReviewResult {
  verdict: "approve" | "reject" | "needs_review";
  acceptanceStatus: "approved" | "rejected" | "submitted";
  payment: Payment | null;
}

export async function reviewSubmission(
  input: ReviewSubmissionInput,
  actor: Account,
): Promise<ReviewResult> {
  const submission = await db.submission.findUnique({
    where: { id: input.submissionId },
    include: { acceptance: { include: { task: true } } },
  });
  if (!submission) throw notFound("Submission");
  if (submission.reviewedAt) throw conflict("Submission already reviewed.");

  const validator = getValidator();
  const result = await validator.run({
    task: submission.acceptance.task,
    submission,
    reviewer: actor,
    reviewerDecision: input.decision,
    reviewerNotes: input.reviewerNotes,
  });

  if (result.verdict === "needs_review") {
    return { verdict: result.verdict, acceptanceStatus: "submitted", payment: null };
  }

  return db.$transaction(async (tx) => {
    const reviewedAt = new Date();
    await tx.submission.update({
      where: { id: submission.id },
      data: { reviewedAt, reviewerNotes: result.notes ?? input.reviewerNotes ?? null },
    });
    if (result.verdict === "approve") {
      await tx.taskAcceptance.update({
        where: { id: submission.acceptanceId },
        data: { status: "approved" },
      });
      const payment = await tx.payment.create({
        data: {
          submissionId: submission.id,
          userId: submission.acceptance.userId,
          businessId: submission.acceptance.task.businessId,
          amountCents: submission.acceptance.task.rewardCents,
        },
      });
      return {
        verdict: "approve" as const,
        acceptanceStatus: "approved" as const,
        payment,
      };
    }
    await tx.taskAcceptance.update({
      where: { id: submission.acceptanceId },
      data: { status: "rejected" },
    });
    return {
      verdict: "reject" as const,
      acceptanceStatus: "rejected" as const,
      payment: null,
    };
  });
}
