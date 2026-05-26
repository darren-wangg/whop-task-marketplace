import { notFound } from "next/navigation";
import { Avatar, Badge, Card, Heading, Separator, Text } from "frosted-ui";
import { getCurrentActor } from "@/server/actor";
import { getTask } from "@/server/services/tasks";
import { formatCents } from "@/lib/money";
import { AcceptButton } from "@/components/task/AcceptButton";
import { SubmitWorkForm } from "@/components/forms/SubmitWorkForm";
import { FadeIn } from "@/components/motion/FadeIn";
import { ServiceError } from "@/server/errors";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TaskDetailPage({ params }: PageProps) {
  const { id } = await params;
  const actor = await getCurrentActor();
  let detail;
  try {
    detail = await getTask(id, actor);
  } catch (err) {
    if (err instanceof ServiceError && err.status === 404) notFound();
    throw err;
  }
  const { task, myAcceptance } = detail;

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <FadeIn>
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
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
            <div className="mt-2 flex items-center gap-2">
              <Avatar
                size="1"
                src={task.business.avatarUrl ?? undefined}
                fallback={task.business.name.slice(0, 1).toUpperCase()}
              />
              <Text size="2" color="gray">
                Posted by {task.business.name}
              </Text>
            </div>
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={0.05}>
        <Card size="3">
          <Heading size="3" weight="semi-bold">
            Description
          </Heading>
          <Text size="2" render={<p className="mt-2 whitespace-pre-wrap" />}>
            {task.description}
          </Text>
          <Separator size="4" className="my-4" />
          <Heading size="3" weight="semi-bold">
            Submission criteria
          </Heading>
          <Text size="2" render={<p className="mt-2 whitespace-pre-wrap" />}>
            {task.submissionCriteria}
          </Text>
          {task.deadline && (
            <Text size="2" color="gray" render={<p className="mt-4" />}>
              Deadline: {new Date(task.deadline).toLocaleString()}
            </Text>
          )}
        </Card>
      </FadeIn>

      <FadeIn delay={0.1}>
        <div className="mt-6">
          <ActorPanel
            actorKind={actor.kind}
            actorIsTaskOwner={actor.id === task.businessId}
            taskOpen={task.status === "open"}
            taskId={task.id}
            myAcceptance={myAcceptance}
          />
        </div>
      </FadeIn>
    </div>
  );
}

function ActorPanel({
  actorKind,
  actorIsTaskOwner,
  taskOpen,
  taskId,
  myAcceptance,
}: {
  actorKind: "business" | "user";
  actorIsTaskOwner: boolean;
  taskOpen: boolean;
  taskId: string;
  myAcceptance: { id: string; status: string } | null;
}) {
  if (actorKind === "business") {
    return (
      <Card size="3">
        <Text size="2" color="gray">
          {actorIsTaskOwner
            ? "You posted this task. Switch to your business dashboard to review submissions."
            : "Switch to a user account to accept tasks."}
        </Text>
      </Card>
    );
  }

  if (myAcceptance?.status === "accepted") {
    return (
      <Card size="3">
        <Heading size="3" weight="semi-bold">
          Submit your work
        </Heading>
        <Text size="2" color="gray" render={<p className="mt-1 mb-3" />}>
          Provide a URL to your work. The business will review it.
        </Text>
        <SubmitWorkForm acceptanceId={myAcceptance.id} />
      </Card>
    );
  }

  if (myAcceptance?.status === "submitted") {
    return (
      <Card size="3">
        <Text size="2" color="amber">
          Submitted — awaiting review.
        </Text>
      </Card>
    );
  }

  if (myAcceptance?.status === "approved") {
    return (
      <Card size="3">
        <Text size="2" color="green">
          Approved and paid. Nice work.
        </Text>
      </Card>
    );
  }

  if (myAcceptance?.status === "rejected") {
    return (
      <Card size="3">
        <Text size="2" color="tomato">
          Rejected. Read the reviewer notes on your /me page.
        </Text>
      </Card>
    );
  }

  if (!taskOpen) {
    return (
      <Card size="3">
        <Text size="2" color="gray">
          This task is closed.
        </Text>
      </Card>
    );
  }

  return (
    <Card size="3">
      <AcceptButton taskId={taskId} />
    </Card>
  );
}
