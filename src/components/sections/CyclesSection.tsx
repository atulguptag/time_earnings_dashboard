"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import {
  CalendarRange,
  Check,
  ChevronDown,
  Flag,
  Minus,
  Target,
  TrendingUp,
} from "lucide-react";
import type { Cycle } from "@/lib/cycles";
import { formatHours, money } from "@/lib/format";
import { useChartTheme } from "@/components/charts/ChartFrame";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  ProgressBar,
  cx,
} from "@/components/ui/Primitives";
import { Select } from "@/components/ui/Select";

/* ------------------------------------------------------- Weekly segments */

/**
 * The live cycle as four week segments rather than one flat bar — it shows
 * *where* the hours landed, which a single percentage cannot.
 */
function WeekSegments({ cycle, goal }: { cycle: Cycle; goal: number }) {
  const max = Math.max(goal, ...cycle.weeks.map((w) => w.hours), 1);

  return (
    <div className="grid grid-cols-4 gap-2">
      {cycle.weeks.map((week) => {
        const pct = (week.hours / max) * 100;
        const met = week.hours >= goal;
        const isNow =
          week.started &&
          new Date() >= week.start &&
          new Date() <= new Date(week.end.getTime() + 86_400_000 - 1);

        return (
          <div
            key={week.index}
            className={cx(
              "rounded-lg border p-2 transition-colors",
              isNow ? "border-brand bg-[var(--brand-soft)]" : "border-line bg-canvas"
            )}
          >
            <div className="mb-1.5 flex items-center justify-between gap-1">
              <span className="text-[10px] font-bold uppercase tracking-[0.05em] text-ink-3">
                W{week.index}
              </span>
              {week.started ? (
                met ? (
                  <Check className="size-3 text-[var(--pos)]" strokeWidth={3} />
                ) : (
                  <Minus className="size-3 text-ink-3" strokeWidth={3} />
                )
              ) : null}
            </div>

            <div className="relative mb-1.5 h-14 overflow-hidden rounded-md bg-[var(--sunken)]">
              <div className="flex h-full items-end">
                <div
                  className={cx(
                    "w-full transition-[height] duration-500",
                    !week.started
                      ? "bg-[var(--line)]"
                      : met
                      ? "bg-brand"
                      : "bg-[var(--line-strong)]"
                  )}
                  style={{ height: `${Math.max(week.hours > 0 ? 4 : 0, pct)}%` }}
                />
              </div>
              {/* Weekly goal reference line */}
              <span
                className="absolute inset-x-0 border-t border-dashed border-[var(--ink-3)] opacity-60"
                style={{ bottom: `${(goal / max) * 100}%` }}
                aria-hidden
              />
            </div>

            <p className="tnum font-mono text-[12px] font-semibold leading-none text-ink">
              {week.started ? `${week.hours.toFixed(1)}h` : "—"}
              {/* The dashed line already marks the goal; naming it makes each
                  week readable on its own without reading the chart. */}
              <span className="font-normal text-ink-3">{` / ${goal}h`}</span>
            </p>
            <p className="mt-0.5 truncate text-[10px] text-ink-3">
              {format(week.start, "MMM d")}
            </p>
          </div>
        );
      })}
    </div>
  );
}

/* --------------------------------------------------------- Bullet ladder */

/**
 * A bullet row per cycle: the bar is actual hours, the notch is the target.
 * Dense and directly comparable down the column — far more scannable than a
 * grid of cards, and it puts every cycle on one shared scale.
 */
function CycleRow({
  cycle,
  scaleMax,
  expanded,
  onToggle,
  weeklyGoal,
}: {
  cycle: Cycle;
  scaleMax: number;
  expanded: boolean;
  onToggle: () => void;
  weeklyGoal: number;
}) {
  const theme = useChartTheme();
  const barPct = (cycle.hours / scaleMax) * 100;
  const targetPct = (cycle.targetHours / scaleMax) * 100;
  const overshootPct = Math.max(0, Math.min(100, barPct) - targetPct);

  return (
    <div
      className={cx(
        "border-b border-line last:border-b-0",
        cycle.isCurrent && "bg-[var(--brand-soft)]"
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-elevated sm:grid-cols-[130px_1fr_auto] sm:gap-4"
      >
        {/* Identity */}
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[13px] font-bold text-ink">
              {cycle.label}
            </span>
            {cycle.isCurrent && (
              <span className="size-1.5 shrink-0 rounded-full bg-brand" aria-hidden />
            )}
          </div>
          <p className="mt-0.5 truncate text-[11px] text-ink-3">
            {cycle.rangeLabel}
          </p>
        </div>

        {/* Bullet bar, split at the target.
            Length stays on one shared hours scale so cycles compare directly;
            splitting at the notch is what makes "target met" readable at a
            glance, which a single flat bar did not. */}
        <div className="min-w-0">
          <div className="relative h-6">
            <div className="absolute inset-y-1.5 left-0 right-0 rounded-full bg-[var(--sunken)]" />

            {/* Hours up to the target. */}
            <div
              className="absolute inset-y-1.5 left-0 rounded-full transition-[width] duration-500"
              style={{
                width: `${Math.min(barPct, targetPct)}%`,
                background: cycle.onTrack ? theme.earnings : theme.axis,
              }}
            />

            {/* Hours beyond the target, in a lighter tint of the same hue. */}
            {overshootPct > 0 && (
              <div
                className="absolute inset-y-1.5 rounded-r-full transition-[width] duration-500"
                style={{
                  left: `${targetPct}%`,
                  width: `${overshootPct}%`,
                  background: theme.earnings,
                  opacity: 0.42,
                  // 2px of surface keeps the two same-hue fills from merging.
                  borderLeft: `2px solid ${theme.surface}`,
                }}
              />
            )}

            {/* Target notch. Dashed while a cycle is still running, because
                that target is prorated and will keep moving. */}
            <span
              className="absolute inset-y-0 w-[2px] rounded-full"
              style={{
                left: `${Math.min(100, targetPct)}%`,
                background: cycle.isCurrent ? "transparent" : theme.ink,
                backgroundImage: cycle.isCurrent
                  ? `repeating-linear-gradient(to bottom, ${theme.ink} 0 3px, transparent 3px 6px)`
                  : undefined,
              }}
              aria-hidden
            />
          </div>
          <div className="mt-1 flex items-center gap-2 text-[11px] text-ink-3">
            <span className="tnum">
              <span className="font-semibold text-ink">
                {cycle.hours.toFixed(1)}h
              </span>{" "}
              of {cycle.targetHours}h target
            </span>
            {cycle.isCurrent && (
              <span className="hidden text-ink-3 sm:inline">
                · prorated, {cycle.fullTargetHours}h full cycle
              </span>
            )}
          </div>
        </div>

        {/* Numbers */}
        <div className="flex shrink-0 items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="tnum font-mono text-[13px] font-semibold text-ink">
              {money(cycle.earnings)}
            </p>
            <p
              className="tnum text-[11px] text-ink-3"
              title={
                cycle.hours < 1
                  ? "Too little logged time for a meaningful hourly rate"
                  : "Earnings from timed work divided by hours logged"
              }
            >
              {cycle.hours >= 1 ? `$${cycle.rate.toFixed(2)}/hr` : "—"}
            </p>
          </div>
          <Badge tone={cycle.onTrack ? "positive" : "warning"}>
            {cycle.onTrack ? (
              <>
                <Check className="size-3" strokeWidth={3} />
                {cycle.deltaHours >= 0 ? `+${cycle.deltaHours.toFixed(0)}h` : ""}
              </>
            ) : (
              `−${Math.abs(cycle.deltaHours).toFixed(0)}h`
            )}
          </Badge>
          <ChevronDown
            className={cx(
              "size-4 shrink-0 text-ink-3 transition-transform",
              expanded && "rotate-180"
            )}
            aria-hidden
          />
        </div>
      </button>

      {expanded && (
        <div className="border-t border-line bg-canvas px-3 py-3.5">
          <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Stat label="Hours" value={formatHours(cycle.hours)} />
            <Stat label="Earned" value={money(cycle.earnings)} />
            <Stat label="Tasks" value={String(cycle.tasks)} />
            <Stat
              label="Hourly rate"
              value={cycle.hours >= 1 ? `$${cycle.rate.toFixed(2)}/hr` : "—"}
            />
            <Stat label="From timed work" value={money(cycle.timedEarnings)} />
            <Stat label="Rewards & bonuses" value={money(cycle.bonusEarnings)} />
          </div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.06em] text-ink-3">
            Week by week
          </p>
          <WeekSegments cycle={cycle} goal={weeklyGoal} />
        </div>
      )}
    </div>
  );
}

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg border border-line bg-surface px-2.5 py-2">
    <p className="text-[10px] font-semibold uppercase tracking-[0.05em] text-ink-3">
      {label}
    </p>
    <p className="tnum mt-0.5 font-mono text-[13.5px] font-semibold text-ink">
      {value}
    </p>
  </div>
);

/* -------------------------------------------------------------- Section */

export function CyclesSection({
  cycles,
  weeklyGoal,
  anchor,
  onGoalChange,
  onOpenSettings,
}: {
  cycles: Cycle[];
  weeklyGoal: number;
  /** True calendar anchor, which may pre-date the first shown cycle. */
  anchor: Date | null;
  onGoalChange: (hours: number) => void;
  onOpenSettings: () => void;
}) {
  const legend = useChartTheme();
  const current = cycles.find((c) => c.isCurrent) ?? cycles[cycles.length - 1];
  // The live cycle already has a full hero above; expanding it here too
  // would just repeat the week-by-week grid.
  const [expanded, setExpanded] = useState<number | null>(null);
  const [order, setOrder] = useState<"newest" | "oldest">("newest");

  const ordered = useMemo(() => {
    const list = [...cycles];
    return order === "newest" ? list.reverse() : list;
  }, [cycles, order]);

  const scaleMax = useMemo(
    () =>
      Math.max(
        weeklyGoal * 4 * 1.1,
        ...cycles.map((c) => c.hours),
        1
      ),
    [cycles, weeklyGoal]
  );

  const completed = cycles.filter((c) => c.isComplete);
  const hitRate =
    completed.length > 0
      ? (completed.filter((c) => c.onTrack).length / completed.length) * 100
      : 0;
  const avgHours =
    completed.length > 0
      ? completed.reduce((a, c) => a + c.hours, 0) / completed.length
      : 0;

  if (cycles.length === 0) {
    return (
      <Card>
        <p className="py-10 text-center text-[13px] text-ink-3">
          No cycles yet — upload a CSV with dated work to start tracking.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Live cycle hero */}
      {current && (
        <Card>
          <CardHeader
            title={`${current.label} — in progress`}
            subtitle={`${current.rangeLabel} · week ${current.weeksElapsed} of 4`}
            icon={<Target className="size-4" />}
            actions={
              <div className="flex items-center gap-2">
                <label
                  htmlFor="weekly-goal"
                  className="hidden text-[11.5px] font-medium text-ink-3 sm:block"
                >
                  Weekly goal
                </label>
                <div className="flex h-9 items-center gap-1 rounded-lg border border-line bg-surface px-2">
                  <input
                    id="weekly-goal"
                    type="number"
                    min={1}
                    max={168}
                    step={0.5}
                    value={weeklyGoal}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      if (isFinite(v)) onGoalChange(Math.min(168, Math.max(1, v)));
                    }}
                    className="tnum w-12 bg-transparent text-right font-mono text-[13px] font-semibold text-ink focus:outline-none"
                  />
                  <span className="text-[12px] text-ink-3">h / wk</span>
                </div>
              </div>
            }
          />

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-3">
              <div>
                <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2">
                  <span className="tnum font-mono text-[26px] font-semibold leading-none tracking-[-0.02em] text-ink">
                    {current.hours.toFixed(1)}
                    <span className="text-[15px] text-ink-3">
                      {" "}
                      / {current.targetHours}h
                    </span>
                  </span>
                  <Badge tone={current.onTrack ? "positive" : "warning"}>
                    {current.onTrack
                      ? `Ahead by ${current.deltaHours.toFixed(1)}h`
                      : `Behind by ${Math.abs(current.deltaHours).toFixed(1)}h`}
                  </Badge>
                </div>
                <ProgressBar
                  value={current.pct}
                  height={10}
                  label="Cycle progress"
                />
                <p className="mt-1.5 text-[11.5px] text-ink-3">
                  Target is prorated: {weeklyGoal}h × {current.weeksElapsed} week
                  {current.weeksElapsed === 1 ? "" : "s"} elapsed. Full cycle is{" "}
                  {current.fullTargetHours}h.
                </p>
              </div>

              <WeekSegments cycle={current} goal={weeklyGoal} />
            </div>

            <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
              <Stat label="Earned this cycle" value={money(current.earnings)} />
              <Stat
                label="Hourly rate"
                value={current.hours >= 1 ? `$${current.rate.toFixed(2)}/hr` : "—"}
              />
              <Stat
                label="Days remaining"
                value={`${current.daysRemaining} of 28`}
              />
              <Stat
                label={`Pace for ${current.fullTargetHours}h`}
                value={
                  current.requiredPace > 0
                    ? `${current.requiredPace.toFixed(1)}h/day`
                    : "Target met"
                }
              />
            </div>
          </div>
        </Card>
      )}

      {/* Lifetime cycle stats */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        <Stat label="Cycles tracked" value={String(cycles.length)} />
        <Stat
          label="Targets hit"
          value={`${completed.filter((c) => c.onTrack).length} of ${
            completed.length
          }`}
        />
        <Stat label="Hit rate" value={`${hitRate.toFixed(0)}%`} />
        <Stat label="Avg hours / cycle" value={formatHours(avgHours)} />
      </div>

      {/* Bullet ladder */}
      <Card padded={false}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-3 py-3">
          <div>
            <h2 className="flex items-center gap-1.5 text-[15px] font-semibold tracking-[-0.01em] text-ink">
              <CalendarRange className="size-4 text-ink-3" />
              Cycle history
            </h2>
            <p className="mt-0.5 text-[12px] text-ink-3">
              All cycles share one scale: full width ={" "}
              <span className="tnum font-semibold text-ink-2">
                {Math.round(scaleMax)}h
              </span>
            </p>
            <ul className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-3">
              <li className="flex items-center gap-1.5">
                <span
                  className="h-2 w-4 rounded-full"
                  style={{ background: legend.earnings }}
                  aria-hidden
                />
                up to target
              </li>
              <li className="flex items-center gap-1.5">
                <span
                  className="h-2 w-4 rounded-full"
                  style={{ background: legend.earnings, opacity: 0.42 }}
                  aria-hidden
                />
                beyond target
              </li>
              <li className="flex items-center gap-1.5">
                <span
                  className="h-3 w-[2px] rounded-full"
                  style={{ background: legend.ink }}
                  aria-hidden
                />
                target ({weeklyGoal * 4}h)
              </li>
            </ul>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={order}
              onChange={(v) => setOrder(v as "newest" | "oldest")}
              options={[
                { value: "newest", label: "Newest first" },
                { value: "oldest", label: "Oldest first" },
              ]}
              className="w-[150px]"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={onOpenSettings}
              icon={<Flag className="size-3.5" />}
            >
              <span className="hidden sm:inline">Anchor</span>
            </Button>
          </div>
        </div>

        <div>
          {ordered.map((cycle) => (
            <CycleRow
              key={cycle.index}
              cycle={cycle}
              scaleMax={scaleMax}
              weeklyGoal={weeklyGoal}
              expanded={expanded === cycle.index}
              onToggle={() =>
                setExpanded(expanded === cycle.index ? null : cycle.index)
              }
            />
          ))}
        </div>
      </Card>

      <p className="flex items-center gap-1.5 px-1 text-[11.5px] text-ink-3">
        <TrendingUp className="size-3.5" />
        Fixed 28-day blocks counted from{" "}
        {anchor ? format(anchor, "MMM d, yyyy") : "the calendar year"} — a fixed
        calendar date, not your first logged day, so boundaries never move.
        Blocks that ended before your first entry are hidden. Change the start
        date in Settings to match your own schedule.
      </p>
    </div>
  );
}
