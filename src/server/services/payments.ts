import "server-only";
import type { Account, Payment } from "@prisma/client";
import { db } from "@/server/db";

export interface PaymentWithContext {
  payment: Payment;
  taskTitle: string;
  businessName: string;
}

export async function listPaymentsForUser(actor: Account): Promise<{
  payments: PaymentWithContext[];
  totalCents: bigint;
}> {
  const rows = await db.payment.findMany({
    where: { userId: actor.id },
    orderBy: { paidAt: "desc" },
    include: {
      submission: { include: { acceptance: { include: { task: true } } } },
      business: true,
    },
  });
  const payments = rows.map((r) => ({
    payment: {
      id: r.id,
      submissionId: r.submissionId,
      userId: r.userId,
      businessId: r.businessId,
      amountCents: r.amountCents,
      paidAt: r.paidAt,
    },
    taskTitle: r.submission.acceptance.task.title,
    businessName: r.business.name,
  }));
  const totalCents = rows.reduce((sum, r) => sum + r.amountCents, 0n);
  return { payments, totalCents };
}

export interface UserAcceptanceRow {
  acceptanceId: string;
  taskId: string;
  taskTitle: string;
  businessName: string;
  status: "accepted" | "submitted" | "approved" | "rejected";
  rewardCents: bigint;
  acceptedAt: Date;
  submissionUrl: string | null;
}

export async function listAcceptancesForUser(actor: Account): Promise<UserAcceptanceRow[]> {
  const rows = await db.taskAcceptance.findMany({
    where: { userId: actor.id },
    orderBy: { acceptedAt: "desc" },
    include: {
      task: { include: { business: { select: { name: true } } } },
      submission: true,
    },
  });
  return rows.map((r) => ({
    acceptanceId: r.id,
    taskId: r.taskId,
    taskTitle: r.task.title,
    businessName: r.task.business.name,
    status: r.status,
    rewardCents: r.task.rewardCents,
    acceptedAt: r.acceptedAt,
    submissionUrl: r.submission?.submissionUrl ?? null,
  }));
}
