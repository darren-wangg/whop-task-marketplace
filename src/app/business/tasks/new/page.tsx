import { Card, Heading, Text } from "frosted-ui";
import { requireActor } from "@/server/actor";
import { CreateTaskForm } from "@/components/forms/CreateTaskForm";
import { FadeIn } from "@/components/motion/FadeIn";

export default async function NewTaskPage() {
  await requireActor("business");
  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <FadeIn>
        <Heading size="7" weight="bold">
          Post a new task
        </Heading>
        <Text size="2" color="gray" render={<p className="mt-1 mb-6" />}>
          Be specific about the work and the submission format. Clearer tasks attract better
          submissions.
        </Text>
      </FadeIn>
      <FadeIn delay={0.05}>
        <Card size="4">
          <CreateTaskForm />
        </Card>
      </FadeIn>
    </div>
  );
}
