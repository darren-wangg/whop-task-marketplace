"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  ACCENT_COOKIE,
  APPEARANCE_COOKIE,
  VALID_ACCENTS,
  VALID_APPEARANCES,
  type ThemeAccent,
  type ThemeAppearance,
} from "@/lib/theme-types";

const ONE_YEAR = 60 * 60 * 24 * 365;

async function setCookie(name: string, value: string) {
  const store = await cookies();
  store.set(name, value, {
    sameSite: "lax",
    maxAge: ONE_YEAR,
    path: "/",
  });
}

export async function setAppearance(value: ThemeAppearance): Promise<void> {
  if (!VALID_APPEARANCES.includes(value)) throw new Error(`Bad appearance: ${value}`);
  await setCookie(APPEARANCE_COOKIE, value);
  revalidatePath("/", "layout");
}

export async function setAccent(value: ThemeAccent): Promise<void> {
  if (!VALID_ACCENTS.includes(value)) throw new Error(`Bad accent: ${value}`);
  await setCookie(ACCENT_COOKIE, value);
  revalidatePath("/", "layout");
}
