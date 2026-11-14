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
import { StatSheet } from "./components/StatSheet";
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
  const [showAll, setShowAll] = useState(false);
  const group = ui.groups[ui.sel];
  const hex = group ? PALETTE[group.color] : "var(--cell)";
  const isMarked = (y: number, idx: number) =>
    group ? ui.hasMark(ui.sel, y, idx) : false;
  const isAnyMarked = (y: number, idx: number) => {
    for (let i = 0; i < ui.groups.length; i++) {
      if (ui.hasMark(i, y, idx)) return true;
    }
    return false;
  };
  const getDayColors = (y: number, idx: number): string[] => {
    const colors: string[] = [];
    for (let i = 0; i < ui.groups.length; i++) {
      if (ui.hasMark(i, y, idx)) {
        colors.push(PALETTE[ui.groups[i].color]);
      }
    }
    return colors;
  };

  return (
    <>
      <Header
        onGear={() => ui.setSheet(ui.sheet ? null : "settings")}
        onShare={ui.share}
      />
      <main class="wrap">
        <section class="row1">
          <div class="row1-left">
            <GroupSelect
              groups={ui.groups}
              sel={ui.sel}
              onSelect={(idx) => {
                ui.setSel(idx);
                setShowAll(false);
              }}
              onDelete={ui.deleteGroup}
              onEdit={() => ui.setSheet("groups")}
              onNew={() => ui.setSheet("groups")}
            />
            <button
              type="button"
              class={`all-btn${showAll ? " on" : ""}`}
              onClick={() => setShowAll((v) => !v)}
              aria-pressed={showAll}
              aria-label={showAll ? "Show selected group" : "Show all groups"}
              title={
                showAll
                  ? "Showing all groups combined (click to switch to single group)"
                  : "Show all groups combined"
              }
            >
              All
            </button>
            <button
              type="button"
              class={`stat-btn${ui.sheet === "stats" ? " on" : ""}`}
              onClick={() => ui.setSheet(ui.sheet === "stats" ? null : "stats")}
              aria-label="Statistics"
              title="View statistics"
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
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
            </button>
          </div>
          <div class="row1-right">
            <button
              type="button"
              class="today-btn"
              onClick={() => {
                ui.jumpToday();
                const t = todayRef();
                setSelectedDate({ y: t.y, m: t.m, d: t.d });
              }}
              aria-label="Jump to today"
              title="Jump to today"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <rect x="3" y="4" width="18" height="18" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
                <text
                  x="12"
                  y="16"
                  text-anchor="middle"
                  dominant-baseline="central"
                  fill="currentColor"
                  stroke="none"
                  font-size="9"
                  font-weight="700"
                  font-family="system-ui, -apple-system, sans-serif"
                >
                  {today.d}
                </text>
              </svg>
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
          isMarked={(idx) =>
            showAll ? isAnyMarked(ui.year, idx) : isMarked(ui.year, idx)
          }
          selectedDate={selectedDate}
          onSelectDate={(y, m, d) => setSelectedDate({ y, m, d })}
          onSelectMonth={ui.setMonth}
          showAll={showAll}
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
          isMarked={(y, idx) =>
            showAll ? isAnyMarked(y, idx) : isMarked(y, idx)
          }
          selectedDate={selectedDate}
          onSelectDate={(y, m, d) => setSelectedDate({ y, m, d })}
          onPrevMonth={ui.prevMonth}
          onNextMonth={ui.nextMonth}
          onToggle={(y, idx) => ui.toggle(ui.sel, y, idx)}
          onSetMark={(y, idx, val, push) =>
            ui.setMark(ui.sel, y, idx, val, push)
          }
          onCommitMarks={ui.commitMarks}
          locked={ui.settings.locked}
          showAll={showAll}
          getDayColors={getDayColors}
        />

        <Notes
          year={selectedDate.y}
          month={selectedDate.m}
          day={selectedDate.d}
          locked={ui.settings.locked}
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

      <StatSheet
        open={ui.sheet === "stats"}
        onClose={() => ui.setSheet(null)}
        year={ui.year}
        month={ui.month}
        groups={ui.groups}
        activeGroupIndex={ui.sel}
        showAll={showAll}
        color={hex}
      />

      <Toast toast={ui.toast} onDismiss={ui.dismissToast} />
    </>
  );
}
