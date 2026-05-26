"use client";

import { Button } from "frosted-ui";
import { useState, useTransition } from "react";
import { acceptTaskAction } from "@/lib/actions/tasks";

interface AcceptButtonProps {
  taskId: string;
}

export function AcceptButton({ taskId }: AcceptButtonProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-2">
      <Button
        size="3"
        color="orange"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            try {
              await acceptTaskAction(taskId);
            } catch (e) {
              setError(e instanceof Error ? e.message : "Could not accept task.");
            }
          })
        }
      >
        {pending ? "Accepting…" : "Accept this task"}
      </Button>
      {error && <span className="text-sm text-[var(--tomato-11)]">{error}</span>}
    </div>
  );
}
