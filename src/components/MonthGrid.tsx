import { useEffect, useMemo, useRef } from "preact/hooks";
import {
  dayOfMonth,
  daysInMonth,
  isWeekend,
  monthGrid,
  ymdToIdx,
} from "../state/dates";
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
  selectedDate?: { y: number; m: number; d: number };
  onSelectDate?: (y: number, m: number, d: number) => void;
  onToggle: (y: number, idx: number) => void;
  onSetMark?: (
    y: number,
    idx: number,
    value: boolean,
    pushHash?: boolean,
  ) => void;
  onCommitMarks?: () => void;
}) {
  const gridRef = useRef<HTMLDivElement>(null);
  const isPointerDragging = useRef(false);
  const dragTargetValue = useRef<boolean>(true);
  const dragStartedCell = useRef<{ y: number; idx: number } | null>(null);
  const hasDragMoved = useRef(false);

  useEffect(() => {
    const handleGlobalUp = () => {
      if (isPointerDragging.current) {
        isPointerDragging.current = false;
        if (hasDragMoved.current) {
          props.onCommitMarks?.();
        }
      }
      dragStartedCell.current = null;
      hasDragMoved.current = false;
    };
    window.addEventListener("pointerup", handleGlobalUp);
    window.addEventListener("pointercancel", handleGlobalUp);
    return () => {
      window.removeEventListener("pointerup", handleGlobalUp);
      window.removeEventListener("pointercancel", handleGlobalUp);
    };
  }, [props.onCommitMarks]);

  const spec = useMemo(
    () =>
      monthGrid(props.year, props.month, props.weekStart, props.skipWeekends),
    [props.year, props.month, props.weekStart, props.skipWeekends],
  );
  const head = useMemo(() => weekdayShort(), []);
  const long = useMemo(() => weekdayLong(), []);
  const on = onColor(props.color);

  const stats = useMemo(() => {
    const totalDays = daysInMonth(props.year, props.month);
    let total = 0;
    let selected = 0;
    for (let d = 1; d <= totalDays; d++) {
      const idx = ymdToIdx(props.year, props.month, d);
      if (props.skipWeekends && isWeekend(props.year, idx)) continue;
      total++;
      if (props.isMarked(props.year, idx)) {
        selected++;
      }
    }
    const pct = total > 0 ? Math.round((selected / total) * 100) : 0;
    return { selected, total, pct };
  }, [props.year, props.month, props.skipWeekends, props.isMarked]);

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
        <span class="mg-stat">
          <span class="mg-stat-pct">{stats.pct}%</span>
          <span class="mg-stat-count">
            ({stats.selected}/{stats.total})
          </span>
        </span>
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
          const isSelected =
            props.selectedDate &&
            props.selectedDate.y === c.ref.y &&
            props.selectedDate.m === c.m &&
            props.selectedDate.d === d;
          const cls =
            "mg-d" +
            (c.inMonth ? "" : " out") +
            (props.weekendsRed && weekend ? " wk" : "") +
            (marked ? " mk" : "") +
            (today ? " t" : "") +
            (isSelected ? " sel" : "");
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
              onPointerDown={(e) => {
                if (e.pointerType !== "mouse" || e.button !== 0) return;
                const currentlyMarked = props.isMarked(c.ref.y, c.ref.idx);
                isPointerDragging.current = true;
                dragTargetValue.current = !currentlyMarked;
                dragStartedCell.current = { y: c.ref.y, idx: c.ref.idx };
                hasDragMoved.current = false;
              }}
              onPointerEnter={(e) => {
                if (!isPointerDragging.current || e.pointerType !== "mouse")
                  return;
                if (!hasDragMoved.current && dragStartedCell.current) {
                  hasDragMoved.current = true;
                  props.onSetMark?.(
                    dragStartedCell.current.y,
                    dragStartedCell.current.idx,
                    dragTargetValue.current,
                    false,
                  );
                }
                props.onSetMark?.(
                  c.ref.y,
                  c.ref.idx,
                  dragTargetValue.current,
                  false,
                );
              }}
              onClick={(e) => {
                if (hasDragMoved.current) {
                  e.preventDefault();
                  return;
                }
                props.onSelectDate?.(c.ref.y, c.m, d);
                props.onToggle(c.ref.y, c.ref.idx);
              }}
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
