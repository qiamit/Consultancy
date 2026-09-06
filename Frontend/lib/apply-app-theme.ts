"use client";

import {
  appThemeUsesDarkClass,
  normalizeAppTheme,
  type AppThemeValue,
} from "@backend/shared/constants/app-themes";

/** Apply theme to <html> immediately (data-theme + dark class). */
export function applyAppThemeToDocument(themeRaw: string | null | undefined) {
  if (typeof document === "undefined") return;
  const theme = normalizeAppTheme(themeRaw);
  const preferDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const useDark = appThemeUsesDarkClass(theme, preferDark);
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  root.classList.toggle("dark", useDark);
}

export function readThemeCookie(): AppThemeValue | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|; )theme=([^;]*)/);
  if (!match?.[1]) return null;
  try {
    return normalizeAppTheme(decodeURIComponent(match[1]));
  } catch {
    return null;
  }
}
