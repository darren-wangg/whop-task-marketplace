import Link from "next/link";
import { Badge, Button, Card, Heading, Text } from "frosted-ui";
import { requirePageActor } from "@/server/actor";
import { listBusinessTasks } from "@/server/services/tasks";
import { formatCents } from "@/lib/money";
import { FadeIn } from "@/components/motion/FadeIn";

export default async function BusinessDashboardPage() {
  const actor = await requirePageActor("business");
  const tasks = await listBusinessTasks(actor);

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <FadeIn>
        <div className="mb-6 flex items-end justify-between">
          <div>
            <Heading size="7" weight="bold">
              Your tasks
            </Heading>
            <Text size="2" color="gray" render={<p className="mt-1" />}>
              {actor.name} — {tasks.length} task{tasks.length === 1 ? "" : "s"}
            </Text>
          </div>
          <Link href="/business/tasks/new">
            <Button size="2" color="orange">
              Post a new task
            </Button>
          </Link>
        </div>
      </FadeIn>

      {tasks.length === 0 ? (
        <Card size="3">
          <Text size="2" color="gray">
            You haven&apos;t posted any tasks yet. Create one to get started.
          </Text>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {tasks.map((t, i) => {
            const counts = {
              accepted: 0,
              submitted: 0,
              approved: 0,
              rejected: 0,
            };
            for (const a of t.acceptances) counts[a.status] += 1;
            return (
              <FadeIn key={t.id} delay={Math.min(i * 0.03, 0.15)}>
                <Link href={`/business/tasks/${t.id}`} className="block no-underline">
                  <Card size="3" className="transition-transform hover:-translate-y-0.5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <Badge color="orange" variant="solid" size="1">
                            {formatCents(t.rewardCents)}
                          </Badge>
                          <Badge
                            color={t.status === "open" ? "green" : "gray"}
                            variant="soft"
                            size="1"
                          >
                            {t.status}
                          </Badge>
                        </div>
                        <Heading size="4" weight="semi-bold" trim="end">
                          {t.title}
                        </Heading>
                        <Text size="2" color="gray" className="mt-1 line-clamp-1">
                          {t.description}
                        </Text>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2">
                        <StatusPill label="Accepted" count={counts.accepted} color="blue" />
                        <StatusPill
                          label="Awaiting review"
                          count={counts.submitted}
                          color="amber"
                        />
                        <StatusPill label="Paid" count={counts.approved} color="green" />
                        <StatusPill label="Rejected" count={counts.rejected} color="tomato" />
                      </div>
                    </div>
                  </Card>
                </Link>
              </FadeIn>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatusPill({
  label,
  count,
  color,
}: {
  label: string;
  count: number;
  color: "blue" | "amber" | "green" | "tomato";
}) {
  if (count === 0) return null;
  return (
    <Badge color={color} variant="soft" size="1">
      {count} {label}
    </Badge>
  );
}
