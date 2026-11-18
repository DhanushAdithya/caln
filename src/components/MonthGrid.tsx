import { useEffect, useMemo, useRef } from "preact/hooks";
import {
  dayOfMonth,
  daysInMonth,
  isWeekend,
  monthGrid,
  ymdToIdx,
} from "../state/dates";
import { monthTitle, weekdayLong, weekdayShort } from "../ui/i18n";
import { onColor, getHeatColor, getHeatTextColor } from "../state/palette";
import type { WeekStart } from "../state/dates";
import type { GroupVariant } from "../state/hash";

function makeSplitGradient(colors: string[]): string {
  if (colors.length === 0) return "";
  if (colors.length === 1) return colors[0];
  const step = 100 / colors.length;
  const stops = colors.map((c, i) => {
    const start = (i * step).toFixed(2);
    const end = ((i + 1) * step).toFixed(2);
    return `${c} ${start}%, ${c} ${end}%`;
  });
  return `linear-gradient(to bottom, ${stops.join(", ")})`;
}

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
  groupVariant?: GroupVariant;
  getDayValue?: (y: number, idx: number) => number;
  maxVal?: number;
  onIncrement?: (y: number, idx: number) => void;
  onResetMark?: (y: number, idx: number) => void;
  selectedDate?: { y: number; m: number; d: number };
  onSelectDate?: (y: number, m: number, d: number) => void;
  onPrevMonth?: () => void;
  onNextMonth?: () => void;
  onToggle: (y: number, idx: number) => void;
  onSetMark?: (
    y: number,
    idx: number,
    value: boolean,
    pushHash?: boolean,
  ) => void;
  onCommitMarks?: () => void;
  locked?: boolean;
  showAll?: boolean;
  getDayColors?: (y: number, idx: number) => string[];
}) {
  const isPointerDragging = useRef(false);
  const dragTargetValue = useRef<boolean>(true);
  const dragStartedCell = useRef<{ y: number; idx: number } | null>(null);
  const hasDragMoved = useRef(false);
  const longPressTimer = useRef<number | null>(null);
  const isLongPressed = useRef(false);
  const dragStartPos = useRef<{ x: number; y: number } | null>(null);
  const visitedFreqCells = useRef<Set<string>>(new Set());

  const clearLongPress = () => {
    if (longPressTimer.current !== null) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  useEffect(() => {
    const handleGlobalUp = () => {
      clearLongPress();
      if (isPointerDragging.current) {
        isPointerDragging.current = false;
        if (hasDragMoved.current) {
          props.onCommitMarks?.();
        }
      }
      dragStartedCell.current = null;
      hasDragMoved.current = false;
      dragStartPos.current = null;
      visitedFreqCells.current.clear();
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
      const el = document.querySelectorAll<HTMLButtonElement>(".mg-d")[next];
      el?.focus();
    }
  };

  const isFreqGroup = props.groupVariant === "frequency" && !props.showAll;
  const max = props.maxVal && props.maxVal > 0 ? props.maxVal : 1;

  return (
    <section class="mg-wrap" aria-label="Month calendar view">
      <div class="mg-head">
        <h2 class="mg-title">{monthTitle(props.year, props.month)}</h2>
        <div
          class="mg-progress"
          role="progressbar"
          aria-valuenow={stats.pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${stats.pct}% marked (${stats.selected} of ${stats.total} days)`}
          title={`${stats.pct}% (${stats.selected}/${stats.total})`}
        >
          <div
            class="mg-progress-fill"
            style={{
              width: `${stats.pct}%`,
              background: props.showAll ? "var(--text)" : props.color,
            }}
          />
        </div>
        <div class="mg-nav">
          <button
            type="button"
            class="mg-nav-btn"
            onClick={props.onPrevMonth}
            aria-label="Previous month"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M10 3.5L5.5 8l4.5 4.5"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
          <button
            type="button"
            class="mg-nav-btn"
            onClick={props.onNextMonth}
            aria-label="Next month"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M6 3.5L10.5 8 6 12.5"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
      <div
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
          const dayColors =
            props.showAll && props.getDayColors
              ? props.getDayColors(c.ref.y, c.ref.idx)
              : null;

          const freqVal = props.getDayValue
            ? props.getDayValue(c.ref.y, c.ref.idx)
            : props.isMarked(c.ref.y, c.ref.idx)
              ? 1
              : 0;

          const marked = dayColors ? dayColors.length > 0 : freqVal > 0;

          let bg = props.color;
          let cellTextColor = on;
          let cellTextShadow: string | undefined;

          if (dayColors && dayColors.length > 0) {
            bg = makeSplitGradient(dayColors);
            if (dayColors.length === 1) {
              cellTextColor = onColor(dayColors[0]);
            } else {
              cellTextColor = "#ffffff";
              cellTextShadow = "0 1px 2px rgba(0, 0, 0, 0.75)";
            }
          } else if (isFreqGroup && marked) {
            let level = 1;
            if (max > 1) {
              const ratio = freqVal / max;
              if (ratio > 0.75) level = 4;
              else if (ratio > 0.5) level = 3;
              else if (ratio > 0.25) level = 2;
              else level = 1;
            } else {
              level = 4;
            }
            bg = getHeatColor(props.color, level);
            cellTextColor = getHeatTextColor(props.color, level);
          }

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

          const ariaLabel =
            isFreqGroup && marked
              ? `${d} ${long[c.wd]}: ${freqVal}`
              : `${d} ${long[c.wd]}`;

          return (
            <button
              key={c.slot}
              type="button"
              class={cls}
              style={{
                gridColumn: c.col + 1,
                ...(marked
                  ? {
                      background: bg,
                      color: cellTextColor,
                      ...(cellTextShadow
                        ? { textShadow: cellTextShadow }
                        : null),
                    }
                  : null),
              }}
              aria-pressed={marked}
              aria-label={ariaLabel}
              onContextMenu={(e) => {
                e.preventDefault();
              }}
              onPointerDown={(e) => {
                if (props.locked) return;
                if (e.pointerType === "mouse" && e.button !== 0) return;
                isLongPressed.current = false;
                hasDragMoved.current = false;
                dragStartPos.current = { x: e.clientX, y: e.clientY };

                const cellY = c.ref.y;
                const cellIdx = c.ref.idx;

                clearLongPress();
                longPressTimer.current = window.setTimeout(() => {
                  isLongPressed.current = true;
                  props.onResetMark?.(cellY, cellIdx);
                }, 500);

                if (isFreqGroup) {
                  isPointerDragging.current = true;
                  visitedFreqCells.current = new Set([`${cellY}-${cellIdx}`]);
                } else {
                  if (e.pointerType === "mouse") {
                    const currentlyMarked = props.isMarked(cellY, cellIdx);
                    isPointerDragging.current = true;
                    dragTargetValue.current = !currentlyMarked;
                    dragStartedCell.current = { y: cellY, idx: cellIdx };
                  }
                }
              }}
              onPointerMove={(e) => {
                if (dragStartPos.current) {
                  const dx = Math.abs(e.clientX - dragStartPos.current.x);
                  const dy = Math.abs(e.clientY - dragStartPos.current.y);
                  if (dx > 8 || dy > 8) {
                    clearLongPress();
                  }
                }
              }}
              onPointerEnter={(e) => {
                if (props.locked || !isPointerDragging.current) return;
                clearLongPress();
                hasDragMoved.current = true;

                if (isFreqGroup) {
                  const key = `${c.ref.y}-${c.ref.idx}`;
                  if (!visitedFreqCells.current.has(key)) {
                    visitedFreqCells.current.add(key);
                    props.onIncrement?.(c.ref.y, c.ref.idx);
                  }
                } else if (e.pointerType === "mouse") {
                  if (dragStartedCell.current) {
                    props.onSetMark?.(
                      dragStartedCell.current.y,
                      dragStartedCell.current.idx,
                      dragTargetValue.current,
                      false,
                    );
                    dragStartedCell.current = null;
                  }
                  props.onSetMark?.(
                    c.ref.y,
                    c.ref.idx,
                    dragTargetValue.current,
                    false,
                  );
                }
              }}
              onPointerUp={() => {
                clearLongPress();
              }}
              onPointerCancel={() => {
                clearLongPress();
                isLongPressed.current = false;
              }}
              onClick={(e) => {
                clearLongPress();
                if (isLongPressed.current) {
                  isLongPressed.current = false;
                  e.preventDefault();
                  return;
                }
                if (hasDragMoved.current) {
                  e.preventDefault();
                  return;
                }
                props.onSelectDate?.(c.ref.y, c.m, d);
                if (!props.locked) {
                  if (isFreqGroup) {
                    props.onIncrement?.(c.ref.y, c.ref.idx);
                  } else {
                    props.onToggle(c.ref.y, c.ref.idx);
                  }
                }
              }}
              onKeyDown={(e) => onKeyDown(e, i)}
            >
              {d}
              {isFreqGroup && freqVal > 0 && (
                <span class="mg-badge">{freqVal}</span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
