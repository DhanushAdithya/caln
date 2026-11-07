import type { WeekStart } from "./dates";

export type ThemeName = "system" | "light" | "dark";

export interface Settings {
  skipWeekends: boolean;
  highlightToday: boolean;
  weekStart: WeekStart;
  theme: ThemeName;
  weekendsRed: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  skipWeekends: false,
  highlightToday: true,
  weekStart: 1,
  theme: "system",
  weekendsRed: true,
};

export function normalizeSettings(
  raw: Partial<Settings> | null | undefined,
): Settings {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_SETTINGS };
  return {
    skipWeekends:
      typeof raw.skipWeekends === "boolean"
        ? raw.skipWeekends
        : DEFAULT_SETTINGS.skipWeekends,
    highlightToday:
      typeof raw.highlightToday === "boolean"
        ? raw.highlightToday
        : DEFAULT_SETTINGS.highlightToday,
    weekStart:
      raw.weekStart === 0 || raw.weekStart === 1
        ? raw.weekStart
        : DEFAULT_SETTINGS.weekStart,
    theme:
      raw.theme === "light" || raw.theme === "dark" || raw.theme === "system"
        ? raw.theme
        : DEFAULT_SETTINGS.theme,
    weekendsRed:
      typeof raw.weekendsRed === "boolean"
        ? raw.weekendsRed
        : DEFAULT_SETTINGS.weekendsRed,
  };
}
