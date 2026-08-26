import {
  addDays,
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfDay,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
} from "date-fns";
import { WEEK_OPTS } from "./filters";
import { toHours } from "./format";
import type { EarningRow } from "./types";

export const CANCELED = "canceled";

export interface Summary {
  /** Every payout in scope, canceled included. */
  gross: number;
  /** Payouts that were canceled and will never land. */
  canceled: number;
  /** gross - canceled. The number that actually matters. */
  net: number;
  paid: number;
  pending: number;
  seconds: number;
  hours: number;
  rows: number;
  tasks: number;
  projects: number;
  activeDays: number;
  /** net / hours - blends bonuses into the hourly figure. */
  effectiveRate: number;
  /** Earnings from rows that logged time, over hours. The "real" wage. */
  hourlyRate: number;
  /** Earnings from rows with no logged time (mission/bonus/adjustment). */
  bonusEarnings: number;
}

export const EMPTY_SUMMARY: Summary = {
  gross: 0,
  canceled: 0,
  net: 0,
  paid: 0,
  pending: 0,
  seconds: 0,
  hours: 0,
  rows: 0,
  tasks: 0,
  projects: 0,
  activeDays: 0,
  effectiveRate: 0,
  hourlyRate: 0,
  bonusEarnings: 0,
};

export function summarize(rows: EarningRow[]): Summary {
  if (rows.length === 0) return EMPTY_SUMMARY;

  let gross = 0;
  let canceled = 0;
  let paid = 0;
  let pending = 0;
  let seconds = 0;
  let timedEarnings = 0;
  const tasks = new Set<string>();
  const projects = new Set<string>();
  const days = new Set<string>();

  for (const row of rows) {
    gross += row.payout;
    if (row.status === CANCELED) {
      canceled += row.payout;
      continue; // canceled money is not earned, and its time is not worked
    }
    if (row.status === "paid") paid += row.payout;
    else pending += row.payout;

    seconds += row.duration;
    if (row.duration > 0) timedEarnings += row.payout;
    if (row.itemID) tasks.add(row.itemID);
    projects.add(row.projectName);
    days.add(format(row.date, "yyyy-MM-dd"));
  }

  const net = gross - canceled;
  const hours = toHours(seconds);

  return {
    gross,
    canceled,
    net,
    paid,
    pending,
    seconds,
    hours,
    rows: rows.length,
    tasks: tasks.size,
    projects: projects.size,
    activeDays: days.size,
    effectiveRate: hours > 0 ? net / hours : 0,
    hourlyRate: hours > 0 ? timedEarnings / hours : 0,
    bonusEarnings: net - timedEarnings,
  };
}

/** Canceled rows are excluded everywhere earnings are aggregated. */
export const isLive = (row: EarningRow) => row.status !== CANCELED;

export interface DayPoint {
  iso: string;
  date: Date;
  label: string;
  earnings: number;
  hours: number;
  tasks: number;
}

/**
 * Daily buckets. `fill` inserts zero-days so a line/bar chart shows real gaps
 * instead of connecting across missing days.
 */
export function dailySeries(rows: EarningRow[], fill = false): DayPoint[] {
  const map = new Map<string, DayPoint>();

  for (const row of rows) {
    if (!isLive(row)) continue;
    const iso = format(row.date, "yyyy-MM-dd");
    let point = map.get(iso);
    if (!point) {
      point = {
        iso,
        date: startOfDay(row.date),
        label: format(row.date, "MMM d"),
        earnings: 0,
        hours: 0,
        tasks: 0,
      };
      map.set(iso, point);
    }
    point.earnings += row.payout;
    point.hours += toHours(row.duration);
    point.tasks += 1;
  }

  const points = [...map.values()].sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  );
  if (!fill || points.length < 2) return points;

  const span = eachDayOfInterval({
    start: points[0].date,
    end: points[points.length - 1].date,
  });
  // Guard against filling a multi-year span with tens of thousands of points.
  if (span.length > 800) return points;

  return span.map((date) => {
    const iso = format(date, "yyyy-MM-dd");
    return (
      map.get(iso) ?? {
        iso,
        date,
        label: format(date, "MMM d"),
        earnings: 0,
        hours: 0,
        tasks: 0,
      }
    );
  });
}

export type Granularity = "day" | "week" | "month";

export interface Bucket {
  key: string;
  label: string;
  date: Date;
  earnings: number;
  hours: number;
  tasks: number;
}

export function bucketBy(
  rows: EarningRow[],
  granularity: Granularity
): Bucket[] {
  const map = new Map<string, Bucket>();

  for (const row of rows) {
    if (!isLive(row)) continue;
    const anchor =
      granularity === "day"
        ? startOfDay(row.date)
        : granularity === "week"
        ? startOfWeek(row.date, WEEK_OPTS)
        : startOfMonth(row.date);
    const key = format(anchor, "yyyy-MM-dd");

    let bucket = map.get(key);
    if (!bucket) {
      bucket = {
        key,
        date: anchor,
        label:
          granularity === "month"
            ? format(anchor, "MMM yyyy")
            : format(anchor, "MMM d"),
        earnings: 0,
        hours: 0,
        tasks: 0,
      };
      map.set(key, bucket);
    }
    bucket.earnings += row.payout;
    bucket.hours += toHours(row.duration);
    bucket.tasks += 1;
  }

  return [...map.values()].sort((a, b) => a.date.getTime() - b.date.getTime());
}

export function cumulative(buckets: Bucket[]): (Bucket & { total: number })[] {
  let running = 0;
  return buckets.map((b) => {
    running += b.earnings;
    return { ...b, total: running };
  });
}

export interface GroupStat {
  name: string;
  earnings: number;
  hours: number;
  tasks: number;
  rows: number;
  rate: number;
  share: number;
  firstSeen: Date;
  lastSeen: Date;
}

export function groupBy(
  rows: EarningRow[],
  key: "projectName" | "payType" | "status"
): GroupStat[] {
  const map = new Map<
    string,
    Omit<GroupStat, "rate" | "share"> & { ids: Set<string> }
  >();
  let total = 0;

  for (const row of rows) {
    if (key !== "status" && !isLive(row)) continue;
    const name = row[key] || "Unknown";
    let stat = map.get(name);
    if (!stat) {
      stat = {
        name,
        earnings: 0,
        hours: 0,
        tasks: 0,
        rows: 0,
        firstSeen: row.date,
        lastSeen: row.date,
        ids: new Set<string>(),
      };
      map.set(name, stat);
    }
    stat.earnings += row.payout;
    stat.hours += toHours(row.duration);
    stat.rows += 1;
    if (row.itemID) stat.ids.add(row.itemID);
    if (row.date < stat.firstSeen) stat.firstSeen = row.date;
    if (row.date > stat.lastSeen) stat.lastSeen = row.date;
    total += row.payout;
  }

  return [...map.values()]
    .map(({ ids, ...s }) => ({
      ...s,
      tasks: ids.size,
      rate: s.hours > 0 ? s.earnings / s.hours : 0,
      share: total > 0 ? (s.earnings / total) * 100 : 0,
    }))
    .sort((a, b) => b.earnings - a.earnings);
}

/**
 * Keeps the top N and folds the rest into "Other" — categorical hues are
 * assigned in fixed order and never cycled, so the slot count is capped.
 */
export function foldOther(stats: GroupStat[], keep: number): GroupStat[] {
  if (stats.length <= keep) return stats;
  const head = stats.slice(0, keep);
  const tail = stats.slice(keep);
  const merged = tail.reduce(
    (acc, s) => ({
      ...acc,
      earnings: acc.earnings + s.earnings,
      hours: acc.hours + s.hours,
      tasks: acc.tasks + s.tasks,
      rows: acc.rows + s.rows,
      share: acc.share + s.share,
    }),
    {
      name: `Other (${tail.length})`,
      earnings: 0,
      hours: 0,
      tasks: 0,
      rows: 0,
      rate: 0,
      share: 0,
      firstSeen: tail[0].firstSeen,
      lastSeen: tail[0].lastSeen,
    } as GroupStat
  );
  merged.rate = merged.hours > 0 ? merged.earnings / merged.hours : 0;
  return [...head, merged];
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export interface WeekdayStat {
  day: string;
  earnings: number;
  hours: number;
  activeDays: number;
  avgEarnings: number;
}

/** Average output per weekday — answers "when am I actually productive". */
export function weekdayProfile(rows: EarningRow[]): WeekdayStat[] {
  const totals = WEEKDAYS.map((day) => ({
    day,
    earnings: 0,
    hours: 0,
    activeDays: 0,
    avgEarnings: 0,
  }));
  const seen = WEEKDAYS.map(() => new Set<string>());

  for (const row of rows) {
    if (!isLive(row)) continue;
    // getDay(): 0=Sun. Shift so Monday is index 0.
    const idx = (row.date.getDay() + 6) % 7;
    totals[idx].earnings += row.payout;
    totals[idx].hours += toHours(row.duration);
    seen[idx].add(format(row.date, "yyyy-MM-dd"));
  }

  return totals.map((t, i) => ({
    ...t,
    activeDays: seen[i].size,
    avgEarnings: seen[i].size > 0 ? t.earnings / seen[i].size : 0,
  }));
}

export function rowsInWindow(
  rows: EarningRow[],
  start: Date,
  end: Date
): EarningRow[] {
  const from = startOfDay(start).getTime();
  const to = endOfDay(end).getTime();
  return rows.filter((r) => {
    const t = r.date.getTime();
    return t >= from && t <= to;
  });
}

export interface PeriodDelta {
  current: number;
  previous: number;
  change: number;
  pct: number;
}

/** Compares a window against the immediately preceding window of equal length. */
export function periodDelta(
  rows: EarningRow[],
  start: Date,
  end: Date,
  pick: (s: Summary) => number
): PeriodDelta {
  const days = differenceInCalendarDays(end, start) + 1;
  const current = pick(summarize(rowsInWindow(rows, start, end)));
  const prevEnd = subDays(start, 1);
  const prevStart = subDays(prevEnd, days - 1);
  const previous = pick(summarize(rowsInWindow(rows, prevStart, prevEnd)));
  const change = current - previous;
  return {
    current,
    previous,
    change,
    pct: previous > 0 ? (change / previous) * 100 : current > 0 ? 100 : 0,
  };
}

/** Longest run of consecutive days with logged work, ending most recently. */
export function streaks(rows: EarningRow[]): {
  current: number;
  longest: number;
} {
  const days = [
    ...new Set(rows.filter(isLive).map((r) => format(r.date, "yyyy-MM-dd"))),
  ].sort();
  if (days.length === 0) return { current: 0, longest: 0 };

  let longest = 1;
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    const prev = new Date(`${days[i - 1]}T00:00:00`);
    const cur = new Date(`${days[i]}T00:00:00`);
    if (differenceInCalendarDays(cur, prev) === 1) run += 1;
    else run = 1;
    if (run > longest) longest = run;
  }

  // A streak still counts if the last active day was today or yesterday.
  const last = new Date(`${days[days.length - 1]}T00:00:00`);
  const gap = differenceInCalendarDays(startOfDay(new Date()), last);
  return { current: gap <= 1 ? run : 0, longest };
}

/** Rolling window of the last N days, always exactly N points including today. */
export function lastNDays(
  rows: EarningRow[],
  n: number,
  now: Date = new Date()
): DayPoint[] {
  const end = startOfDay(now);
  const start = subDays(end, n - 1);
  const scoped = rowsInWindow(rows, start, end);
  const map = new Map(dailySeries(scoped).map((p) => [p.iso, p]));

  return Array.from({ length: n }, (_, i) => {
    const date = addDays(start, i);
    const iso = format(date, "yyyy-MM-dd");
    return (
      map.get(iso) ?? {
        iso,
        date,
        label: format(date, "MMM d"),
        earnings: 0,
        hours: 0,
        tasks: 0,
      }
    );
  });
}

export const bestDay = (points: DayPoint[]): DayPoint | null =>
  points.reduce<DayPoint | null>(
    (best, p) => (!best || p.earnings > best.earnings ? p : best),
    null
  );
