import "server-only";
import { cookies } from "next/headers";
import {
  ACCENT_COOKIE,
  APPEARANCE_COOKIE,
  DEFAULT_ACCENT,
  DEFAULT_APPEARANCE,
  type ThemeAccent,
  type ThemeAppearance,
} from "@/lib/theme-types";

export async function getThemePrefs(): Promise<{
  appearance: ThemeAppearance;
  accent: ThemeAccent;
}> {
  const store = await cookies();
  const appearance = (store.get(APPEARANCE_COOKIE)?.value as ThemeAppearance) || DEFAULT_APPEARANCE;
  const accent = (store.get(ACCENT_COOKIE)?.value as ThemeAccent) || DEFAULT_ACCENT;
  return { appearance, accent };
}
