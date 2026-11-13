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
import { PALETTE } from "../state/palette";

interface StreakInfo {
  count: number;
  start: { y: number; m: number; d: number } | null;
  end: { y: number; m: number; d: number } | null;
}

function computeGroupStreak(
  group: Group | undefined,
  currentYear: number,
): StreakInfo {
  if (!group) {
    return { count: 0, start: null, end: null };
  }

  const yearSet = new Set<number>();
  yearSet.add(currentYear);
  if (group.years) {
    for (const yStr of Object.keys(group.years)) {
      yearSet.add(Number(yStr));
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
    const yearData = group.years?.[y];
    for (let idx = 0; idx < totalDays; idx++) {
      if (isDayMarked(yearData, idx)) {
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

  const chartData = useMemo(() => {
    interface Bucket {
      label: string;
      xLabel: string;
      countFn: (g: Group) => number;
    }

    let subtitle = "";
    const buckets: Bucket[] = [];

    if (period === "daily") {
      const len = daysInMonth(props.year, props.month);
      subtitle = `${monthTitle(props.year, props.month)}`;
      for (let d = 1; d <= len; d++) {
        const idx = ymdToIdx(props.year, props.month, d);
        buckets.push({
          label: `${mNames[props.month]} ${d}`,
          xLabel: d === 1 || d % 5 === 0 || d === len ? String(d) : "",
          countFn: (g: Group) =>
            isDayMarked(g.years?.[props.year], idx) ? 1 : 0,
        });
      }
    } else if (period === "weekly") {
      const totalDays = daysInYear(props.year);
      const numWeeks = Math.ceil(totalDays / 7);
      subtitle = `Year ${props.year}`;
      for (let w = 0; w < numWeeks; w++) {
        const start = w * 7;
        const end = Math.min(start + 7, totalDays);
        buckets.push({
          label: `Week ${w + 1}`,
          xLabel:
            w === 0 || (w + 1) % 10 === 0 || w === numWeeks - 1
              ? `W${w + 1}`
              : "",
          countFn: (g: Group) => {
            let count = 0;
            for (let idx = start; idx < end; idx++) {
              if (isDayMarked(g.years?.[props.year], idx)) count++;
            }
            return count;
          },
        });
      }
    } else if (period === "monthly") {
      subtitle = `Year ${props.year}`;
      for (let m = 0; m < 12; m++) {
        const start = monthStarts(props.year)[m];
        const len = daysInMonth(props.year, m);
        buckets.push({
          label: mNames[m],
          xLabel: mNames[m],
          countFn: (g: Group) => {
            let count = 0;
            for (let d = 0; d < len; d++) {
              if (isDayMarked(g.years?.[props.year], start + d)) count++;
            }
            return count;
          },
        });
      }
    } else {
      // yearly
      subtitle = "Past Years";
      const yearSet = new Set<number>();
      yearSet.add(props.year);
      yearSet.add(props.year - 1);
      yearSet.add(props.year - 2);
      const relevant = props.showAll
        ? props.groups
        : [activeGroup].filter(Boolean);
      for (const g of relevant) {
        if (g.years) {
          for (const yStr of Object.keys(g.years)) {
            yearSet.add(Number(yStr));
          }
        }
      }
      const sorted = Array.from(yearSet)
        .sort((a, b) => a - b)
        .slice(-6);
      for (const y of sorted) {
        const len = daysInYear(y);
        buckets.push({
          label: String(y),
          xLabel: String(y),
          countFn: (g: Group) => {
            let count = 0;
            for (let idx = 0; idx < len; idx++) {
              if (isDayMarked(g.years?.[y], idx)) count++;
            }
            return count;
          },
        });
      }
    }

    const targetList = props.showAll
      ? props.groups.map((g) => ({
          id: g.id,
          name: g.name,
          color: PALETTE[g.color] ?? PALETTE[0],
          group: g,
        }))
      : activeGroup
        ? [
            {
              id: activeGroup.id,
              name: activeGroup.name,
              color: props.color,
              group: activeGroup,
            },
          ]
        : [];

    const series = targetList.map((t) => {
      const values = buckets.map((b) => b.countFn(t.group));
      const total = values.reduce((acc, v) => acc + v, 0);
      return {
        id: t.id,
        name: t.name,
        color: t.color,
        values,
        total,
      };
    });

    const allValues = series.flatMap((s) => s.values);
    const maxVal = Math.max(...allValues, 1);
    const midVal = Math.ceil(maxVal / 2);

    return {
      subtitle,
      buckets,
      series,
      maxVal,
      midVal,
    };
  }, [
    period,
    props.year,
    props.month,
    props.showAll,
    props.groups,
    props.activeGroupIndex,
    props.color,
    mNames,
    activeGroup,
  ]);

  const singleStreak = useMemo(
    () => computeGroupStreak(activeGroup, props.year),
    [activeGroup, props.year],
  );

  const allStreaks = useMemo(
    () =>
      props.groups.map((g) => ({
        group: g,
        color: PALETTE[g.color] ?? PALETTE[0],
        streak: computeGroupStreak(g, props.year),
      })),
    [props.groups, props.year],
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

  const { buckets, series, maxVal, midVal, subtitle } = chartData;
  const grandTotal = series.reduce((acc, s) => acc + s.total, 0);

  const seriesWithGeometry = useMemo(() => {
    return series.map((s) => {
      const coordinates = s.values.map((val, i) => {
        const x = padL + (i / Math.max(buckets.length - 1, 1)) * chartW;
        const y = padT + chartH - (val / maxVal) * chartH;
        return {
          x,
          y,
          value: val,
          label: buckets[i].label,
        };
      });

      const linePath = coordinates
        .map(
          (c, i) =>
            `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`,
        )
        .join(" ");

      const areaPath =
        coordinates.length > 0
          ? `${linePath} L ${coordinates[coordinates.length - 1].x.toFixed(1)} ${padT + chartH} L ${coordinates[0].x.toFixed(1)} ${padT + chartH} Z`
          : null;

      return {
        ...s,
        coordinates,
        linePath,
        areaPath,
      };
    });
  }, [series, buckets, maxVal, chartW, chartH]);

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
            <span>{subtitle}</span>
            <span>
              Total: <b>{grandTotal}</b>{" "}
              {grandTotal === 1 ? "entry" : "entries"}
            </span>
          </div>

          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            class="stat-chart-svg"
            aria-label={`Entry chart for ${subtitle}`}
          >
            <defs>
              {seriesWithGeometry.map((s) => (
                <linearGradient
                  id={`chartGrad-${s.id}`}
                  key={s.id}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stop-color={s.color}
                    stop-opacity={props.showAll ? "0.2" : "0.32"}
                  />
                  <stop
                    offset="100%"
                    stop-color={s.color}
                    stop-opacity="0.02"
                  />
                </linearGradient>
              ))}
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

            {/* Area gradients under curves */}
            {seriesWithGeometry.map(
              (s) =>
                s.areaPath && (
                  <path
                    key={`area-${s.id}`}
                    d={s.areaPath}
                    fill={`url(#chartGrad-${s.id})`}
                  />
                ),
            )}

            {/* Distinct line paths for each group */}
            {seriesWithGeometry.map((s) => (
              <path
                key={s.id}
                d={s.linePath}
                fill="none"
                stroke={s.color}
                stroke-width="2.2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <title>{`${s.name}: ${s.total} entries`}</title>
              </path>
            ))}

            {/* Data Dots for each group */}
            {seriesWithGeometry.map((s) =>
              s.coordinates.map((c, i) => {
                if (props.showAll && c.value === 0) return null;
                return (
                  <circle
                    key={`${s.id}-${i}`}
                    cx={c.x}
                    cy={c.y}
                    r={buckets.length > 35 ? 2 : 3}
                    fill={s.color}
                  >
                    <title>{`${s.name} (${c.label}): ${c.value} entries`}</title>
                  </circle>
                );
              }),
            )}

            {/* X-axis labels */}
            {buckets.map((b, i) =>
              b.xLabel ? (
                <text
                  key={i}
                  x={padL + (i / Math.max(buckets.length - 1, 1)) * chartW}
                  y={padT + chartH + 16}
                  text-anchor="middle"
                  font-size="9.5"
                  fill="var(--muted)"
                >
                  {b.xLabel}
                </text>
              ) : null,
            )}
          </svg>

          {/* Group legend for distinct lines in "All" view */}
          {props.showAll && seriesWithGeometry.length > 1 && (
            <div class="stat-legend">
              {seriesWithGeometry.map((s) => (
                <div key={s.id} class="stat-legend-item">
                  <span class="dot" style={{ background: s.color }} />
                  <span class="stat-legend-name">{s.name}</span>
                  <span class="stat-legend-total">({s.total})</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Longest Streak Info */}
        <div class="stat-streak-card">
          <div class="stat-streak-head">
            <span class="stat-streak-title">
              {props.showAll ? "Longest Streaks" : "Longest Streak"}
            </span>
            {!props.showAll && (
              <span class="stat-streak-count">
                {singleStreak.count} {singleStreak.count === 1 ? "day" : "days"}
              </span>
            )}
          </div>

          {props.showAll ? (
            <div class="stat-streak-list">
              {allStreaks.map(({ group, color, streak }) => (
                <div key={group.id} class="stat-streak-row">
                  <div class="stat-streak-row-head">
                    <span class="stat-streak-group-name">
                      <span class="dot" style={{ background: color }} />
                      {group.name}
                    </span>
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
                      <span class="stat-streak-empty">
                        No marked streaks yet
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div class="stat-streak-dates">
              {singleStreak.count > 0 &&
              singleStreak.start &&
              singleStreak.end ? (
                <span>
                  From <b>{formatDate(singleStreak.start)}</b> to{" "}
                  <b>{formatDate(singleStreak.end)}</b>
                </span>
              ) : (
                <span class="stat-streak-empty">No marked streaks yet</span>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
