import { Heading, Text } from "frosted-ui";
import { listTasks } from "@/server/services/tasks";
import { listTasksFiltersSchema } from "@/lib/schemas";
import { TaskCard } from "@/components/task/TaskCard";
import { TaskFilters } from "@/components/task/TaskFilters";
import { FadeIn } from "@/components/motion/FadeIn";

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const parsed = listTasksFiltersSchema.safeParse({
    q: typeof raw.q === "string" ? raw.q : undefined,
    status: typeof raw.status === "string" ? raw.status : "open",
    category: typeof raw.category === "string" ? raw.category : undefined,
    minRewardCents: typeof raw.minRewardCents === "string" ? raw.minRewardCents : undefined,
    maxRewardCents: typeof raw.maxRewardCents === "string" ? raw.maxRewardCents : undefined,
    cursor: typeof raw.cursor === "string" ? raw.cursor : undefined,
  });
  const filters = parsed.success ? parsed.data : { status: "open" as const };
  const { items } = await listTasks(filters);

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <FadeIn>
        <div className="mb-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <Heading size="8" weight="bold">
              Earn by doing real work
            </Heading>
            <Text size="3" color="gray" render={<p className="mt-2 max-w-2xl" />}>
              Businesses post tasks. You accept, submit, get paid. No commitments, no quotas.
            </Text>
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={0.05}>
        <div className="mt-6 mb-6">
          <TaskFilters />
        </div>
      </FadeIn>

      {items.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((t, i) => (
            <FadeIn key={t.id} delay={Math.min(i * 0.03, 0.2)}>
              <TaskCard
                id={t.id}
                title={t.title}
                description={t.description}
                rewardCents={t.rewardCents}
                category={t.category}
                business={t.business}
                deadline={t.deadline}
              />
            </FadeIn>
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-[var(--gray-a4)] bg-[var(--gray-a2)] p-12 text-center">
      <Heading size="4" weight="medium">
        No tasks match your filters
      </Heading>
      <Text size="2" color="gray" render={<p className="mt-2" />}>
        Try clearing the search or switching the status filter.
      </Text>
    </div>
  );
}
