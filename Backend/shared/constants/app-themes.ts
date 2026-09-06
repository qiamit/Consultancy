export type AppThemeMode = "light" | "dark" | "system";

export type AppThemeValue =
  | "system"
  | "light"
  | "dark"
  | "midnight"
  | "ocean"
  | "forest"
  | "violet"
  | "sunrise";

export type AppThemeOption = {
  value: AppThemeValue;
  label: string;
  description: string;
  /** How the theme maps to light/dark surfaces. */
  mode: AppThemeMode;
  /** Preview swatches for settings cards (CSS colors). */
  swatch: { bg: string; fg: string; accent: string };
};

export const APP_THEME_OPTIONS: readonly AppThemeOption[] = [
  {
    value: "system",
    label: "System default",
    description: "Follow the device light/dark setting",
    mode: "system",
    swatch: { bg: "#e4e4e7", fg: "#18181b", accent: "#0284c7" },
  },
  {
    value: "light",
    label: "Light",
    description: "Bright surfaces with sky accents",
    mode: "light",
    swatch: { bg: "#fafafa", fg: "#09090b", accent: "#0284c7" },
  },
  {
    value: "dark",
    label: "Dark",
    description: "Zinc dark surfaces with sky accents",
    mode: "dark",
    swatch: { bg: "#18181b", fg: "#fafafa", accent: "#0ea5e9" },
  },
  {
    value: "midnight",
    label: "Midnight",
    description: "Near-black surfaces, soft sky accents",
    mode: "dark",
    swatch: { bg: "#050508", fg: "#f4f4f5", accent: "#38bdf8" },
  },
  {
    value: "ocean",
    label: "Ocean",
    description: "Dark UI with cyan / teal accents",
    mode: "dark",
    swatch: { bg: "#0c1222", fg: "#ecfeff", accent: "#06b6d4" },
  },
  {
    value: "forest",
    label: "Forest",
    description: "Dark UI with emerald accents",
    mode: "dark",
    swatch: { bg: "#0a140f", fg: "#ecfdf5", accent: "#10b981" },
  },
  {
    value: "violet",
    label: "Violet",
    description: "Dark UI with violet accents",
    mode: "dark",
    swatch: { bg: "#120f1a", fg: "#f5f3ff", accent: "#8b5cf6" },
  },
  {
    value: "sunrise",
    label: "Sunrise",
    description: "Light UI with warm amber accents",
    mode: "light",
    swatch: { bg: "#fffbeb", fg: "#1c1917", accent: "#d97706" },
  },
] as const;

const THEME_VALUES = new Set<string>(APP_THEME_OPTIONS.map((o) => o.value));

export function isAppTheme(value: string): value is AppThemeValue {
  return THEME_VALUES.has(value);
}

export function normalizeAppTheme(value: string | null | undefined): AppThemeValue {
  const v = (value ?? "").trim();
  return isAppTheme(v) ? v : "system";
}

export function getAppThemeOption(value: string | null | undefined): AppThemeOption {
  const normalized = normalizeAppTheme(value);
  return APP_THEME_OPTIONS.find((o) => o.value === normalized) ?? APP_THEME_OPTIONS[0]!;
}

/** Resolve whether the document should use the dark class for a stored theme. */
export function appThemeUsesDarkClass(
  theme: AppThemeValue,
  prefersDark: boolean,
): boolean {
  const option = getAppThemeOption(theme);
  if (option.mode === "dark") return true;
  if (option.mode === "light") return false;
  return prefersDark;
}
