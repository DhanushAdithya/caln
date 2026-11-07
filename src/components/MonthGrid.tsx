import { useMemo, useRef } from "preact/hooks";
import { dayOfMonth, monthGrid } from "../state/dates";
import { monthTitle, weekdayLong, weekdayShort } from "../ui/i18n";
import { onColor } from "../state/palette";
import type { WeekStart } from "../state/dates";

export function MonthGrid(props: {
  year: number;
  month: number;
  weekStart: WeekStart;
  skipWeekends: boolean;
  highlightToday: boolean;
  weekendsRed: boolean;
  color: string;
  today: { y: number; idx: number };
  isMarked: (y: number, idx: number) => boolean;
  onToggle: (y: number, idx: number) => void;
}) {
  const gridRef = useRef<HTMLDivElement>(null);
  const spec = useMemo(
    () =>
      monthGrid(props.year, props.month, props.weekStart, props.skipWeekends),
    [props.year, props.month, props.weekStart, props.skipWeekends],
  );
  const head = useMemo(() => weekdayShort(), []);
  const long = useMemo(() => weekdayLong(), []);
  const on = onColor(props.color);

  const onKeyDown = (e: KeyboardEvent, i: number) => {
    let next: number | null = null;
    if (e.key === "ArrowLeft") next = i > 0 ? i - 1 : null;
    else if (e.key === "ArrowRight")
      next = i < spec.cells.length - 1 ? i + 1 : null;
    else if (e.key === "ArrowUp")
      next = i - spec.cols >= 0 ? i - spec.cols : null;
    else if (e.key === "ArrowDown")
      next = i + spec.cols < spec.cells.length ? i + spec.cols : null;
    if (next !== null) {
      e.preventDefault();
      const btns =
        gridRef.current?.querySelectorAll<HTMLButtonElement>(".mg-d");
      btns?.[next]?.focus();
    }
  };

  return (
    <section class="mg-sec" aria-label={monthTitle(props.year, props.month)}>
      <div class="mg-head">
        <h2 class="mg-title">{monthTitle(props.year, props.month)}</h2>
      </div>
      <div
        ref={gridRef}
        class="mg"
        style={{ gridTemplateColumns: `repeat(${spec.cols}, 1fr)` }}
      >
        {Array.from({ length: spec.cols }, (_, i) => {
          const wd = spec.cells.find((c) => c.col === i)?.wd;
          return (
            <span key={`h${i}`} class="mg-wd">
              {wd === undefined ? "" : head[wd]}
            </span>
          );
        })}
        {spec.cells.map((c, i) => {
          const d = dayOfMonth(c.ref.y, c.ref.idx);
          const marked = props.isMarked(c.ref.y, c.ref.idx);
          const weekend = c.wd === 0 || c.wd === 6;
          const today =
            props.highlightToday &&
            c.ref.y === props.today.y &&
            c.ref.idx === props.today.idx;
          const cls =
            "mg-d" +
            (c.inMonth ? "" : " out") +
            (props.weekendsRed && weekend ? " wk" : "") +
            (marked ? " mk" : "") +
            (today ? " t" : "");
          return (
            <button
              key={c.slot}
              type="button"
              class={cls}
              style={{
                gridColumn: c.col + 1,
                ...(marked ? { background: props.color, color: on } : null),
              }}
              aria-pressed={marked}
              aria-label={`${d} ${long[c.wd]}`}
              onClick={() => props.onToggle(c.ref.y, c.ref.idx)}
              onKeyDown={(e) => onKeyDown(e, i)}
            >
              {d}
            </button>
          );
        })}
      </div>
    </section>
  );
}
