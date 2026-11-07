// TEMPORARY mock state while the UI is built out (commit 1).
// The real store (hash codec + IndexedDB) swaps in through this exact surface:
//   groups / sel / setSel / year,month + setters / marks + toggle /
//   settings + setSetting / sheet / jumpToday
// Nothing below leaks into components — they stay state-source-agnostic.

import { useEffect, useState } from "preact/hooks";
import { todayRef, ymdToIdx, type WeekStart } from "../state/dates";

export interface MockGroup {
  name: string;
  color: number;
}
export type ThemeName = "system" | "light" | "dark";
export interface Settings {
  skipWeekends: boolean;
  highlightToday: boolean;
  weekStart: WeekStart;
  theme: ThemeName;
  weekendsRed: boolean;
}
export type Sheet = null | "settings" | "groups";

const today = todayRef();
const DEFAULTS: Settings = {
  skipWeekends: false,
  highlightToday: true,
  weekStart: 1,
  theme: "system",
  weekendsRed: true,
};

/** seed marks so the matrix/calendar look alive during UI work; key = `g|y|dayIdx` */
function demoMarks(): Set<string> {
  const s = new Set<string>();
  const add = (g: number, y: number, m: number, d: number) =>
    s.add(`${g}|${y}|${ymdToIdx(y, m, d)}`);
  for (let m = 1; m <= 10; m++) add(0, today.y, m, 3 + (m % 8)); // scattered work-ish marks
  for (let d = 2; d <= 6; d++) add(0, today.y, 2, d); // March run
  for (let d = 9; d <= 12; d++)
    add(1, today.y, today.m - 1 < 0 ? 11 : today.m - 1, d); // gym recently
  add(1, today.y, today.m, 5);
  add(1, today.y, today.m, 3);
  for (let d = 10; d <= 18; d++) add(2, today.y, 6, d); // July vacation
  return s;
}

export function useMockState() {
  const [groups] = useState<MockGroup[]>([
    { name: "Work", color: 5 },
    { name: "Gym", color: 4 },
    { name: "Vacation", color: 1 },
  ]);
  const [sel, setSel] = useState(0);
  const [year, setYear] = useState(today.y);
  const [month, setMonth] = useState(today.m);
  const [marks, setMarks] = useState<Set<string>>(demoMarks);
  const [settings, setSettingsRaw] = useState<Settings>(DEFAULTS);
  const [sheet, setSheet] = useState<Sheet>(null);

  // theme side-effect (light + dark both real; system follows the media query)
  useEffect(() => {
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark =
        settings.theme === "dark" ||
        (settings.theme === "system" && mq.matches);
      document.documentElement.dataset.theme = dark ? "dark" : "light";
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [settings.theme]);

  const hasMark = (g: number, y: number, idx: number) =>
    marks.has(`${g}|${y}|${idx}`);
  const toggle = (g: number, y: number, idx: number) =>
    setMarks((prev) => {
      const k = `${g}|${y}|${idx}`;
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  const setSetting = <K extends keyof Settings>(k: K, v: Settings[K]) =>
    setSettingsRaw((s) => ({ ...s, [k]: v }));
  const jumpToday = () => {
    setYear(today.y);
    setMonth(today.m);
  };

  return {
    groups,
    sel,
    setSel,
    year,
    setYear,
    month,
    setMonth,
    hasMark,
    toggle,
    settings,
    setSetting,
    sheet,
    setSheet,
    jumpToday,
  };
}
