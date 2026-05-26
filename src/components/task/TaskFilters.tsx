"use client";

import { Select, TextField } from "frosted-ui";
import { useRouter, useSearchParams } from "next/navigation";
import { useDeferredValue, useEffect, useState, useTransition } from "react";

const CATEGORIES = ["content", "design", "research", "bug-bounty", "other"] as const;
const STATUSES = ["any", "open", "closed"] as const;

export function TaskFilters() {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    const next = new URLSearchParams(params.toString());
    if (deferredQuery) next.set("q", deferredQuery);
    else next.delete("q");
    if (next.toString() === params.toString()) return;
    startTransition(() => router.replace(`/?${next.toString()}`, { scroll: false }));
  }, [deferredQuery, params, router]);

  function setParam(key: string, value: string | undefined) {
    const next = new URLSearchParams(params.toString());
    if (value && value !== "any") next.set(key, value);
    else next.delete(key);
    startTransition(() => router.replace(`/?${next.toString()}`, { scroll: false }));
  }

  return (
    <div className="flex flex-wrap items-center gap-3" data-pending={pending ? "" : undefined}>
      <TextField.Root size="2" className="min-w-[260px] flex-1">
        <TextField.Input
          placeholder="Search tasks…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </TextField.Root>
      <Select.Root
        size="2"
        value={params.get("status") ?? "open"}
        onValueChange={(v) => typeof v === "string" && setParam("status", v)}
      >
        <Select.Trigger variant="soft" />
        <Select.Content>
          {STATUSES.map((s) => (
            <Select.Item key={s} value={s}>
              {s === "any" ? "Any status" : s}
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Root>
      <Select.Root
        size="2"
        value={params.get("category") ?? "all"}
        onValueChange={(v) =>
          typeof v === "string" && setParam("category", v === "all" ? undefined : v)
        }
      >
        <Select.Trigger variant="soft" placeholder="Category" />
        <Select.Content>
          <Select.Item value="all">All categories</Select.Item>
          {CATEGORIES.map((c) => (
            <Select.Item key={c} value={c}>
              {c}
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Root>
    </div>
  );
}
