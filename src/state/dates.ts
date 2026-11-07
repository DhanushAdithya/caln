export type WeekStart = 0 | 1;

const MS_DAY = 86_400_000;
const MLEN = [31, 0, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;

export function isLeap(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

export function daysInYear(y: number): number {
  return isLeap(y) ? 366 : 365;
}

export function daysInMonth(y: number, m: number): number {
  if (m === 1) return isLeap(y) ? 29 : 28;
  return MLEN[m];
}

export function monthStarts(y: number): number[] {
  const s: number[] = [];
  let a = 0;
  for (let m = 0; m < 12; m++) {
    s.push(a);
    a += daysInMonth(y, m);
  }
  return s;
}

export function ymdToIdx(y: number, m: number, d: number): number {
  return monthStarts(y)[m] + d - 1;
}

export function monthOfYear(y: number, idx: number): number {
  const s = monthStarts(y);
  let m = 11;
  while (m > 0 && idx < s[m]) m--;
  return m;
}

export function dayOfMonth(y: number, idx: number): number {
  const s = monthStarts(y);
  return idx - s[monthOfYear(y, idx)] + 1;
}

export function jan1Weekday(y: number): number {
  return ((Math.round(Date.UTC(y, 0, 1) / MS_DAY) % 7) + 11) % 7;
}

export function weekdayOf(y: number, idx: number): number {
  return (jan1Weekday(y) + idx) % 7;
}

export function isWeekend(y: number, idx: number): boolean {
  const wd = weekdayOf(y, idx);
  return wd === 0 || wd === 6;
}

export function todayRef(): { y: number; m: number; d: number; idx: number } {
  const t = new Date();
  return {
    y: t.getFullYear(),
    m: t.getMonth(),
    d: t.getDate(),
    idx: ymdToIdx(t.getFullYear(), t.getMonth(), t.getDate()),
  };
}

export function jan1Offset(y: number, weekStart: WeekStart): number {
  return (jan1Weekday(y) - weekStart + 7) % 7;
}

export function visibleWeekOrder(
  weekStart: WeekStart,
  skipWeekends: boolean,
): number[] {
  const out: number[] = [];
  for (let i = 0; i < 7; i++) {
    const wd = (weekStart + i) % 7;
    if (skipWeekends && (wd === 0 || wd === 6)) continue;
    out.push(wd);
  }
  return out;
}

export interface MatrixLayout {
  colCount: number;
  rows: number[];
  rowOf(wd: number): number;
  colOf(idx: number): number;
}

export function matrixLayout(
  y: number,
  weekStart: WeekStart,
  skipWeekends: boolean,
): MatrixLayout {
  const o = jan1Offset(y, weekStart);
  const rows = visibleWeekOrder(weekStart, skipWeekends);
  const colCount = Math.ceil((o + daysInYear(y)) / 7);
  return {
    colCount,
    rows,
    rowOf: (wd) => rows.indexOf(wd) + 1,
    colOf: (idx) => Math.floor((idx + o) / 7) + 1,
  };
}

export function matrixMonthLabels(
  y: number,
  weekStart: WeekStart,
): { m: number; col: number }[] {
  const o = jan1Offset(y, weekStart);
  const starts = monthStarts(y);
  const out: { m: number; col: number }[] = [];
  let prev = -99;
  for (let m = 0; m < 12; m++) {
    const inCol = (starts[m] + o) % 7;
    let col = Math.floor((starts[m] + o) / 7);
    if (inCol > 3) col--;
    col = Math.max(0, col);
    if (col > prev) {
      out.push({ m, col });
      prev = col;
    }
  }
  return out;
}

export interface GridCell {
  slot: number;
  wd: number;
  col: number;
  ref: { y: number; idx: number };
  inMonth: boolean;
  m: number;
}

export interface MonthGridSpec {
  cols: number;
  cells: GridCell[];
}

export function monthGrid(
  y: number,
  m: number,
  weekStart: WeekStart,
  skipWeekends: boolean,
): MonthGridSpec {
  const order = visibleWeekOrder(weekStart, skipWeekends);
  const colMap = new Map<number, number>();
  order.forEach((wd, i) => colMap.set(wd, i));
  const starts = monthStarts(y);
  const first = starts[m];
  const len = daysInMonth(y, m);
  const s1 = first + jan1Offset(y, weekStart);
  const r0 = Math.floor(s1 / 7);
  const r1 = Math.floor((s1 + len - 1) / 7);
  const cells: GridCell[] = [];
  for (let r = r0; r <= r1; r++) {
    const row: GridCell[] = [];
    let hasMonth = false;
    for (let s = r * 7; s < r * 7 + 7; s++) {
      const wd = (weekStart + s) % 7;
      if (skipWeekends && (wd === 0 || wd === 6)) continue;
      let ry = y;
      let ri = s - jan1Offset(y, weekStart);
      while (ri < 0) {
        ry--;
        ri += daysInYear(ry);
      }
      while (ri >= daysInYear(ry)) {
        ri -= daysInYear(ry);
        ry++;
      }
      const rm = monthOfYear(ry, ri);
      const inMonth = ry === y && rm === m;
      if (inMonth) hasMonth = true;
      const col = colMap.get(wd);
      if (col === undefined) continue;
      row.push({ slot: s, wd, col, ref: { y: ry, idx: ri }, inMonth, m: rm });
    }
    if (hasMonth) cells.push(...row);
  }
  return { cols: order.length, cells };
}
