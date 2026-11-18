export const PALETTE = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#78716c",
  "#059669",
  "#0ea5e9",
] as const;

/** Contrast-safe text color to put on top of a palette/any hex color. */
export function onColor(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const lum =
    (0.2126 * ((n >> 16) & 255) +
      0.7152 * ((n >> 8) & 255) +
      0.0722 * (n & 255)) /
    255;
  return lum > 0.62 ? "#15161a" : "#ffffff";
}

export function getHeatColor(hex: string, level: number): string {
  if (level <= 0) return "var(--cell)";
  if (level >= 4) return hex;
  const pct = level === 1 ? 30 : level === 2 ? 55 : 80;
  return `color-mix(in srgb, ${hex} ${pct}%, var(--cell))`;
}

export function getHeatTextColor(hex: string, level: number): string {
  if (level <= 2) return "var(--text)";
  return onColor(hex);
}
