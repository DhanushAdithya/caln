import { useState } from "preact/hooks";
import { PALETTE } from "./state/palette";
import { todayRef } from "./state/dates";
import { Header } from "./components/Header";
import { GroupSelect } from "./components/GroupSelect";
import { YearSelect } from "./components/YearSelect";
import { Matrix } from "./components/Matrix";
import { MonthTabs } from "./components/MonthTabs";
import { MonthGrid } from "./components/MonthGrid";
import { Notes } from "./components/Notes";
import { SettingsSheet } from "./components/SettingsSheet";
import { EditSheet } from "./components/EditSheet";
import { Toast } from "./components/Toast";
import { useStore } from "./state/store";

export function App() {
  const ui = useStore();
  const today = todayRef();
  const [selectedDate, setSelectedDate] = useState(() => ({
    y: today.y,
    m: today.m,
    d: today.d,
  }));
  const [locked, setLocked] = useState(() => {
    try {
      return localStorage.getItem("caln_locked") === "true";
    } catch {
      return false;
    }
  });
  const group = ui.groups[ui.sel];
  const hex = group ? PALETTE[group.color] : "var(--cell)";
  const isMarked = (y: number, idx: number) =>
    group ? ui.hasMark(ui.sel, y, idx) : false;

  return (
    <>
      <Header
        onGear={() => ui.setSheet(ui.sheet ? null : "settings")}
        onShare={ui.share}
      />
      <main class="wrap">
        <section class="row1">
          <GroupSelect
            groups={ui.groups}
            sel={ui.sel}
            onSelect={ui.setSel}
            onDelete={ui.deleteGroup}
            onEdit={() => ui.setSheet("groups")}
            onNew={() => ui.setSheet("groups")}
          />
          <div class="row1-right">
            <button
              type="button"
              class={`lock-btn${locked ? " on" : ""}`}
              onClick={() => {
                setLocked((l) => {
                  const next = !l;
                  try {
                    localStorage.setItem("caln_locked", String(next));
                  } catch {}
                  return next;
                });
              }}
              aria-label={
                locked ? "Unlock calendar entries" : "Lock calendar entries"
              }
              aria-pressed={locked}
              title={
                locked
                  ? "Calendar locked (read-only entries, notes enabled)"
                  : "Calendar unlocked (click to lock entries)"
              }
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <rect x="3" y="11" width="18" height="11" />
                {locked ? (
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                ) : (
                  <path d="M7 11V7a5 5 0 0 1 9.9-1" />
                )}
              </svg>
            </button>
            <button
              type="button"
              class="today-btn"
              onClick={() => {
                ui.jumpToday();
                const t = todayRef();
                setSelectedDate({ y: t.y, m: t.m, d: t.d });
              }}
              aria-label="Jump to today"
            >
              Today
            </button>
            <YearSelect year={ui.year} onSet={ui.setYear} />
          </div>
        </section>

        <Matrix
          year={ui.year}
          weekStart={ui.settings.weekStart}
          skipWeekends={ui.settings.skipWeekends}
          today={today}
          color={hex}
          isMarked={(idx) => isMarked(ui.year, idx)}
          selectedDate={selectedDate}
          onSelectDate={(y, m, d) => setSelectedDate({ y, m, d })}
          onSelectMonth={ui.setMonth}
        />

        <MonthTabs month={ui.month} onSet={ui.setMonth} />

        <MonthGrid
          year={ui.year}
          month={ui.month}
          weekStart={ui.settings.weekStart}
          skipWeekends={ui.settings.skipWeekends}
          highlightToday={ui.settings.highlightToday}
          weekendsRed={ui.settings.weekendsRed}
          color={hex}
          today={today}
          isMarked={isMarked}
          selectedDate={selectedDate}
          onSelectDate={(y, m, d) => setSelectedDate({ y, m, d })}
          onPrevMonth={ui.prevMonth}
          onNextMonth={ui.nextMonth}
          onToggle={(y, idx) => ui.toggle(ui.sel, y, idx)}
          onSetMark={(y, idx, val, push) =>
            ui.setMark(ui.sel, y, idx, val, push)
          }
          onCommitMarks={ui.commitMarks}
          locked={locked}
        />

        <Notes
          year={selectedDate.y}
          month={selectedDate.m}
          day={selectedDate.d}
        />
      </main>

      <SettingsSheet
        open={ui.sheet === "settings"}
        settings={ui.settings}
        onSet={ui.setSetting}
        onClose={() => ui.setSheet(null)}
        canInstall={ui.canInstall}
        onInstall={ui.installApp}
        isSharedTemp={ui.isSharedTemp}
        onSaveShared={ui.saveSharedToLocal}
        onDiscardShared={ui.discardShared}
      />

      <EditSheet
        open={ui.sheet === "groups"}
        groups={ui.groups}
        activeId={group ? group.id : null}
        onClose={() => ui.setSheet(null)}
        onCreate={(name, color) => ui.createGroup(name, color)}
        onUpdate={ui.updateGroup}
        onDelete={ui.deleteGroup}
        onReorder={ui.reorderGroup}
      />

      <Toast toast={ui.toast} onDismiss={ui.dismissToast} />
    </>
  );
}
