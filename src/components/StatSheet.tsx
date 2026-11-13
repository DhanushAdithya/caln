import { useMemo, useState } from "preact/hooks";
import {
  dayOfMonth,
  daysInMonth,
  daysInYear,
  monthOfYear,
  monthStarts,
  ymdToIdx,
} from "../state/dates";
import { monthNames, monthTitle } from "../ui/i18n";
import { isDayMarked } from "../state/hash";
import type { Group } from "../state/hash";

interface StreakInfo {
  count: number;
  start: { y: number; m: number; d: number } | null;
  end: { y: number; m: number; d: number } | null;
}

function computeLongestStreak(
  groups: Group[],
  activeGroupIndex: number,
  showAll: boolean,
  currentYear: number,
): StreakInfo {
  const targetGroups = showAll
    ? groups
    : [groups[activeGroupIndex]].filter(Boolean);
  if (targetGroups.length === 0) {
    return { count: 0, start: null, end: null };
  }

  const yearSet = new Set<number>();
  yearSet.add(currentYear);
  for (const g of targetGroups) {
    if (g.years) {
      for (const yStr of Object.keys(g.years)) {
        yearSet.add(Number(yStr));
      }
    }
  }

  const sortedYears = Array.from(yearSet).sort((a, b) => a - b);
  const minYear = sortedYears[0];
  const maxYear = sortedYears[sortedYears.length - 1];

  let longest = 0;
  let longestStart: { y: number; m: number; d: number } | null = null;
  let longestEnd: { y: number; m: number; d: number } | null = null;

  let current = 0;
  let currentStart: { y: number; m: number; d: number } | null = null;
  let currentEnd: { y: number; m: number; d: number } | null = null;

  for (let y = minYear; y <= maxYear; y++) {
    const totalDays = daysInYear(y);
    for (let idx = 0; idx < totalDays; idx++) {
      let isMarkedOnDay = false;
      for (const g of targetGroups) {
        if (isDayMarked(g.years?.[y], idx)) {
          isMarkedOnDay = true;
          break;
        }
      }

      if (isMarkedOnDay) {
        current++;
        const m = monthOfYear(y, idx);
        const d = dayOfMonth(y, idx);
        if (current === 1) {
          currentStart = { y, m, d };
        }
        currentEnd = { y, m, d };
        if (current > longest) {
          longest = current;
          longestStart = currentStart;
          longestEnd = currentEnd;
        }
      } else {
        current = 0;
        currentStart = null;
        currentEnd = null;
      }
    }
  }

  return {
    count: longest,
    start: longestStart,
    end: longestEnd,
  };
}

export function StatSheet(props: {
  open: boolean;
  onClose: () => void;
  year: number;
  month: number;
  groups: Group[];
  activeGroupIndex: number;
  showAll: boolean;
  color: string;
}) {
  if (!props.open) return null;

  const [period, setPeriod] = useState<
    "daily" | "weekly" | "monthly" | "yearly"
  >("daily");

  const mNames = useMemo(() => monthNames(), []);
  const activeGroup = props.groups[props.activeGroupIndex];
  const strokeColor = props.showAll ? "var(--text)" : props.color;

  const targetGroups = props.showAll
    ? props.groups
    : [activeGroup].filter(Boolean);

  const dayEntryCount = (y: number, idx: number): number => {
    let count = 0;
    for (const g of targetGroups) {
      if (isDayMarked(g.years?.[y], idx)) {
        count++;
        if (!props.showAll) break;
      }
    }
    return count;
  };

  const chartData = useMemo(() => {
    if (period === "daily") {
      const len = daysInMonth(props.year, props.month);
      const points: { label: string; xLabel: string; value: number }[] = [];
      for (let d = 1; d <= len; d++) {
        const idx = ymdToIdx(props.year, props.month, d);
        const val = dayEntryCount(props.year, idx);
        points.push({
          label: `${mNames[props.month]} ${d}`,
          xLabel: d === 1 || d % 5 === 0 || d === len ? String(d) : "",
          value: val,
        });
      }
      return {
        subtitle: `${monthTitle(props.year, props.month)}`,
        points,
      };
    }

    if (period === "weekly") {
      const totalDays = daysInYear(props.year);
      const numWeeks = Math.ceil(totalDays / 7);
      const points: { label: string; xLabel: string; value: number }[] = [];
      for (let w = 0; w < numWeeks; w++) {
        let count = 0;
        const start = w * 7;
        const end = Math.min(start + 7, totalDays);
        for (let idx = start; idx < end; idx++) {
          count += dayEntryCount(props.year, idx);
        }
        points.push({
          label: `Week ${w + 1}`,
          xLabel:
            w === 0 || (w + 1) % 10 === 0 || w === numWeeks - 1
              ? `W${w + 1}`
              : "",
          value: count,
        });
      }
      return {
        subtitle: `Year ${props.year}`,
        points,
      };
    }

    if (period === "monthly") {
      const points: { label: string; xLabel: string; value: number }[] = [];
      for (let m = 0; m < 12; m++) {
        const start = monthStarts(props.year)[m];
        const len = daysInMonth(props.year, m);
        let count = 0;
        for (let d = 0; d < len; d++) {
          count += dayEntryCount(props.year, start + d);
        }
        points.push({
          label: mNames[m],
          xLabel: mNames[m],
          value: count,
        });
      }
      return {
        subtitle: `Year ${props.year}`,
        points,
      };
    }

    // yearly
    const yearSet = new Set<number>();
    yearSet.add(props.year);
    yearSet.add(props.year - 1);
    yearSet.add(props.year - 2);
    for (const g of targetGroups) {
      if (g.years) {
        for (const yStr of Object.keys(g.years)) {
          yearSet.add(Number(yStr));
        }
      }
    }
    const sorted = Array.from(yearSet)
      .sort((a, b) => a - b)
      .slice(-6);
    const points: { label: string; xLabel: string; value: number }[] = [];
    for (const y of sorted) {
      let count = 0;
      const len = daysInYear(y);
      for (let idx = 0; idx < len; idx++) {
        count += dayEntryCount(y, idx);
      }
      points.push({
        label: String(y),
        xLabel: String(y),
        value: count,
      });
    }
    return {
      subtitle: "Past Years",
      points,
    };
  }, [
    period,
    props.year,
    props.month,
    props.showAll,
    props.groups,
    props.activeGroupIndex,
  ]);

  const streak = useMemo(
    () =>
      computeLongestStreak(
        props.groups,
        props.activeGroupIndex,
        props.showAll,
        props.year,
      ),
    [props.groups, props.activeGroupIndex, props.showAll, props.year],
  );

  const formatDate = (d: { y: number; m: number; d: number } | null) => {
    if (!d) return "";
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(d.y, d.m, d.d));
  };

  // SVG Chart Geometry
  const svgWidth = 460;
  const svgHeight = 160;
  const padL = 34;
  const padR = 16;
  const padT = 16;
  const padB = 26;
  const chartW = svgWidth - padL - padR;
  const chartH = svgHeight - padT - padB;

  const points = chartData.points;
  const totalEntries = points.reduce((acc, p) => acc + p.value, 0);
  const maxVal = Math.max(...points.map((p) => p.value), 1);
  const midVal = Math.ceil(maxVal / 2);

  const coordinates = points.map((p, i) => {
    const x = padL + (i / Math.max(points.length - 1, 1)) * chartW;
    const y = padT + chartH - (p.value / maxVal) * chartH;
    return { x, y, ...p };
  });

  const linePath = coordinates
    .map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(" ");

  const areaPath =
    coordinates.length > 0
      ? `${linePath} L ${coordinates[coordinates.length - 1].x.toFixed(1)} ${padT + chartH} L ${coordinates[0].x.toFixed(1)} ${padT + chartH} Z`
      : "";

  return (
    <>
      <div class="ovl" onClick={props.onClose} />
      <div
        class="sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Statistics"
      >
        <div class="sh-head">
          <b>
            {props.showAll
              ? "Statistics — All Groups"
              : `Statistics — ${activeGroup?.name ?? "Group"}`}
          </b>
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

        {/* 4 Granularity Buttons */}
        <div class="stat-tabs" role="group" aria-label="Statistics granularity">
          <button
            type="button"
            class="tab"
            aria-pressed={period === "daily"}
            onClick={() => setPeriod("daily")}
          >
            Daily
          </button>
          <button
            type="button"
            class="tab"
            aria-pressed={period === "weekly"}
            onClick={() => setPeriod("weekly")}
          >
            Weekly
          </button>
          <button
            type="button"
            class="tab"
            aria-pressed={period === "monthly"}
            onClick={() => setPeriod("monthly")}
          >
            Monthly
          </button>
          <button
            type="button"
            class="tab"
            aria-pressed={period === "yearly"}
            onClick={() => setPeriod("yearly")}
          >
            Yearly
          </button>
        </div>

        {/* Line Chart Section */}
        <div class="stat-chart-wrap">
          <div class="stat-summary">
            <span>{chartData.subtitle}</span>
            <span>
              Total: <b>{totalEntries}</b>{" "}
              {totalEntries === 1 ? "entry" : "entries"}
            </span>
          </div>

          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            class="stat-chart-svg"
            aria-label={`Entry chart for ${chartData.subtitle}`}
          >
            <defs>
              <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stop-color={strokeColor}
                  stop-opacity="0.32"
                />
                <stop
                  offset="100%"
                  stop-color={strokeColor}
                  stop-opacity="0.02"
                />
              </linearGradient>
            </defs>

            {/* Grid horizontal lines */}
            <line
              x1={padL}
              y1={padT}
              x2={padL + chartW}
              y2={padT}
              stroke="var(--line)"
              stroke-width="1"
              stroke-dasharray="3,3"
            />
            <text
              x={padL - 6}
              y={padT + 3}
              text-anchor="end"
              font-size="9"
              fill="var(--muted)"
            >
              {maxVal}
            </text>

            <line
              x1={padL}
              y1={padT + chartH / 2}
              x2={padL + chartW}
              y2={padT + chartH / 2}
              stroke="var(--line)"
              stroke-width="1"
              stroke-dasharray="3,3"
            />
            <text
              x={padL - 6}
              y={padT + chartH / 2 + 3}
              text-anchor="end"
              font-size="9"
              fill="var(--muted)"
            >
              {midVal}
            </text>

            <line
              x1={padL}
              y1={padT + chartH}
              x2={padL + chartW}
              y2={padT + chartH}
              stroke="var(--line)"
              stroke-width="1"
            />
            <text
              x={padL - 6}
              y={padT + chartH + 3}
              text-anchor="end"
              font-size="9"
              fill="var(--muted)"
            >
              0
            </text>

            {/* Area gradient under line */}
            {areaPath && <path d={areaPath} fill="url(#chartGrad)" />}

            {/* Main line path */}
            {linePath && (
              <path
                d={linePath}
                fill="none"
                stroke={strokeColor}
                stroke-width="2.2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            )}

            {/* Data Dots and X-axis labels */}
            {coordinates.map((c, i) => (
              <g key={i}>
                <circle
                  cx={c.x}
                  cy={c.y}
                  r={coordinates.length > 35 ? 2 : 3}
                  fill={strokeColor}
                >
                  <title>{`${c.label}: ${c.value} entries`}</title>
                </circle>
                {c.xLabel && (
                  <text
                    x={c.x}
                    y={padT + chartH + 16}
                    text-anchor="middle"
                    font-size="9.5"
                    fill="var(--muted)"
                  >
                    {c.xLabel}
                  </text>
                )}
              </g>
            ))}
          </svg>
        </div>

        {/* Longest Streak Info */}
        <div class="stat-streak-card">
          <div class="stat-streak-head">
            <span class="stat-streak-title">Longest Streak</span>
            <span class="stat-streak-count">
              {streak.count} {streak.count === 1 ? "day" : "days"}
            </span>
          </div>
          <div class="stat-streak-dates">
            {streak.count > 0 && streak.start && streak.end ? (
              <span>
                From <b>{formatDate(streak.start)}</b> to{" "}
                <b>{formatDate(streak.end)}</b>
              </span>
            ) : (
              <span class="stat-streak-empty">No marked streaks yet</span>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
