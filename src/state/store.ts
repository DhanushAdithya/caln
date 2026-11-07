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

export interface ToastData {
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface StoreView {
  groups: Group[];
  sel: number;
  setSel: (i: number) => void;
  year: number;
  setYear: (y: number) => void;
  month: number;
  setMonth: (m: number) => void;
  hasMark: (groupIndex: number, year: number, dayIdx: number) => boolean;
  toggle: (groupIndex: number, year: number, dayIdx: number) => void;
  setMark: (
    groupIndex: number,
    year: number,
    dayIdx: number,
    value: boolean,
    pushHash?: boolean,
  ) => void;
  commitMarks: () => void;
  settings: Settings;
  setSetting: <K extends keyof Settings>(k: K, v: Settings[K]) => void;
  sheet: Sheet;
  setSheet: (s: Sheet) => void;
  jumpToday: () => void;
  createGroup: (name: string, color?: number) => number;
  updateGroup: (id: number, patch: { name?: string; color?: number }) => void;
  deleteGroup: (id: number) => void;
  undoDelete: () => void;
  reorderGroup: (fromIndex: number, toIndex: number) => void;
  toast: ToastData | null;
  dismissToast: () => void;
  showToast: (
    msg: string,
    action?: { label: string; onClick: () => void },
    durationMs?: number,
  ) => void;
  canInstall: boolean;
  installApp: () => Promise<void>;
  share: () => Promise<void>;
}

function createDefaultState(): State {
  const today = todayRef();
  return {
    v: 1,
    nextGroupId: 2,
    groups: [
      {
        id: 1,
        name: "Group 1",
        color: 5,
        years: {},
      },
    ],
    active: 1,
    year: today.y,
    month: today.m,
  };
}

let state: State = createDefaultState();
let settings: Settings = { ...DEFAULT_SETTINGS };
let currentSheet: Sheet = null;
let currentToast: ToastData | null = null;
let toastTimer: number | null = null;
let deletedGroupBackup: { group: Group; index: number } | null = null;

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
  const themeMeta = document.querySelector(
    'meta[name="theme-color"]:not([media])',
  );
  if (themeMeta) {
    themeMeta.setAttribute("content", dark ? "#101014" : "#fafafa");
  }
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
    } else if (hash) {
      showToast("This link can't be read");
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
      } else {
        showToast("This link can't be read");
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

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferredInstallPrompt: BeforeInstallPromptEvent | null = null;

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredInstallPrompt = e as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    notify();
  });
}

async function installApp(): Promise<void> {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  const choice = await deferredInstallPrompt.userChoice;
  if (choice.outcome === "accepted") {
    deferredInstallPrompt = null;
    notify();
  }
}

async function shareLink(): Promise<void> {
  if (typeof window === "undefined") return;
  const url = window.location.href;
  if (navigator.share) {
    try {
      await navigator.share({
        title: "caln",
        url,
      });
      return;
    } catch (err) {
      if ((err as Error)?.name === "AbortError") {
        return;
      }
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    showToast("Link copied to clipboard");
  } catch {
    showToast("Failed to copy link");
  }
}

export function showToast(
  msg: string,
  action?: { label: string; onClick: () => void },
  durationMs = 3000,
): void {
  if (typeof window === "undefined") return;
  if (toastTimer !== null) {
    window.clearTimeout(toastTimer);
  }
  currentToast = { message: msg, action };
  notify();
  toastTimer = window.setTimeout(() => {
    currentToast = null;
    toastTimer = null;
    notify();
  }, durationMs);
}

function dismissToast(): void {
  if (typeof window === "undefined") return;
  if (toastTimer !== null) {
    window.clearTimeout(toastTimer);
    toastTimer = null;
  }
  currentToast = null;
  notify();
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

function setMark(
  groupIndex: number,
  year: number,
  dayIdx: number,
  value: boolean,
  pushHash = true,
): void {
  const group = state.groups[groupIndex];
  if (!group) return;

  const currentYearMarks = group.years[year];
  const currentlyMarked = isDayMarked(currentYearMarks, dayIdx);
  if (currentlyMarked === value) return;

  const nextMarks = currentYearMarks
    ? new Uint8Array(currentYearMarks)
    : new Uint8Array(46);

  setDayMark(nextMarks, dayIdx, value);

  const nextYears = { ...group.years };
  if (hasAnyMarks(nextMarks)) {
    nextYears[year] = nextMarks;
  } else {
    delete nextYears[year];
  }

  const nextGroups = state.groups.map((g, i) =>
    i === groupIndex ? { ...g, years: nextYears } : g,
  );

  updateState({ ...state, groups: nextGroups }, { pushHash });
}

function commitMarks(): void {
  if (typeof window === "undefined") return;
  encodeHash(state).then((h) => {
    lastWrittenHash = h;
    window.history.pushState(null, "", h);
  });
}

function toggleMark(groupIndex: number, year: number, dayIdx: number): void {
  const group = state.groups[groupIndex];
  if (!group) {
    showToast("Create a group first", {
      label: "+ New",
      onClick: () => setSheet("groups"),
    });
    return;
  }

  const currentlyMarked = isDayMarked(group.years[year], dayIdx);
  setMark(groupIndex, year, dayIdx, !currentlyMarked, true);
}

function createGroup(name: string, color?: number): number {
  const id = state.nextGroupId++;
  const assignedColor = color ?? (id - 1) % 12;
  const newGroup: Group = {
    id,
    name: name.trim() || `Group ${id}`,
    color: assignedColor,
    years: {},
  };
  const nextGroups = [...state.groups, newGroup];
  updateState(
    {
      ...state,
      nextGroupId: state.nextGroupId,
      groups: nextGroups,
      active: id,
    },
    { pushHash: true },
  );
  return id;
}

function updateGroup(
  id: number,
  patch: { name?: string; color?: number },
): void {
  const nextGroups = state.groups.map((g) => {
    if (g.id !== id) return g;
    return {
      ...g,
      name: patch.name !== undefined ? patch.name.trim() || g.name : g.name,
      color: patch.color !== undefined ? patch.color : g.color,
    };
  });
  updateState({ ...state, groups: nextGroups }, { pushHash: true });
}

function deleteGroup(id: number): void {
  const index = state.groups.findIndex((g) => g.id === id);
  if (index === -1) return;
  const targetGroup = state.groups[index];
  deletedGroupBackup = { group: targetGroup, index };

  const nextGroups = state.groups.filter((g) => g.id !== id);
  let nextActive = state.active;
  if (state.active === id) {
    const nextGroup = nextGroups[index] ?? nextGroups[nextGroups.length - 1];
    nextActive = nextGroup ? nextGroup.id : null;
  }

  updateState(
    { ...state, groups: nextGroups, active: nextActive },
    { pushHash: true },
  );

  showToast(
    `Deleted "${targetGroup.name}"`,
    {
      label: "Undo",
      onClick: () => undoDelete(),
    },
    3000,
  );
}

function undoDelete(): void {
  if (!deletedGroupBackup) return;
  const { group, index } = deletedGroupBackup;
  deletedGroupBackup = null;

  const nextGroups = [...state.groups];
  const insertAt = Math.min(index, nextGroups.length);
  nextGroups.splice(insertAt, 0, group);

  updateState(
    { ...state, groups: nextGroups, active: group.id },
    { pushHash: true },
  );
  dismissToast();
}

function reorderGroup(fromIndex: number, toIndex: number): void {
  if (
    fromIndex < 0 ||
    fromIndex >= state.groups.length ||
    toIndex < 0 ||
    toIndex >= state.groups.length ||
    fromIndex === toIndex
  ) {
    return;
  }
  const nextGroups = [...state.groups];
  const [removed] = nextGroups.splice(fromIndex, 1);
  nextGroups.splice(toIndex, 0, removed);
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
    setMark,
    commitMarks,
    settings,
    setSetting,
    sheet: currentSheet,
    setSheet,
    jumpToday,
    createGroup,
    updateGroup,
    deleteGroup,
    undoDelete,
    reorderGroup,
    toast: currentToast,
    dismissToast,
    showToast,
    canInstall: Boolean(deferredInstallPrompt),
    installApp,
    share: shareLink,
  };
}
