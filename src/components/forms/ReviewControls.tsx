"use client";

import { Button, Text, TextArea } from "frosted-ui";
import { useState, useTransition } from "react";
import { reviewSubmissionAction } from "@/lib/actions/reviews";

interface ReviewControlsProps {
  submissionId: string;
  taskId: string;
}

export function ReviewControls({ submissionId, taskId }: ReviewControlsProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit(decision: "approve" | "reject", formData: FormData) {
    formData.set("submissionId", submissionId);
    formData.set("taskId", taskId);
    formData.set("decision", decision);
    setError(null);
    startTransition(async () => {
      const res = await reviewSubmissionAction(formData);
      if (!res.ok) setError(res.error);
    });
  }

  return (
    <form className="flex flex-col gap-3">
      <div>
        <label htmlFor={`notes-${submissionId}`} className="mb-1 block text-sm font-medium">
          Reviewer notes (optional)
        </label>
        <TextArea id={`notes-${submissionId}`} name="reviewerNotes" rows={2} />
      </div>
      {error && (
        <Text size="2" color="tomato">
          {error}
        </Text>
      )}
      <div className="flex gap-2">
        <Button
          type="button"
          size="2"
          color="green"
          variant="solid"
          disabled={pending}
          onClick={(e) => {
            const form = (e.currentTarget as HTMLButtonElement).form;
            if (form) submit("approve", new FormData(form));
          }}
        >
          Approve & pay
        </Button>
        <Button
          type="button"
          size="2"
          color="tomato"
          variant="soft"
          disabled={pending}
          onClick={(e) => {
            const form = (e.currentTarget as HTMLButtonElement).form;
            if (form) submit("reject", new FormData(form));
          }}
        >
          Reject
        </Button>
      </div>
    </form>
  );
}
