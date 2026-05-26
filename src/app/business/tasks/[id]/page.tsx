import { notFound } from "next/navigation";
import { Avatar, Badge, Card, Heading, Link as FUILink, Separator, Text } from "frosted-ui";
import { db } from "@/server/db";
import { requirePageActor } from "@/server/actor";
import { formatCents } from "@/lib/money";
import { ReviewControls } from "@/components/forms/ReviewControls";
import { FadeIn } from "@/components/motion/FadeIn";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function BusinessTaskPage({ params }: PageProps) {
  const { id } = await params;
  const actor = await requirePageActor("business");

  const task = await db.task.findUnique({
    where: { id },
    include: {
      acceptances: {
        orderBy: { acceptedAt: "desc" },
        include: {
          user: { select: { id: true, name: true, avatarUrl: true } },
          submission: { include: { payment: true } },
        },
      },
    },
  });
  if (!task) notFound();
  if (task.businessId !== actor.id) notFound();

  const pending = task.acceptances.filter(
    (a) => a.status === "submitted" && a.submission && !a.submission.reviewedAt,
  );
  const settled = task.acceptances.filter(
    (a) => a.status === "approved" || a.status === "rejected",
  );
  const inProgress = task.acceptances.filter((a) => a.status === "accepted");

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <FadeIn>
        <div className="mb-6">
          <div className="mb-3 flex items-center gap-2">
            <Badge color="orange" variant="solid" size="2">
              {formatCents(task.rewardCents)}
            </Badge>
            {task.category && (
              <Badge color="gray" variant="soft" size="1">
                {task.category}
              </Badge>
            )}
            <Badge color={task.status === "open" ? "green" : "gray"} variant="soft" size="1">
              {task.status}
            </Badge>
          </div>
          <Heading size="7" weight="bold">
            {task.title}
          </Heading>
        </div>
      </FadeIn>

      <Section title={`Awaiting review (${pending.length})`}>
        {pending.length === 0 ? (
          <Empty text="No submissions waiting on you." />
        ) : (
          pending.map((a) => (
            <FadeIn key={a.id}>
              <Card size="3">
                <ActorRow
                  name={a.user.name}
                  avatarUrl={a.user.avatarUrl}
                  subtitle={`Submitted ${new Date(a.submission!.submittedAt).toLocaleString()}`}
                />
                <Separator size="4" className="my-3" />
                <SubmissionDetails url={a.submission!.submissionUrl} notes={a.submission!.notes} />
                <Separator size="4" className="my-3" />
                <ReviewControls submissionId={a.submission!.id} taskId={task.id} />
              </Card>
            </FadeIn>
          ))
        )}
      </Section>

      <Section title={`In progress (${inProgress.length})`}>
        {inProgress.length === 0 ? (
          <Empty text="No one is currently working on this." />
        ) : (
          inProgress.map((a) => (
            <Card key={a.id} size="2">
              <ActorRow
                name={a.user.name}
                avatarUrl={a.user.avatarUrl}
                subtitle={`Accepted ${new Date(a.acceptedAt).toLocaleString()}`}
              />
            </Card>
          ))
        )}
      </Section>

      <Section title={`Settled (${settled.length})`}>
        {settled.length === 0 ? (
          <Empty text="No completed submissions yet." />
        ) : (
          settled.map((a) => (
            <Card key={a.id} size="2">
              <div className="flex items-center justify-between gap-3">
                <ActorRow
                  name={a.user.name}
                  avatarUrl={a.user.avatarUrl}
                  subtitle={
                    a.submission?.reviewedAt
                      ? `Reviewed ${new Date(a.submission.reviewedAt).toLocaleString()}`
                      : ""
                  }
                />
                <Badge color={a.status === "approved" ? "green" : "tomato"} variant="soft" size="1">
                  {a.status}
                  {a.status === "approved" && a.submission?.payment
                    ? ` • ${formatCents(a.submission.payment.amountCents)}`
                    : ""}
                </Badge>
              </div>
              {a.submission && (
                <>
                  <Separator size="4" className="my-3" />
                  <SubmissionDetails url={a.submission.submissionUrl} notes={a.submission.notes} />
                  {a.submission.reviewerNotes && (
                    <Text size="1" color="gray" render={<p className="mt-2" />}>
                      Your note: {a.submission.reviewerNotes}
                    </Text>
                  )}
                </>
              )}
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

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-md border border-dashed border-[var(--gray-a4)] px-4 py-6 text-center">
      <Text size="2" color="gray">
        {text}
      </Text>
    </div>
  );
}

function ActorRow({
  name,
  avatarUrl,
  subtitle,
}: {
  name: string;
  avatarUrl: string | null;
  subtitle?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <Avatar size="2" src={avatarUrl ?? undefined} fallback={name.slice(0, 1).toUpperCase()} />
      <div>
        <Text size="2" weight="medium" render={<div />}>
          {name}
        </Text>
        {subtitle && (
          <Text size="1" color="gray">
            {subtitle}
          </Text>
        )}
      </div>
    </div>
  );
}

function SubmissionDetails({ url, notes }: { url: string; notes: string | null }) {
  return (
    <div>
      <Text size="2" weight="medium">
        Submission
      </Text>
      <div className="mt-1">
        <FUILink href={url} target="_blank" rel="noopener noreferrer" size="2">
          {url}
        </FUILink>
      </div>
      {notes && (
        <Text size="2" color="gray" render={<p className="mt-2 whitespace-pre-wrap" />}>
          {notes}
        </Text>
      )}
    </div>
  );
}
