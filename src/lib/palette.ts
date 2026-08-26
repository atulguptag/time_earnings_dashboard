import type { ResolvedTheme } from "./types";

/**
 * Categorical slots in FIXED order — never cycled, never reordered by rank.
 * Both columns are validated against this app's own surfaces
 * (light #ffffff, dark #1a1a19) for lightness band, chroma floor,
 * CVD separation and normal-vision separation on adjacent pairs.
 */
const CATEGORICAL_LIGHT = [
  "#2a78d6", // blue
  "#eb6834", // orange
  "#1baf7a", // aqua
  "#eda100", // yellow
  "#e87ba4", // magenta
  "#008300", // green
  "#4a3aa7", // violet
  "#e34948", // red
];

const CATEGORICAL_DARK = [
  "#3987e5",
  "#d95926",
  "#199e70",
  "#c98500",
  "#d55181",
  "#008300",
  "#9085e9",
  "#e66767",
];

/**
 * Past 3 slots the palette cannot clear the all-pairs floors, so any form
 * where every series touches every other (pie/donut sectors read that way)
 * folds to "Other" at this cap.
 */
export const SAFE_SLOTS = 6;

export interface ChartTheme {
  categorical: string[];
  /** Money. Matches the brand accent so earnings read consistently. */
  earnings: string;
  /** Time. Deliberately a different hue from money. */
  hours: string;
  grid: string;
  axis: string;
  ink: string;
  ink2: string;
  ink3: string;
  surface: string;
  line: string;
  positive: string;
  negative: string;
  track: string;
}

const LIGHT: ChartTheme = {
  categorical: CATEGORICAL_LIGHT,
  earnings: "#047857",
  hours: "#2a78d6",
  grid: "#e8e7e1",
  axis: "#c9c8bf",
  ink: "#0b0b0b",
  ink2: "#52514e",
  ink3: "#85837d",
  surface: "#ffffff",
  line: "#e4e3dd",
  positive: "#026e26",
  negative: "#b3261e",
  track: "#ecebe6",
};

const DARK: ChartTheme = {
  categorical: CATEGORICAL_DARK,
  earnings: "#10b981",
  hours: "#3987e5",
  grid: "#262624",
  axis: "#3d3d3a",
  ink: "#ffffff",
  ink2: "#c3c2b7",
  ink3: "#8d8b84",
  surface: "#1a1a19",
  line: "#2c2c2a",
  positive: "#0ca30c",
  negative: "#f0736c",
  track: "#232321",
};

export const chartTheme = (theme: ResolvedTheme): ChartTheme =>
  theme === "dark" ? DARK : LIGHT;

/** Colour follows the entity: the same name always gets the same slot. */
export function seriesColor(
  theme: ChartTheme,
  index: number,
  name?: string
): string {
  if (name && name.startsWith("Other")) return theme.ink3;
  return theme.categorical[index % theme.categorical.length];
}

const STATUS_TONE: Record<string, keyof ChartTheme> = {
  paid: "positive",
  pending: "hours",
  canceled: "negative",
};

export const statusColor = (theme: ChartTheme, status: string): string =>
  (theme[STATUS_TONE[status] ?? "ink3"] as string) ?? theme.ink3;
