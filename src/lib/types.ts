/** One earnings log row, normalised at parse time. */
export interface EarningRow {
  /** Original CSV string, e.g. "Aug 24, 2026". */
  workDate: string;
  /** Parsed once at upload so nothing re-parses dates per render. */
  date: Date;
  itemID: string;
  /** Worked time in seconds. */
  duration: number;
  /** Original duration text, kept for display fidelity. */
  durationString: string;
  /** Original rate text, e.g. "$25.58/hr". */
  rateApplied: string;
  /** Numeric form of rateApplied; 0 when the row carries no rate. */
  rateValue: number;
  payout: number;
  /** Display-ready, e.g. "Mission Reward". */
  payType: string;
  projectName: string;
  /** Canonical key: "paid" | "pending" | "canceled". */
  status: string;
  /** Display-ready status as written in the file, e.g. "Cancelled". */
  statusLabel: string;
}

export type QuickRange =
  | "all"
  | "today"
  | "7d"
  | "30d"
  | "week"
  | "month"
  | "year"
  | "custom";

export interface Filters {
  range: QuickRange;
  startDate: string; // yyyy-MM-dd
  endDate: string; // yyyy-MM-dd
  projects: string[];
  payTypes: string[];
  statuses: string[];
  search: string;
}

export const EMPTY_FILTERS: Filters = {
  range: "all",
  startDate: "",
  endDate: "",
  projects: [],
  payTypes: [],
  statuses: [],
  search: "",
};

export interface SourceFile {
  name: string;
  rows: number;
  skipped: number;
  truncated: boolean;
}

export interface FileMeta {
  /** Every export merged into the current view, in the order added. */
  sources: SourceFile[];
  /** Rows after merging and de-overlapping. */
  rows: number;
  skipped: number;
  /** Rows another file had already supplied. */
  duplicates: number;
  truncated: boolean;
  uploadedAt: number;
}

export type ThemeChoice = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export interface Settings {
  weeklyGoalHours: number;
  /** yyyy-MM-dd, or null to auto-anchor to the first work date. */
  cycleAnchor: string | null;
  pageSize: number;
}

export const DEFAULT_SETTINGS: Settings = {
  weeklyGoalHours: 30,
  cycleAnchor: null,
  pageSize: 10,
};

export const PAGE_SIZES = [10, 25, 50, 100] as const;

export type SectionId =
  | "overview"
  | "analytics"
  | "breakdown"
  | "cycles"
  | "projects"
  | "settings";
