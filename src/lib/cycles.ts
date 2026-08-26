import {
  addDays,
  differenceInCalendarDays,
  format,
  startOfDay,
  startOfWeek,
  startOfYear,
} from "date-fns";
// weekProgress still uses Monday-based calendar weeks; only the cycle anchor changed.
import { WEEK_OPTS, parseInputDate } from "./filters";
import { toHours } from "./format";
import { isLive } from "./metrics";
import type { EarningRow } from "./types";

export const CYCLE_DAYS = 28;
export const WEEKS_PER_CYCLE = 4;

export interface CycleWeek {
  index: number; // 1-4
  start: Date;
  end: Date;
  hours: number;
  earnings: number;
  /** False for weeks that have not started yet. */
  started: boolean;
}

export interface Cycle {
  index: number; // 1-based, oldest cycle is 1
  start: Date;
  end: Date;
  label: string;
  rangeLabel: string;
  isCurrent: boolean;
  isComplete: boolean;
  /** 1-4 for the live cycle, 4 once complete. */
  weeksElapsed: number;
  daysElapsed: number;
  daysRemaining: number;
  hours: number;
  earnings: number;
  /** Earnings from rows that logged time. Excludes rewards and adjustments. */
  timedEarnings: number;
  /** Earnings with no logged time against them. */
  bonusEarnings: number;
  tasks: number;
  /** weeklyGoal x weeksElapsed - prorated while the cycle is running. */
  targetHours: number;
  /** weeklyGoal x 4 - what the whole cycle is worth. */
  fullTargetHours: number;
  /** Progress against targetHours, capped at 100 for the bar width. */
  pct: number;
  /** Raw ratio, uncapped, so overachievement stays visible. */
  rawPct: number;
  deltaHours: number;
  onTrack: boolean;
  weeks: CycleWeek[];
  rate: number;
  /** Hours/day pace needed across remaining days to reach the full target. */
  requiredPace: number;
}

/**
 * Cycles are pinned to the calendar, not to the data: the default anchor is
 * 1 January of the year the data starts in. Deriving it from the earliest
 * logged day made every boundary move whenever the first row changed, so the
 * same week could belong to a different cycle after a re-export.
 */
export function resolveAnchor(
  rows: EarningRow[],
  anchorISO: string | null
): Date | null {
  const pinned = anchorISO ? parseInputDate(anchorISO) : null;
  if (pinned) return startOfDay(pinned);
  if (rows.length === 0) return null;

  let earliest = rows[0].date;
  for (const row of rows) if (row.date < earliest) earliest = row.date;
  return startOfYear(earliest);
}

export function buildCycles(
  rows: EarningRow[],
  weeklyGoalHours: number,
  anchorISO: string | null,
  now: Date = new Date()
): Cycle[] {
  const anchor = resolveAnchor(rows, anchorISO);
  if (!anchor) return [];

  const today = startOfDay(now);
  const live = rows.filter(isLive);

  // Extend far enough to cover both the data and today.
  let latest = today;
  for (const row of live) if (row.date > latest) latest = row.date;

  const span = differenceInCalendarDays(latest, anchor);
  if (span < 0) return [];
  const total = Math.floor(span / CYCLE_DAYS) + 1;
  // Sanity cap: a bad pinned anchor should not spin up thousands of cycles.
  const cycleCount = Math.min(total, 400);

  const cycles: Cycle[] = Array.from({ length: cycleCount }, (_, i) => {
    const start = addDays(anchor, i * CYCLE_DAYS);
    const end = addDays(start, CYCLE_DAYS - 1);
    const startedDays = differenceInCalendarDays(today, start) + 1;
    const isCurrent = today >= start && today <= end;
    const isComplete = today > end;

    const weeksElapsed = isComplete
      ? WEEKS_PER_CYCLE
      : Math.min(
          WEEKS_PER_CYCLE,
          Math.max(1, Math.ceil(startedDays / 7))
        );

    const weeks: CycleWeek[] = Array.from({ length: WEEKS_PER_CYCLE }, (_, w) => {
      const ws = addDays(start, w * 7);
      return {
        index: w + 1,
        start: ws,
        end: addDays(ws, 6),
        hours: 0,
        earnings: 0,
        started: today >= ws,
      };
    });

    return {
      index: i + 1,
      start,
      end,
      label: `Cycle ${i + 1}`,
      rangeLabel: `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`,
      isCurrent,
      isComplete,
      weeksElapsed,
      daysElapsed: Math.max(0, Math.min(CYCLE_DAYS, startedDays)),
      daysRemaining: isComplete
        ? 0
        : Math.max(0, differenceInCalendarDays(end, today)),
      hours: 0,
      earnings: 0,
      timedEarnings: 0,
      bonusEarnings: 0,
      tasks: 0,
      targetHours: weeklyGoalHours * weeksElapsed,
      fullTargetHours: weeklyGoalHours * WEEKS_PER_CYCLE,
      pct: 0,
      rawPct: 0,
      deltaHours: 0,
      onTrack: false,
      weeks,
      rate: 0,
      requiredPace: 0,
    };
  });

  // Single pass over rows: index arithmetic beats scanning per cycle.
  const taskIds: Set<string>[] = cycles.map(() => new Set());
  const anchorTime = anchor.getTime();

  for (const row of live) {
    const offset = Math.floor(
      differenceInCalendarDays(row.date, anchor) / CYCLE_DAYS
    );
    if (offset < 0 || offset >= cycles.length) continue;
    if (row.date.getTime() < anchorTime) continue;

    const cycle = cycles[offset];
    const hours = toHours(row.duration);
    cycle.hours += hours;
    cycle.earnings += row.payout;
    if (row.duration > 0) cycle.timedEarnings += row.payout;
    if (row.itemID) taskIds[offset].add(row.itemID);

    const weekIdx = Math.min(
      WEEKS_PER_CYCLE - 1,
      Math.floor(differenceInCalendarDays(row.date, cycle.start) / 7)
    );
    if (weekIdx >= 0) {
      cycle.weeks[weekIdx].hours += hours;
      cycle.weeks[weekIdx].earnings += row.payout;
    }
  }

  cycles.forEach((cycle, i) => {
    cycle.tasks = taskIds[i].size;
    cycle.bonusEarnings = cycle.earnings - cycle.timedEarnings;
    // Timed earnings only. Dividing TOTAL earnings by hours produced figures
    // like $1,227/hr on a cycle that logged 2.5h but collected bonuses.
    cycle.rate = cycle.hours > 0 ? cycle.timedEarnings / cycle.hours : 0;
    cycle.deltaHours = cycle.hours - cycle.targetHours;
    cycle.rawPct =
      cycle.targetHours > 0 ? (cycle.hours / cycle.targetHours) * 100 : 0;
    cycle.pct = Math.min(100, Math.max(0, cycle.rawPct));
    cycle.onTrack = cycle.hours >= cycle.targetHours;
    const remainingHours = Math.max(0, cycle.fullTargetHours - cycle.hours);
    const daysLeft = cycle.isCurrent ? cycle.daysRemaining + 1 : 0;
    cycle.requiredPace = daysLeft > 0 ? remainingHours / daysLeft : 0;
  });

  // A calendar anchor can sit months before the first logged day; those empty
  // leading cycles are noise, so drop them and renumber from 1.
  let earliestData: Date | null = null;
  for (const row of live) {
    if (!earliestData || row.date < earliestData) earliestData = row.date;
  }

  return cycles
    .filter((c) => c.start <= today || c.hours > 0)
    .filter((c) => !earliestData || c.end >= earliestData)
    .map((c, i) => ({ ...c, index: i + 1, label: `Cycle ${i + 1}` }));
}

export const currentCycle = (cycles: Cycle[]): Cycle | null =>
  cycles.find((c) => c.isCurrent) ?? cycles[cycles.length - 1] ?? null;

export interface WeekProgress {
  start: Date;
  end: Date;
  hours: number;
  earnings: number;
  tasks: number;
  goalHours: number;
  pct: number;
  rawPct: number;
  deltaHours: number;
  /** Where you should be by end of today if you spread the goal evenly. */
  paceHours: number;
  daysElapsed: number;
  daysRemaining: number;
  days: { date: Date; label: string; hours: number; earnings: number; isToday: boolean; isFuture: boolean }[];
}

export function weekProgress(
  rows: EarningRow[],
  goalHours: number,
  now: Date = new Date()
): WeekProgress {
  const today = startOfDay(now);
  const start = startOfWeek(today, WEEK_OPTS);
  const end = addDays(start, 6);
  const daysElapsed = differenceInCalendarDays(today, start) + 1;

  const days = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(start, i);
    return {
      date,
      label: format(date, "EEEEE"), // single letter: M T W T F S S
      hours: 0,
      earnings: 0,
      isToday: date.getTime() === today.getTime(),
      isFuture: date > today,
    };
  });

  let hours = 0;
  let earnings = 0;
  const tasks = new Set<string>();

  for (const row of rows) {
    if (!isLive(row)) continue;
    const idx = differenceInCalendarDays(row.date, start);
    if (idx < 0 || idx > 6) continue;
    const h = toHours(row.duration);
    days[idx].hours += h;
    days[idx].earnings += row.payout;
    hours += h;
    earnings += row.payout;
    if (row.itemID) tasks.add(row.itemID);
  }

  const rawPct = goalHours > 0 ? (hours / goalHours) * 100 : 0;
  return {
    start,
    end,
    hours,
    earnings,
    tasks: tasks.size,
    goalHours,
    rawPct,
    pct: Math.min(100, Math.max(0, rawPct)),
    deltaHours: hours - goalHours,
    paceHours: (goalHours / 7) * daysElapsed,
    daysElapsed,
    daysRemaining: 7 - daysElapsed,
    days,
  };
}
