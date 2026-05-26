"use client";

import { Avatar, Select, Text } from "frosted-ui";
import { useTransition } from "react";
import { setActor } from "@/lib/actions/actor";

interface SwitchableAccount {
  id: string;
  name: string;
  kind: "business" | "user";
  avatarUrl: string | null;
}

interface RoleSwitcherProps {
  accounts: SwitchableAccount[];
  currentId: string;
}

export function RoleSwitcher({ accounts, currentId }: RoleSwitcherProps) {
  const [pending, startTransition] = useTransition();

  return (
    <Select.Root
      size="2"
      value={currentId}
      onValueChange={(value) => {
        if (typeof value !== "string" || value === currentId) return;
        startTransition(() => setActor(value));
      }}
      disabled={pending}
    >
      <Select.Trigger variant="soft" />
      <Select.Content>
        <Select.Group>
          <Select.GroupLabel>Businesses</Select.GroupLabel>
          {accounts
            .filter((a) => a.kind === "business")
            .map((a) => (
              <Select.Item key={a.id} value={a.id}>
                <AccountRow account={a} />
              </Select.Item>
            ))}
        </Select.Group>
        <Select.Separator />
        <Select.Group>
          <Select.GroupLabel>Users</Select.GroupLabel>
          {accounts
            .filter((a) => a.kind === "user")
            .map((a) => (
              <Select.Item key={a.id} value={a.id}>
                <AccountRow account={a} />
              </Select.Item>
            ))}
        </Select.Group>
      </Select.Content>
    </Select.Root>
  );
}

function AccountRow({ account }: { account: SwitchableAccount }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <Avatar
        size="1"
        src={account.avatarUrl ?? undefined}
        fallback={account.name.slice(0, 1).toUpperCase()}
      />
      <Text size="2">{account.name}</Text>
    </div>
  );
}
