import Link from "next/link";
import { Badge, Card, Heading, Separator, Text } from "frosted-ui";
import { requirePageActor } from "@/server/actor";
import { listAcceptancesForUser, listPaymentsForUser } from "@/server/services/payments";
import { formatCents } from "@/lib/money";
import { FadeIn } from "@/components/motion/FadeIn";

export default async function MePage() {
  const actor = await requirePageActor("user");
  const [{ payments, totalCents }, acceptances] = await Promise.all([
    listPaymentsForUser(actor),
    listAcceptancesForUser(actor),
  ]);

  const active = acceptances.filter((a) => a.status === "accepted" || a.status === "submitted");
  const past = acceptances.filter((a) => a.status === "approved" || a.status === "rejected");

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <FadeIn>
        <Heading size="7" weight="bold">
          {actor.name}
        </Heading>
        <Text size="2" color="gray" render={<p className="mt-1" />}>
          Total earned: <strong>{formatCents(totalCents)}</strong> across {payments.length} payment
          {payments.length === 1 ? "" : "s"}.
        </Text>
      </FadeIn>

      <Section title={`Active (${active.length})`}>
        {active.length === 0 ? (
          <Empty
            text={
              <>
                Nothing in flight.{" "}
                <Link href="/" className="underline">
                  Browse tasks
                </Link>
                .
              </>
            }
          />
        ) : (
          active.map((a, i) => (
            <FadeIn key={a.acceptanceId} delay={Math.min(i * 0.03, 0.15)}>
              <Link href={`/tasks/${a.taskId}`} className="block no-underline">
                <Card size="2" className="transition-transform hover:-translate-y-0.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <Text size="2" weight="medium" render={<div />}>
                        {a.taskTitle}
                      </Text>
                      <Text size="1" color="gray">
                        {a.businessName} • {formatCents(a.rewardCents)}
                      </Text>
                    </div>
                    <Badge
                      color={a.status === "submitted" ? "amber" : "blue"}
                      variant="soft"
                      size="1"
                    >
                      {a.status === "submitted" ? "Awaiting review" : "In progress"}
                    </Badge>
                  </div>
                </Card>
              </Link>
            </FadeIn>
          ))
        )}
      </Section>

      <Section title="Earnings">
        {payments.length === 0 ? (
          <Empty text="No payments yet — submit and get approved on a task to earn." />
        ) : (
          <Card size="3">
            <div className="flex flex-col gap-2">
              {payments.map((p, i) => (
                <div key={p.payment.id}>
                  {i > 0 && <Separator size="4" className="my-1" />}
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <Text size="2" weight="medium" render={<div />}>
                        {p.taskTitle}
                      </Text>
                      <Text size="1" color="gray">
                        {p.businessName} • {new Date(p.payment.paidAt).toLocaleDateString()}
                      </Text>
                    </div>
                    <Text size="2" weight="semi-bold" color="green">
                      +{formatCents(p.payment.amountCents)}
                    </Text>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </Section>

      <Section title={`Past (${past.length})`}>
        {past.length === 0 ? (
          <Empty text="Nothing settled yet." />
        ) : (
          past.map((a) => (
            <Card key={a.acceptanceId} size="2">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <Text size="2" weight="medium" render={<div />}>
                    {a.taskTitle}
                  </Text>
                  <Text size="1" color="gray">
                    {a.businessName} • {formatCents(a.rewardCents)}
                  </Text>
                </div>
                <Badge color={a.status === "approved" ? "green" : "tomato"} variant="soft" size="1">
                  {a.status}
                </Badge>
              </div>
            </Card>
          ))
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-8">
      <Heading size="4" weight="medium" className="mb-3">
        {title}
      </Heading>
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  );
}

function Empty({ text }: { text: React.ReactNode }) {
  return (
    <div className="rounded-md border border-dashed border-[var(--gray-a4)] px-4 py-6 text-center">
      <Text size="2" color="gray">
        {text}
      </Text>
    </div>
  );
}
