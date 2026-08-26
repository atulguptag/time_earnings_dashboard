import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  isValid,
  parse,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subDays,
} from "date-fns";
import type { EarningRow, Filters, QuickRange } from "./types";

/** Monday. Every week boundary in the app comes through here. */
export const WEEK_OPTS = { weekStartsOn: 1 } as const;

export interface DateWindow {
  start: Date;
  end: Date;
}

export const QUICK_RANGES: { value: QuickRange; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "year", label: "This year" },
  { value: "custom", label: "Custom range" },
];

/** Parses a yyyy-MM-dd input value in LOCAL time (new Date(str) would be UTC). */
export function parseInputDate(value: string): Date | null {
  if (!value) return null;
  const d = parse(value, "yyyy-MM-dd", new Date());
  return isValid(d) ? d : null;
}

export const toInputDate = (d: Date) => format(d, "yyyy-MM-dd");

/**
 * The single source of truth for what a range means. Both the filter and its
 * human-readable label read from this, so they can never drift apart.
 */
export function resolveWindow(
  filters: Pick<Filters, "range" | "startDate" | "endDate">,
  now: Date = new Date()
): DateWindow | null {
  const { range, startDate, endDate } = filters;

  if (range === "custom") {
    const s = parseInputDate(startDate);
    const e = parseInputDate(endDate);
    if (!s && !e) return null;
    return {
      start: s ? startOfDay(s) : new Date(-8640000000000000),
      end: e ? endOfDay(e) : endOfDay(now),
    };
  }

  switch (range) {
    case "today":
      return { start: startOfDay(now), end: endOfDay(now) };
    case "7d":
      return { start: startOfDay(subDays(now, 6)), end: endOfDay(now) };
    case "30d":
      return { start: startOfDay(subDays(now, 29)), end: endOfDay(now) };
    case "week":
      return {
        start: startOfWeek(now, WEEK_OPTS),
        end: endOfWeek(now, WEEK_OPTS),
      };
    case "month":
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case "year":
      return { start: startOfYear(now), end: endOfYear(now) };
    default:
      return null;
  }
}

export function describeWindow(
  filters: Pick<Filters, "range" | "startDate" | "endDate">,
  now: Date = new Date()
): string {
  const w = resolveWindow(filters, now);
  if (!w) return "All time";
  const fmt = (d: Date) => format(d, "MMM d, yyyy");
  if (filters.range === "today") return fmt(now);
  if (w.start.getTime() < 0) return `Up to ${fmt(w.end)}`;
  return `${fmt(w.start)} – ${fmt(w.end)}`;
}

/** One pass over the rows; the window is computed once, not per row. */
export function applyFilters(
  rows: EarningRow[],
  filters: Filters,
  now: Date = new Date()
): EarningRow[] {
  const window = resolveWindow(filters, now);
  const from = window ? window.start.getTime() : null;
  const to = window ? window.end.getTime() : null;

  const projects = filters.projects.length ? new Set(filters.projects) : null;
  const payTypes = filters.payTypes.length ? new Set(filters.payTypes) : null;
  const statuses = filters.statuses.length ? new Set(filters.statuses) : null;
  const term = filters.search.trim().toLowerCase();

  return rows.filter((row) => {
    if (from !== null && to !== null) {
      const t = row.date.getTime();
      if (t < from || t > to) return false;
    }
    if (projects && !projects.has(row.projectName)) return false;
    if (payTypes && !payTypes.has(row.payType)) return false;
    if (statuses && !statuses.has(row.status)) return false;
    if (term) {
      const haystack = `${row.itemID} ${row.projectName} ${row.payType} ${row.status} ${row.workDate}`;
      if (!haystack.toLowerCase().includes(term)) return false;
    }
    return true;
  });
}

export function countActiveFilters(f: Filters): number {
  return (
    (f.range !== "all" ? 1 : 0) +
    f.projects.length +
    f.payTypes.length +
    f.statuses.length +
    (f.search.trim() ? 1 : 0)
  );
}
