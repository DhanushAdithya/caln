import { PALETTE } from "./state/palette";
import { todayRef } from "./state/dates";
import { Header } from "./components/Header";
import { GroupSelect } from "./components/GroupSelect";
import { YearSelect } from "./components/YearSelect";
import { Matrix } from "./components/Matrix";
import { MonthTabs } from "./components/MonthTabs";
import { MonthGrid } from "./components/MonthGrid";
import { SettingsSheet } from "./components/SettingsSheet";
import { useMockState } from "./ui/mockState";

export function App() {
  const ui = useMockState();
  const today = todayRef();
  const group = ui.groups[ui.sel] ?? ui.groups[0];
  const hex = PALETTE[group.color];
  const isMarked = (y: number, idx: number) => ui.hasMark(ui.sel, y, idx);

  return (
    <>
      <Header onGear={() => ui.setSheet(ui.sheet ? null : "settings")} />
      <main class="wrap">
        <section class="row1">
          <GroupSelect groups={ui.groups} sel={ui.sel} onSelect={ui.setSel} />
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
        />
      </main>

      <SettingsSheet
        open={ui.sheet === "settings"}
        settings={ui.settings}
        onSet={ui.setSetting}
        onClose={() => ui.setSheet(null)}
      />
    </>
  );
}
