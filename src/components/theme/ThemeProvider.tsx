"use client";

import { Theme } from "frosted-ui";
import type { ReactNode } from "react";
import type { ThemeAccent, ThemeAppearance } from "@/lib/theme-types";

interface ThemeProviderProps {
  appearance: ThemeAppearance;
  accent: ThemeAccent;
  children: ReactNode;
}

export function ThemeProvider({ appearance, accent, children }: ThemeProviderProps) {
  return (
    <Theme appearance={appearance} accentColor={accent}>
      {children}
    </Theme>
  );
}
