"use client";

import { IconButton } from "frosted-ui";
import { useTransition } from "react";
import { setAppearance } from "@/lib/actions/theme";
import type { ThemeAppearance } from "@/lib/theme-types";

interface ThemeToggleProps {
  appearance: ThemeAppearance;
}

export function ThemeToggle({ appearance }: ThemeToggleProps) {
  const [pending, startTransition] = useTransition();
  const next: ThemeAppearance = appearance === "light" ? "dark" : "light";

  return (
    <IconButton
      variant="ghost"
      color="gray"
      size="2"
      aria-label={`Switch to ${next} mode`}
      disabled={pending}
      onClick={() => startTransition(() => setAppearance(next))}
    >
      {appearance === "light" ? <MoonIcon /> : <SunIcon />}
    </IconButton>
  );
}

function MoonIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}
