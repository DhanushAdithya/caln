import {
  daysInYear,
  matrixLayout,
  matrixMonthLabels,
  weekdayOf,
} from "../state/dates";
import { weekdayNarrow, monthNames } from "../ui/i18n";

/** Section 2 — year contribution matrix (display-only). */
export function Matrix(props: {
  year: number;
  weekStart: 0 | 1;
  skipWeekends: boolean;
  today: { y: number; idx: number };
  color: string;
  isMarked: (idx: number) => boolean;
}) {
  const L = matrixLayout(props.year, props.weekStart, props.skipWeekends);
  const labels = matrixMonthLabels(props.year, props.weekStart);
  const wdNames = weekdayNarrow();
  const monthNamesS = monthNames();
  const total = daysInYear(props.year);

  const cells: preact.JSX.Element[] = [];
  for (let idx = 0; idx < total; idx++) {
    const row = L.rowOf(weekdayOf(props.year, idx));
    if (row === 0) continue; // hidden weekend row
    const sameYear = props.year === props.today.y;
    const future =
      props.year > props.today.y || (sameYear && idx > props.today.idx);
    const cls =
      "mx-cell" +
      (future ? " f" : "") +
      (props.isMarked(idx) ? " mk" : "") +
      (sameYear && props.today.idx === idx ? " t" : "");
    cells.push(
      <span
        key={idx}
        class={cls}
        style={{
          gridColumn: L.colOf(idx) + 1, // +1: weekday-label column
          gridRow: row + 1, // +1: month-label row
          ...(props.isMarked(idx) ? { background: props.color } : null),
        }}
      />,
    );
  }

  return (
    <div class="scroll-x">
      <div
        class="mx"
        style={{
          gridTemplateColumns: `16px repeat(${L.colCount}, var(--mx))`,
          gridTemplateRows: `12px repeat(${L.rows.length}, var(--mx))`,
        }}
      >
        {labels.map((l) => (
          <span
            key={`m${l.m}`}
            class="mx-lab"
            style={{ gridColumn: `${l.col + 2} / span 2`, gridRow: 1 }}
          >
            {monthNamesS[l.m]}
          </span>
        ))}
        {L.rows.map((wd, i) => (
          <span key={`w${wd}`} class="mx-wd" style={{ gridRow: i + 2 }}>
            {wdNames[wd]}
          </span>
        ))}
        {cells}
      </div>
    </div>
  );
}
