import type { Settings, ThemeName } from "../state/settings";

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
  onSet: <K extends keyof Settings>(k: K, v: Settings[K]) => void;
  onClose: () => void;
  canInstall?: boolean;
  onInstall?: () => void;
}) {
  if (!props.open) return null;
  const s = props.settings;
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

        <div class="sh-row sh-last">
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

        {props.canInstall && props.onInstall && (
          <div class="sh-row sh-last">
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
      </div>
    </>
  );
}
