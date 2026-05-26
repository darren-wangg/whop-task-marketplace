export type ThemeAppearance = "light" | "dark";
export type ThemeAccent = "orange" | "blue" | "indigo" | "lime" | "magenta" | "tomato" | "lemon";

export const APPEARANCE_COOKIE = "themeAppearance";
export const ACCENT_COOKIE = "themeAccent";

export const DEFAULT_APPEARANCE: ThemeAppearance = "light";
export const DEFAULT_ACCENT: ThemeAccent = "orange";

export const VALID_APPEARANCES: readonly ThemeAppearance[] = ["light", "dark"];
export const VALID_ACCENTS: readonly ThemeAccent[] = [
  "orange",
  "blue",
  "indigo",
  "lime",
  "magenta",
  "tomato",
  "lemon",
];
