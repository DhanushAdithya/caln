import { useEffect, useState } from "preact/hooks";
import {
  decodeHash,
  encodeHash,
  hasAnyMarks,
  isDayMarked,
  setDayMark,
  type Group,
  type State,
} from "./hash";
import {
  DEFAULT_SETTINGS,
  normalizeSettings,
  type Settings,
  type ThemeName,
} from "./settings";
import { idbGet, idbSet } from "./db";
import { todayRef } from "./dates";

export type Sheet = null | "settings" | "groups";

interface StoreView {
  groups: Group[];
  sel: number;
  setSel: (i: number) => void;
  year: number;
  setYear: (y: number) => void;
  month: number;
  setMonth: (m: number) => void;
  hasMark: (groupIndex: number, year: number, dayIdx: number) => boolean;
  toggle: (groupIndex: number, year: number, dayIdx: number) => void;
  settings: Settings;
  setSetting: <K extends keyof Settings>(k: K, v: Settings[K]) => void;
  sheet: Sheet;
  setSheet: (s: Sheet) => void;
  jumpToday: () => void;
}

function createDefaultState(): State {
  const today = todayRef();
  return {
    v: 1,
    nextGroupId: 4,
    groups: [
      { id: 1, name: "Work", color: 5, years: {} },
      { id: 2, name: "Gym", color: 4, years: {} },
      { id: 3, name: "Vacation", color: 1, years: {} },
    ],
    active: 1,
    year: today.y,
    month: today.m,
  };
}

let state: State = createDefaultState();
let settings: Settings = { ...DEFAULT_SETTINGS };
let currentSheet: Sheet = null;

const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) {
    listener();
  }
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function getState(): State {
  return state;
}

export function getSettings(): Settings {
  return settings;
}

function applyTheme(theme: ThemeName): void {
  if (typeof document === "undefined") return;
  const dark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
}

if (typeof window !== "undefined") {
  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", () => {
      if (settings.theme === "system") {
        applyTheme("system");
      }
    });
}

let idbTimer: number | null = null;
let lastWrittenHash = "";

function scheduleIdbSave(targetState: State): void {
  if (typeof window === "undefined") return;
  if (idbTimer !== null) {
    window.clearTimeout(idbTimer);
  }
  idbTimer = window.setTimeout(() => {
    idbTimer = null;
    idbSet("state", targetState);
  }, 500);
}

async function writeHash(targetState: State, push: boolean): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const h = await encodeHash(targetState);
    if (h === lastWrittenHash || h === window.location.hash) return;
    lastWrittenHash = h;
    if (push) {
      window.history.pushState(null, "", h);
    } else {
      window.history.replaceState(null, "", h);
    }
  } catch (err) {
    console.error("Failed to encode hash:", err);
  }
}

function updateState(next: State, opts: { pushHash?: boolean } = {}): void {
  state = next;
  notify();
  writeHash(next, Boolean(opts.pushHash));
  scheduleIdbSave(next);
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    if (idbTimer !== null) {
      window.clearTimeout(idbTimer);
      idbTimer = null;
      idbSet("state", state);
    }
  });

  window.addEventListener("popstate", async () => {
    const hash = window.location.hash;
    if (hash === lastWrittenHash) return;
    const decoded = await decodeHash(hash);
    if (decoded) {
      lastWrittenHash = hash;
      state = decoded;
      notify();
      scheduleIdbSave(decoded);
    }
  });
}

let initPromise: Promise<void> | null = null;

export function initStore(): Promise<void> {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const savedSettings = await idbGet<Settings>("settings");
    if (savedSettings) {
      settings = normalizeSettings(savedSettings);
    }
    applyTheme(settings.theme);

    let loadedState: State | null = null;
    if (typeof window !== "undefined" && window.location.hash) {
      loadedState = await decodeHash(window.location.hash);
      if (loadedState) {
        scheduleIdbSave(loadedState);
      }
    }

    if (!loadedState) {
      loadedState = await idbGet<State>("state");
      if (loadedState && typeof window !== "undefined") {
        const h = await encodeHash(loadedState);
        lastWrittenHash = h;
        window.history.replaceState(null, "", h);
      }
    }

    if (!loadedState) {
      loadedState = createDefaultState();
      if (typeof window !== "undefined") {
        const h = await encodeHash(loadedState);
        lastWrittenHash = h;
        window.history.replaceState(null, "", h);
        scheduleIdbSave(loadedState);
      }
    }

    state = loadedState;
    notify();
  })();
  return initPromise;
}

if (typeof window !== "undefined") {
  initStore();
}

function setSel(index: number): void {
  const g = state.groups[index];
  if (g && state.active !== g.id) {
    updateState({ ...state, active: g.id }, { pushHash: false });
  }
}

function setYear(year: number): void {
  if (state.year !== year) {
    updateState({ ...state, year }, { pushHash: false });
  }
}

function setMonth(month: number): void {
  if (state.month !== month) {
    updateState({ ...state, month }, { pushHash: false });
  }
}

function jumpToday(): void {
  const today = todayRef();
  if (state.year !== today.y || state.month !== today.m) {
    updateState(
      { ...state, year: today.y, month: today.m },
      { pushHash: false },
    );
  }
}

function toggleMark(groupIndex: number, year: number, dayIdx: number): void {
  const group = state.groups[groupIndex];
  if (!group) return;

  const currentYearMarks = group.years[year];
  const nextMarks = currentYearMarks
    ? new Uint8Array(currentYearMarks)
    : new Uint8Array(46);

  const currentlyMarked = isDayMarked(nextMarks, dayIdx);
  setDayMark(nextMarks, dayIdx, !currentlyMarked);

  const nextYears = { ...group.years };
  if (hasAnyMarks(nextMarks)) {
    nextYears[year] = nextMarks;
  } else {
    delete nextYears[year];
  }

  const nextGroups = state.groups.map((g, i) =>
    i === groupIndex ? { ...g, years: nextYears } : g,
  );

  updateState({ ...state, groups: nextGroups }, { pushHash: true });
}

function setSetting<K extends keyof Settings>(k: K, v: Settings[K]): void {
  settings = { ...settings, [k]: v };
  if (k === "theme") {
    applyTheme(settings.theme);
  }
  notify();
  idbSet("settings", settings);
}

function setSheet(s: Sheet): void {
  currentSheet = s;
  notify();
}

export function useStore(): StoreView {
  const [, setTick] = useState(0);

  useEffect(() => {
    return subscribe(() => setTick((t) => t + 1));
  }, []);

  const activeIndex = state.groups.findIndex((g) => g.id === state.active);
  const sel = activeIndex >= 0 ? activeIndex : 0;

  return {
    groups: state.groups,
    sel,
    setSel,
    year: state.year,
    setYear,
    month: state.month,
    setMonth,
    hasMark: (groupIndex, y, idx) => {
      const g = state.groups[groupIndex];
      return isDayMarked(g?.years[y], idx);
    },
    toggle: toggleMark,
    settings,
    setSetting,
    sheet: currentSheet,
    setSheet,
    jumpToday,
  };
}
