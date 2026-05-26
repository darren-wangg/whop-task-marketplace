import Link from "next/link";
import { Avatar, Badge, Card, Heading, Text } from "frosted-ui";
import { formatCents } from "@/lib/money";

interface TaskCardProps {
  id: string;
  title: string;
  description: string;
  rewardCents: bigint;
  category: string | null;
  business: { id: string; name: string; avatarUrl: string | null };
  deadline: Date | null;
}

export function TaskCard({
  id,
  title,
  description,
  rewardCents,
  category,
  business,
  deadline,
}: TaskCardProps) {
  return (
    <Link href={`/tasks/${id}`} className="block no-underline">
      <Card size="3" className="h-full transition-transform hover:-translate-y-0.5">
        <div className="flex h-full flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <Badge color="orange" variant="solid" size="2">
              {formatCents(rewardCents)}
            </Badge>
            {category && (
              <Badge color="gray" variant="soft" size="1">
                {category}
              </Badge>
            )}
          </div>
          <Heading size="4" weight="semi-bold" trim="end">
            {title}
          </Heading>
          <Text size="2" color="gray" className="line-clamp-3">
            {description}
          </Text>
          <div className="mt-auto flex items-center justify-between gap-2 pt-3">
            <div className="flex items-center gap-2">
              <Avatar
                size="1"
                src={business.avatarUrl ?? undefined}
                fallback={business.name.slice(0, 1).toUpperCase()}
              />
              <Text size="1" color="gray">
                {business.name}
              </Text>
            </div>
            {deadline && (
              <Text size="1" color="gray">
                Due {new Date(deadline).toLocaleDateString()}
              </Text>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
