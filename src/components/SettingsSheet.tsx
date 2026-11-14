import { useState, useMemo, useEffect } from "preact/hooks";
import type { Settings, ThemeName } from "../state/settings";
import type { Group } from "../state/hash";

function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

const DEFAULT_APP_SIZE = 85 * 1024; // ~85 KB bundle

function getLoadedAppSize(): number {
  if (typeof window === "undefined" || !window.performance)
    return DEFAULT_APP_SIZE;
  try {
    let total = 0;
    const nav = window.performance.getEntriesByType("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined;
    if (nav) {
      total +=
        nav.decodedBodySize || nav.encodedBodySize || nav.transferSize || 0;
    }
    const resources = window.performance.getEntriesByType(
      "resource",
    ) as PerformanceResourceTiming[];
    for (const r of resources) {
      const isAppResource =
        r.name.startsWith(window.location.origin) ||
        r.initiatorType === "script" ||
        r.initiatorType === "link" ||
        r.initiatorType === "css" ||
        r.initiatorType === "img";
      if (isAppResource) {
        total += r.decodedBodySize || r.encodedBodySize || r.transferSize || 0;
      }
    }
    return total > 1024 ? total : DEFAULT_APP_SIZE;
  } catch {
    return DEFAULT_APP_SIZE;
  }
}

function Switch(props: {
  checked: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      class="switch"
      role="switch"
      aria-checked={props.checked}
      aria-label={props.label}
      onClick={props.onToggle}
    />
  );
}

function Seg(props: {
  options: { v: string | number; label: string }[];
  value: string | number;
  onPick: (v: string | number) => void;
  label: string;
}) {
  return (
    <div class="seg" role="group" aria-label={props.label}>
      {props.options.map((o) => (
        <button
          key={String(o.v)}
          type="button"
          aria-pressed={o.v === props.value}
          onClick={() => props.onPick(o.v)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function SettingsSheet(props: {
  open: boolean;
  settings: Settings;
  notes: Record<string, string>;
  groups: Group[];
  onSet: <K extends keyof Settings>(k: K, v: Settings[K]) => void;
  onClose: () => void;
  onDeleteAllData: () => void;
  canInstall?: boolean;
  onInstall?: () => void;
  isSharedTemp?: boolean;
  onSaveShared?: () => void;
  onDiscardShared?: () => void;
}) {
  if (!props.open) return null;

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [appBytes, setAppBytes] = useState<number>(() => getLoadedAppSize());
  const [visible, setVisible] = useState({
    app: true,
    notes: true,
    entries: true,
    settings: true,
  });
  const s = props.settings;

  const toggleCategory = (k: "app" | "notes" | "entries" | "settings") => {
    setVisible((prev) => ({ ...prev, [k]: !prev[k] }));
  };

  useEffect(() => {
    let active = true;
    if (typeof caches !== "undefined") {
      caches
        .keys()
        .then(async (keys) => {
          let total = 0;
          for (const k of keys) {
            if (k.startsWith("caln")) {
              const cache = await caches.open(k);
              const reqs = await cache.keys();
              for (const req of reqs) {
                const res = await cache.match(req);
                if (res) {
                  const blob = await res.blob();
                  total += blob.size;
                }
              }
            }
          }
          if (active && total > 0) {
            setAppBytes(total);
          }
        })
        .catch(() => {});
    }
    return () => {
      active = false;
    };
  }, []);

  const storage = useMemo(() => {
    const hasNotes = Object.keys(props.notes || {}).length > 0;
    const notesBytes = hasNotes
      ? new Blob([JSON.stringify(props.notes)]).size
      : 0;
    const entriesBytes = new Blob([JSON.stringify(props.groups || [])]).size;
    const settingsBytes = new Blob([JSON.stringify(props.settings || {})]).size;
    const totalBytes = appBytes + notesBytes + entriesBytes + settingsBytes;

    const activeSum =
      (visible.app ? appBytes : 0) +
      (visible.notes ? notesBytes : 0) +
      (visible.entries ? entriesBytes : 0) +
      (visible.settings ? settingsBytes : 0);

    const appPct =
      visible.app && activeSum > 0 ? (appBytes / activeSum) * 100 : 0;
    const notesPct =
      visible.notes && activeSum > 0 ? (notesBytes / activeSum) * 100 : 0;
    const entriesPct =
      visible.entries && activeSum > 0 ? (entriesBytes / activeSum) * 100 : 0;
    const settingsPct =
      visible.settings && activeSum > 0 ? (settingsBytes / activeSum) * 100 : 0;

    return {
      appBytes,
      notesBytes,
      entriesBytes,
      settingsBytes,
      totalBytes,
      appPct,
      notesPct,
      entriesPct,
      settingsPct,
    };
  }, [appBytes, props.notes, props.groups, props.settings, visible]);
  return (
    <>
      <div class="ovl" onClick={props.onClose} />
      <div class="sheet" role="dialog" aria-modal="true" aria-label="Settings">
        <div class="sh-head">
          <b>Settings</b>
          <button
            type="button"
            class="icon-btn"
            aria-label="Close"
            onClick={props.onClose}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div class="sh-body">
          <div class="sh-row">
            <span>Theme</span>
            <Seg
              label="Theme"
              value={s.theme}
              onPick={(v) => props.onSet("theme", v as ThemeName)}
              options={[
                { v: "system", label: "System" },
                { v: "light", label: "Light" },
                { v: "dark", label: "Dark" },
              ]}
            />
          </div>

          <div class="sh-row">
            <span>Lock calendar</span>
            <Switch
              checked={s.locked}
              label="Lock calendar (read-only)"
              onToggle={() => props.onSet("locked", !s.locked)}
            />
          </div>

          <div class="sh-row">
            <span>Start of week</span>
            <Seg
              label="Start of week"
              value={s.weekStart}
              onPick={(v) => props.onSet("weekStart", v as 0 | 1)}
              options={[
                { v: 0, label: "Sun" },
                { v: 1, label: "Mon" },
              ]}
            />
          </div>

          <div class="sh-row">
            <span>Skip weekends</span>
            <Switch
              checked={s.skipWeekends}
              label="Skip weekends"
              onToggle={() => props.onSet("skipWeekends", !s.skipWeekends)}
            />
          </div>

          <div class="sh-row">
            <span>Mark weekends in red</span>
            <Switch
              checked={s.weekendsRed}
              label="Mark weekends in red"
              onToggle={() => props.onSet("weekendsRed", !s.weekendsRed)}
            />
          </div>

          <div class="sh-row">
            <span>Highlight today</span>
            <Switch
              checked={s.highlightToday}
              label="Highlight today"
              onToggle={() => props.onSet("highlightToday", !s.highlightToday)}
            />
          </div>

          <div class="sh-row">
            <span>Hide calendar matrix</span>
            <Switch
              checked={s.hideMatrix}
              label="Hide calendar matrix"
              onToggle={() => props.onSet("hideMatrix", !s.hideMatrix)}
            />
          </div>

          {props.isSharedTemp && (
            <div class="sh-row">
              <span>Shared calendar (temp)</span>
              <div style={{ display: "flex", gap: "6px" }}>
                {props.onDiscardShared && (
                  <button
                    type="button"
                    class="sh-install-btn"
                    onClick={() => {
                      props.onDiscardShared?.();
                      props.onClose();
                    }}
                  >
                    Discard
                  </button>
                )}
                {props.onSaveShared && (
                  <button
                    type="button"
                    class="sh-install-btn"
                    style={{
                      background: "var(--text)",
                      color: "var(--bg)",
                      borderColor: "var(--text)",
                    }}
                    onClick={() => {
                      props.onSaveShared?.();
                      props.onClose();
                    }}
                  >
                    Add to calendar
                  </button>
                )}
              </div>
            </div>
          )}

          {props.canInstall && props.onInstall && (
            <div class="sh-row">
              <span>Install app</span>
              <button
                type="button"
                class="sh-install-btn"
                onClick={props.onInstall}
              >
                Install
              </button>
            </div>
          )}

          <div class="sh-storage-box">
            <div class="sh-storage-head">
              <span class="sh-storage-title">Storage</span>
              <span class="sh-storage-total">
                {formatBytes(storage.totalBytes)}
              </span>
            </div>
            <div
              class="sh-storage-bar"
              role="progressbar"
              aria-label="Storage breakdown"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={100}
            >
              {storage.appPct > 0 && (
                <div
                  class="sh-storage-seg sh-seg-app"
                  style={{ width: `${storage.appPct}%` }}
                  title={`App: ${formatBytes(storage.appBytes)} (${storage.appPct.toFixed(1)}%)`}
                />
              )}
              {storage.notesPct > 0 && (
                <div
                  class="sh-storage-seg sh-seg-notes"
                  style={{ width: `${storage.notesPct}%` }}
                  title={`Notes: ${formatBytes(storage.notesBytes)} (${storage.notesPct.toFixed(1)}%)`}
                />
              )}
              {storage.entriesPct > 0 && (
                <div
                  class="sh-storage-seg sh-seg-entries"
                  style={{ width: `${storage.entriesPct}%` }}
                  title={`Entries: ${formatBytes(storage.entriesBytes)} (${storage.entriesPct.toFixed(1)}%)`}
                />
              )}
              {storage.settingsPct > 0 && (
                <div
                  class="sh-storage-seg sh-seg-settings"
                  style={{ width: `${storage.settingsPct}%` }}
                  title={`Settings: ${formatBytes(storage.settingsBytes)} (${storage.settingsPct.toFixed(1)}%)`}
                />
              )}
            </div>
            <div class="sh-storage-legend">
              <div
                class="sh-storage-item"
                role="button"
                tabIndex={0}
                aria-pressed={visible.app}
                onClick={() => toggleCategory("app")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleCategory("app");
                  }
                }}
              >
                <span
                  class={`sh-storage-dot ${visible.app ? "sh-dot-app" : "sh-dot-off"}`}
                />
                <span class="sh-storage-label">App</span>
                <span class="sh-storage-val">
                  {formatBytes(storage.appBytes)}
                </span>
              </div>
              <div
                class="sh-storage-item"
                role="button"
                tabIndex={0}
                aria-pressed={visible.notes}
                onClick={() => toggleCategory("notes")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleCategory("notes");
                  }
                }}
              >
                <span
                  class={`sh-storage-dot ${visible.notes ? "sh-dot-notes" : "sh-dot-off"}`}
                />
                <span class="sh-storage-label">Notes</span>
                <span class="sh-storage-val">
                  {formatBytes(storage.notesBytes)}
                </span>
              </div>
              <div
                class="sh-storage-item"
                role="button"
                tabIndex={0}
                aria-pressed={visible.entries}
                onClick={() => toggleCategory("entries")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleCategory("entries");
                  }
                }}
              >
                <span
                  class={`sh-storage-dot ${visible.entries ? "sh-dot-entries" : "sh-dot-off"}`}
                />
                <span class="sh-storage-label">Entries</span>
                <span class="sh-storage-val">
                  {formatBytes(storage.entriesBytes)}
                </span>
              </div>
              <div
                class="sh-storage-item"
                role="button"
                tabIndex={0}
                aria-pressed={visible.settings}
                onClick={() => toggleCategory("settings")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleCategory("settings");
                  }
                }}
              >
                <span
                  class={`sh-storage-dot ${visible.settings ? "sh-dot-settings" : "sh-dot-off"}`}
                />
                <span class="sh-storage-label">Settings</span>
                <span class="sh-storage-val">
                  {formatBytes(storage.settingsBytes)}
                </span>
              </div>
            </div>
          </div>

          <div
            class="sh-row sh-last"
            style={{
              flexDirection: "column",
              alignItems: "stretch",
              gap: "10px",
            }}
          >
            {!confirmDelete ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                  width: "100%",
                }}
              >
                <div>
                  <div>Delete all data</div>
                  <div
                    style={{
                      fontSize: "11.5px",
                      color: "var(--muted)",
                      marginTop: "2px",
                    }}
                  >
                    Permanently delete all notes, entries, and settings
                  </div>
                </div>
                <button
                  type="button"
                  class="sh-install-btn sh-danger-btn"
                  onClick={() => setConfirmDelete(true)}
                >
                  Delete all
                </button>
              </div>
            ) : (
              <div class="sh-delete-confirm">
                <div class="sh-delete-warn">
                  Are you sure? All notes, calendar entries, and settings will
                  be permanently erased. This cannot be undone.
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    justifyContent: "flex-end",
                  }}
                >
                  <button
                    type="button"
                    class="sh-install-btn sh-btn-secondary"
                    onClick={() => setConfirmDelete(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    class="sh-install-btn sh-danger-btn"
                    onClick={() => {
                      setConfirmDelete(false);
                      props.onDeleteAllData();
                    }}
                  >
                    Yes, delete everything
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
