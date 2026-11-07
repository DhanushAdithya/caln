import { PALETTE } from "./state/palette";
import { todayRef } from "./state/dates";
import { Header } from "./components/Header";
import { GroupSelect } from "./components/GroupSelect";
import { YearSelect } from "./components/YearSelect";
import { Matrix } from "./components/Matrix";
import { MonthTabs } from "./components/MonthTabs";
import { MonthGrid } from "./components/MonthGrid";
import { SettingsSheet } from "./components/SettingsSheet";
import { EditSheet } from "./components/EditSheet";
import { Toast } from "./components/Toast";
import { useStore } from "./state/store";

export function App() {
  const ui = useStore();
  const today = todayRef();
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
          <YearSelect
            year={ui.year}
            onSet={ui.setYear}
            onToday={ui.jumpToday}
          />
        </section>

        <Matrix
          year={ui.year}
          weekStart={ui.settings.weekStart}
          skipWeekends={ui.settings.skipWeekends}
          today={today}
          color={hex}
          isMarked={(idx) => isMarked(ui.year, idx)}
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
          onToggle={(y, idx) => ui.toggle(ui.sel, y, idx)}
          onSetMark={(y, idx, val, push) =>
            ui.setMark(ui.sel, y, idx, val, push)
          }
          onCommitMarks={ui.commitMarks}
        />
      </main>

      <SettingsSheet
        open={ui.sheet === "settings"}
        settings={ui.settings}
        onSet={ui.setSetting}
        onClose={() => ui.setSheet(null)}
        canInstall={ui.canInstall}
        onInstall={ui.installApp}
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
