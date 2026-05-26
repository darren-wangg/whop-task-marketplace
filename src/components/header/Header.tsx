import Link from "next/link";
import { Badge, Heading } from "frosted-ui";
import { getCurrentActor, listSwitchableAccounts } from "@/server/actor";
import { getThemePrefs } from "@/server/theme";
import { RoleSwitcher } from "./RoleSwitcher";
import { ThemeToggle } from "./ThemeToggle";

export async function Header() {
  const [actor, accounts, theme] = await Promise.all([
    getCurrentActor(),
    listSwitchableAccounts(),
    getThemePrefs(),
  ]);

  const navItems =
    actor.kind === "business"
      ? [
          { href: "/", label: "Marketplace" },
          { href: "/business", label: "My tasks" },
          { href: "/business/tasks/new", label: "New task" },
        ]
      : [
          { href: "/", label: "Marketplace" },
          { href: "/me", label: "My work" },
        ];

  return (
    <header className="border-b border-[var(--gray-a4)] bg-[var(--color-panel-solid)]">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-3">
        <Link href="/" className="no-underline">
          <Heading size="5" weight="bold">
            Whop Tasks
          </Heading>
        </Link>
        <nav className="flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-1.5 text-sm text-[var(--gray-12)] hover:bg-[var(--gray-a3)]"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Badge color={actor.kind === "business" ? "orange" : "blue"} variant="soft" size="1">
            {actor.kind}
          </Badge>
          <RoleSwitcher
            accounts={accounts.map((a) => ({
              id: a.id,
              name: a.name,
              kind: a.kind,
              avatarUrl: a.avatarUrl,
            }))}
            currentId={actor.id}
            currentKind={actor.kind}
          />
          <ThemeToggle appearance={theme.appearance} />
        </div>
      </div>
    </header>
  );
}
