"use client";

import { Button, Select, Text, TextArea, TextField } from "frosted-ui";
import { useState, useTransition } from "react";
import { createTaskAction } from "@/lib/actions/tasks";

const CATEGORIES = ["content", "design", "research", "bug-bounty", "other"] as const;

export function CreateTaskForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("content");

  return (
    <form
      action={(formData) => {
        setError(null);
        formData.set("category", category);
        const local = formData.get("deadlineLocal");
        if (typeof local === "string" && local) {
          formData.set("deadlineISO", new Date(local).toISOString());
        }
        startTransition(async () => {
          const res = await createTaskAction(formData);
          if (res && !res.ok) setError(res.error);
        });
      }}
      className="flex flex-col gap-4"
    >
      <Field label="Title" htmlFor="title">
        <TextField.Root size="2">
          <TextField.Input id="title" name="title" placeholder="What needs doing?" required />
        </TextField.Root>
      </Field>
      <Field label="Description" htmlFor="description">
        <TextArea
          id="description"
          name="description"
          placeholder="Tell users what the task involves."
          rows={4}
          required
        />
      </Field>
      <Field label="Submission criteria" htmlFor="submissionCriteria">
        <TextArea
          id="submissionCriteria"
          name="submissionCriteria"
          placeholder="What proof do they need to submit? (e.g., URL format, required content)"
          rows={3}
          required
        />
      </Field>
      <div className="flex gap-3">
        <Field label="Reward (USD)" htmlFor="rewardDollars" className="flex-1">
          <TextField.Root size="2">
            <TextField.Input
              id="rewardDollars"
              name="rewardDollars"
              placeholder="50.00"
              inputMode="decimal"
              required
            />
          </TextField.Root>
        </Field>
        <Field label="Category" htmlFor="category" className="flex-1">
          <Select.Root
            size="2"
            value={category}
            onValueChange={(v) =>
              typeof v === "string" && setCategory(v as (typeof CATEGORIES)[number])
            }
          >
            <Select.Trigger variant="surface" />
            <Select.Content>
              {CATEGORIES.map((c) => (
                <Select.Item key={c} value={c}>
                  {c}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        </Field>
      </div>
      <Field label="Deadline (optional)" htmlFor="deadlineLocal">
        <TextField.Root size="2">
          <TextField.Input id="deadlineLocal" name="deadlineLocal" type="datetime-local" />
        </TextField.Root>
      </Field>
      {error && (
        <Text size="2" color="tomato">
          {error}
        </Text>
      )}
      <div>
        <Button type="submit" size="3" color="orange" disabled={pending}>
          {pending ? "Posting…" : "Post task"}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      {children}
    </div>
  );
}
