"use client";

import { Button, Text, TextArea, TextField } from "frosted-ui";
import { useState, useTransition } from "react";
import { submitWorkAction } from "@/lib/actions/submissions";

interface SubmitWorkFormProps {
  acceptanceId: string;
}

export function SubmitWorkForm({ acceptanceId }: SubmitWorkFormProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <Text size="2" color="green">
        Submitted. The business will review it shortly.
      </Text>
    );
  }

  return (
    <form
      action={(formData) => {
        setError(null);
        formData.set("acceptanceId", acceptanceId);
        startTransition(async () => {
          const res = await submitWorkAction(formData);
          if (res.ok) setDone(true);
          else setError(res.error);
        });
      }}
      className="flex flex-col gap-3"
    >
      <div>
        <label htmlFor="submissionUrl" className="mb-1 block text-sm font-medium">
          Submission URL
        </label>
        <TextField.Root size="2">
          <TextField.Input
            id="submissionUrl"
            name="submissionUrl"
            type="url"
            placeholder="https://…"
            required
          />
        </TextField.Root>
      </div>
      <div>
        <label htmlFor="notes" className="mb-1 block text-sm font-medium">
          Notes (optional)
        </label>
        <TextArea id="notes" name="notes" rows={3} />
      </div>
      {error && (
        <Text size="2" color="tomato">
          {error}
        </Text>
      )}
      <div>
        <Button type="submit" size="2" color="orange" disabled={pending}>
          {pending ? "Submitting…" : "Submit work"}
        </Button>
      </div>
    </form>
  );
}
