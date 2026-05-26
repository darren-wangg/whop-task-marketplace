import { getCurrentActor } from "@/server/actor";
import { jsonResponse } from "@/server/idempotency";
import { listPaymentsForUser } from "@/server/services/payments";

export async function GET() {
  const actor = await getCurrentActor();
  const result = await listPaymentsForUser(actor);
  return jsonResponse(200, {
    payments: result.payments.map((p) => ({
      id: p.payment.id,
      submissionId: p.payment.submissionId,
      amountCents: p.payment.amountCents,
      paidAt: p.payment.paidAt,
      taskTitle: p.taskTitle,
      businessName: p.businessName,
    })),
    totalCents: result.totalCents,
  });
}
