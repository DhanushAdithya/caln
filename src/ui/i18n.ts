const cache = new Map<string, string[]>();

function monthNamesOf(style: "short" | "long"): string[] {
  const key = `m:${style}`;
  let out = cache.get(key);
  if (!out) {
    const f = new Intl.DateTimeFormat(undefined, { month: style });
    out = Array.from({ length: 12 }, (_, m) => f.format(new Date(2000, m, 1)));
    cache.set(key, out);
  }
  return out;
}

/** Weekday names indexed by weekday id, 0 = Sun … 6 = Sat. (Jan 2, 2000 = Sunday) */
function weekdayNamesOf(style: "short" | "narrow" | "long"): string[] {
  const key = `w:${style}`;
  let out = cache.get(key);
  if (!out) {
    const f = new Intl.DateTimeFormat(undefined, { weekday: style });
    out = Array.from({ length: 7 }, (_, i) =>
      f.format(new Date(2000, 0, 2 + i)),
    );
    cache.set(key, out);
  }
  return out;
}

export const monthNames = (): string[] => monthNamesOf("short");
export const weekdayShort = (): string[] => weekdayNamesOf("short");
export const weekdayNarrow = (): string[] => weekdayNamesOf("narrow");
export const weekdayLong = (): string[] => weekdayNamesOf("long");

export function monthTitle(y: number, m: number): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "long",
    year: "numeric",
  }).format(new Date(y, m, 1));
}
