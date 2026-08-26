"use client";

import { useMemo } from "react";
import { format, startOfDay, subDays } from "date-fns";
import {
  Activity,
  ArrowUpRight,
  Banknote,
  CalendarDays,
  Clock,
  Gauge,
  Layers,
  Lightbulb,
  Sparkles,
} from "lucide-react";
import type { Cycle, WeekProgress } from "@/lib/cycles";
import {
  bestDay,
  groupBy,
  lastNDays,
  periodDelta,
  summarize,
  weekdayProfile,
  type DayPoint,
  type Summary,
} from "@/lib/metrics";
import type { EarningRow } from "@/lib/types";
import { formatHours, money, moneyCompact } from "@/lib/format";
import { ActivityStrip, RadialProgress } from "@/components/charts/Micro";
import { StatTile } from "@/components/ui/StatTile";
import {
  Button,
  Card,
  CardHeader,
  Delta,
  ProgressBar,
  cx,
} from "@/components/ui/Primitives";

/* ------------------------------------------------------------- Insights */

interface Insight {
  Icon: typeof Sparkles;
  text: React.ReactNode;
  tone: "neutral" | "positive" | "warning";
}

/** Generated from the data rather than hard-coded, so they stay true. */
function buildInsights(
  rows: EarningRow[],
  summary: Summary,
  week: WeekProgress,
  cycle: Cycle | null,
  now: Date
): Insight[] {
  const out: Insight[] = [];
  const last30 = lastNDays(rows, 30, now);
  const peak = bestDay(last30);
  const weekdays = weekdayProfile(rows);
  const bestWeekday = [...weekdays].sort((a, b) => b.avgEarnings - a.avgEarnings)[0];
  const projects = groupBy(rows, "projectName");
  const paidProjects = projects.filter((p) => p.hours > 0.5);
  const richest = [...paidProjects].sort((a, b) => b.rate - a.rate)[0];

  const delta7 = periodDelta(
    rows,
    subDays(startOfDay(now), 6),
    startOfDay(now),
    (s) => s.net
  );

  if (Math.abs(delta7.pct) >= 1) {
    out.push({
      Icon: ArrowUpRight,
      tone: delta7.change >= 0 ? "positive" : "warning",
      text: (
        <>
          You earned{" "}
          <strong className="font-semibold text-ink">
            {money(Math.abs(delta7.change))}
          </strong>{" "}
          {delta7.change >= 0 ? "more" : "less"} in the last 7 days than the 7
          before ({delta7.pct >= 0 ? "+" : "−"}
          {Math.abs(delta7.pct).toFixed(0)}%).
        </>
      ),
    });
  }

  if (peak && peak.earnings > 0) {
    out.push({
      Icon: Sparkles,
      tone: "neutral",
      text: (
        <>
          Best day this month was{" "}
          <strong className="font-semibold text-ink">
            {format(peak.date, "EEEE, MMM d")}
          </strong>{" "}
          at {money(peak.earnings)} across {formatHours(peak.hours)}.
        </>
      ),
    });
  }

  if (bestWeekday && bestWeekday.avgEarnings > 0) {
    out.push({
      Icon: CalendarDays,
      tone: "neutral",
      text: (
        <>
          <strong className="font-semibold text-ink">
            {bestWeekday.day}
          </strong>{" "}
          is your strongest weekday, averaging{" "}
          {money(bestWeekday.avgEarnings)} per active day.
        </>
      ),
    });
  }

  if (summary.bonusEarnings > 0) {
    const share = (summary.bonusEarnings / summary.net) * 100;
    out.push({
      Icon: Banknote,
      tone: "neutral",
      text: (
        <>
          <strong className="font-semibold text-ink">
            {money(summary.bonusEarnings)}
          </strong>{" "}
          ({share.toFixed(0)}%) came from rewards and adjustments with no logged
          time — lifting your rate from ${summary.hourlyRate.toFixed(2)} to $
          {summary.effectiveRate.toFixed(2)}/hr.
        </>
      ),
    });
  }

  if (richest) {
    out.push({
      Icon: Gauge,
      tone: "neutral",
      text: (
        <>
          <strong className="font-semibold text-ink">{richest.name}</strong> pays
          the best at ${richest.rate.toFixed(2)}/hr across{" "}
          {formatHours(richest.hours)}.
        </>
      ),
    });
  }

  if (cycle?.isCurrent && cycle.requiredPace > 0) {
    out.push({
      Icon: Clock,
      tone: cycle.onTrack ? "positive" : "warning",
      text: (
        <>
          To finish {cycle.label} at {cycle.fullTargetHours}h you need{" "}
          <strong className="font-semibold text-ink">
            {cycle.requiredPace.toFixed(1)}h/day
          </strong>{" "}
          for the remaining {cycle.daysRemaining} day
          {cycle.daysRemaining === 1 ? "" : "s"}.
        </>
      ),
    });
  }

  if (summary.pending > 0) {
    out.push({
      Icon: Layers,
      tone: "neutral",
      text: (
        <>
          <strong className="font-semibold text-ink">
            {money(summary.pending)}
          </strong>{" "}
          is still pending payment.
        </>
      ),
    });
  }

  if (week.deltaHours < 0 && week.daysRemaining > 0) {
    const perDay = Math.abs(week.deltaHours) / (week.daysRemaining + 1);
    out.push({
      Icon: Activity,
      tone: "warning",
      text: (
        <>
          {formatHours(Math.abs(week.deltaHours))} left to hit this week&apos;s{" "}
          {week.goalHours}h goal — about{" "}
          <strong className="font-semibold text-ink">
            {perDay.toFixed(1)}h/day
          </strong>{" "}
          from here.
        </>
      ),
    });
  }

  return out.slice(0, 6);
}

/* -------------------------------------------------------------- Section */

export function OverviewSection({
  rows,
  summary,
  week,
  cycle,
  now,
  onOpenAnalytics,
  onOpenSettings,
}: {
  rows: EarningRow[];
  summary: Summary;
  week: WeekProgress;
  cycle: Cycle | null;
  now: Date;
  onOpenAnalytics: () => void;
  onOpenSettings: () => void;
}) {
  const last7 = useMemo(() => lastNDays(rows, 7, now), [rows, now]);
  const last30 = useMemo(() => lastNDays(rows, 30, now), [rows, now]);
  const insights = useMemo(
    () => buildInsights(rows, summary, week, cycle, now),
    [rows, summary, week, cycle, now]
  );

  const deltas = useMemo(() => {
    const start = subDays(startOfDay(now), 29);
    const end = startOfDay(now);
    const start7 = subDays(startOfDay(now), 6);
    return {
      net7: periodDelta(rows, start7, end, (s) => s.net),
      net: periodDelta(rows, start, end, (s) => s.net),
      hours: periodDelta(rows, start, end, (s) => s.hours),
      tasks: periodDelta(rows, start, end, (s) => s.tasks),
      rate: periodDelta(rows, start, end, (s) => s.effectiveRate),
    };
  }, [rows, now]);

  const week7 = useMemo(() => summarize(rowsOf(last7)), [last7]);
  const sparkNet = last30.map((d) => d.earnings);
  const sparkHours = last30.map((d) => d.hours);

  const greeting = greetingFor(now);
  const paceDelta = week.hours - week.paceHours;

  return (
    <div className="space-y-4">
      {/* Hero */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12.5px] font-medium text-ink-3">
            {greeting} · {format(now, "EEEE, MMMM d, yyyy")}
          </p>
          <h2 className="mt-1 text-[22px] font-extrabold tracking-[-0.03em] text-ink sm:text-[28px]">
            {headline(week)}
          </h2>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={onOpenAnalytics}
          icon={<Activity className="size-3.5" />}
        >
          Explore trends
        </Button>
      </div>

      {/* Current week progress */}
      <Card>
        <CardHeader
          title="Current week progress"
          subtitle={`${format(week.start, "MMM d")} – ${format(
            week.end,
            "MMM d"
          )} · goal ${week.goalHours}h`}
          icon={<Clock className="size-4" />}
          actions={
            <Button variant="ghost" size="sm" onClick={onOpenSettings}>
              Change goal
            </Button>
          }
        />

        <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-6">
          <RadialProgress
            value={week.pct}
            label={`${week.pct.toFixed(0)}%`}
            caption={`${week.hours.toFixed(1)}h of ${week.goalHours}h`}
            size={130}
          />

          <div className="w-full min-w-0 flex-1 space-y-3">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <MiniStat label="Logged" value={formatHours(week.hours)} />
              <MiniStat label="Earned" value={money(week.earnings)} />
              <MiniStat
                label="Vs pace"
                value={`${paceDelta >= 0 ? "+" : "−"}${Math.abs(
                  paceDelta
                ).toFixed(1)}h`}
                tone={paceDelta >= 0 ? "positive" : "negative"}
              />
              <MiniStat
                label="Days left"
                value={String(week.daysRemaining)}
              />
            </div>

            <div>
              <ProgressBar
                value={week.pct}
                marker={
                  week.goalHours
                    ? (week.paceHours / week.goalHours) * 100
                    : undefined
                }
                height={10}
                label="Weekly goal"
              />
              <p className="mt-1.5 text-[11.5px] text-ink-3">
                The tick marks where you&apos;d be on day {week.daysElapsed} of
                7 at an even pace ({week.paceHours.toFixed(1)}h).
              </p>
            </div>

            <div className="flex gap-1.5">
              {week.days.map((d) => {
                const target = week.goalHours / 7;
                const pct = target ? Math.min(100, (d.hours / target) * 100) : 0;
                return (
                  <div key={d.date.toISOString()} className="flex-1">
                    <div className="flex h-10 items-end overflow-hidden rounded-md bg-[var(--sunken)]">
                      <div
                        className={cx(
                          "w-full rounded-md transition-[height] duration-500",
                          d.isFuture ? "bg-[var(--line-strong)]" : "bg-brand"
                        )}
                        style={{ height: `${Math.max(d.hours > 0 ? 6 : 0, pct)}%` }}
                        title={`${format(d.date, "EEE d")} — ${formatHours(
                          d.hours
                        )}, ${money(d.earnings)}`}
                      />
                    </div>
                    <p
                      className={cx(
                        "mt-1 text-center text-[10px] font-semibold",
                        d.isToday ? "text-brand" : "text-ink-3"
                      )}
                    >
                      {d.label}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Card>

      {/* Global overview */}
      <div>
        <SectionLabel
          icon={<Layers className="size-3.5" />}
          title="Global overview"
          hint="All time · cancelled payouts excluded"
        />
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
          <StatTile
            label="Net earned"
            value={money(summary.net)}
            sub={`${summary.rows.toLocaleString()} entries`}
            spark={sparkNet}
            delta={deltas.net.pct}
            deltaFormat={(n) => `${n.toFixed(1)}%`}
            deltaLabel="vs prev 30 days"
          />
          <StatTile
            label="Hours logged"
            value={formatHours(summary.hours)}
            sub={`${summary.activeDays} active days`}
            spark={sparkHours}
            sparkTone="hours"
            delta={deltas.hours.pct}
            deltaFormat={(n) => `${n.toFixed(1)}%`}
            deltaLabel="vs prev 30 days"
          />
          <StatTile
            label="Effective rate"
            value={`$${summary.effectiveRate.toFixed(2)}`}
            sub={`$${summary.hourlyRate.toFixed(2)}/hr from timed work`}
            delta={deltas.rate.change}
            deltaFormat={(n) => `$${n.toFixed(2)}`}
            deltaLabel="vs prev 30 days"
          />
          <StatTile
            label="Tasks"
            value={summary.tasks.toLocaleString()}
            sub={`${summary.projects} projects`}
            delta={deltas.tasks.pct}
            deltaFormat={(n) => `${n.toFixed(1)}%`}
            deltaLabel="vs prev 30 days"
          />
        </div>
      </div>

      {/* Last 7 days + insights */}
      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader
            title="Last 7 days activity"
            subtitle={`${money(week7.net)} earned · ${formatHours(
              week7.hours
            )} logged · vs previous 7 days`}
            icon={<Activity className="size-4" />}
            actions={
              <Delta
                value={deltas.net7.pct}
                format={(n) => `${n.toFixed(0)}%`}
              />
            }
          />
          <ActivityStrip days={last7} measure="earnings" />
          <div className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-3">
            <MiniStat
              label="Busiest day"
              value={
                bestDay(last7)?.earnings
                  ? format(bestDay(last7)!.date, "EEE")
                  : "—"
              }
            />
            <MiniStat
              label="Daily average"
              value={moneyCompact(week7.net / 7)}
            />
            <MiniStat
              label="Days worked"
              value={`${last7.filter((d) => d.hours > 0).length}/7`}
            />
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Quick insights"
            subtitle="Read from your data, not presets"
            icon={<Lightbulb className="size-4" />}
          />
          {insights.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-ink-3">
              Not enough history yet — insights appear as you log more work.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {insights.map((insight, i) => (
                <li key={i} className="flex gap-2.5">
                  <span
                    className={cx(
                      "mt-0.5 grid size-6 shrink-0 place-items-center rounded-md",
                      insight.tone === "positive"
                        ? "bg-[var(--brand-soft)] text-[var(--pos)]"
                        : insight.tone === "warning"
                        ? "bg-[color-mix(in_srgb,var(--warn)_14%,transparent)] text-[var(--warn)]"
                        : "bg-elevated text-ink-2"
                    )}
                  >
                    <insight.Icon className="size-3.5" />
                  </span>
                  <p className="text-[12.5px] leading-relaxed text-ink-2">
                    {insight.text}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- Helpers */

function rowsOf(points: DayPoint[]): EarningRow[] {
  // Rebuilds a minimal row set from day points so summarize() can be reused.
  return points.map((p) => ({
    workDate: p.iso,
    date: p.date,
    itemID: "",
    duration: p.hours * 3600,
    durationString: "",
    rateApplied: "",
    rateValue: 0,
    payout: p.earnings,
    payType: "",
    projectName: "",
    status: "paid",
    statusLabel: "Paid",
  }));
}

function greetingFor(now: Date): string {
  const h = now.getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

/**
 * Reads the current week only. Deriving this from the cycle produced a
 * headline that claimed "ahead of pace" while the week sat 4.4h behind it.
 */
function headline(week: WeekProgress): string {
  if (week.hours === 0) return "Nothing logged this week yet.";
  if (week.rawPct >= 100) return "Weekly goal cleared.";
  if (week.hours >= week.paceHours) return "You're ahead of pace.";
  const left = Math.max(0, week.goalHours - week.hours);
  return `${left.toFixed(1)}h to go this week.`;
}

function SectionLabel({
  icon,
  title,
  hint,
}: {
  icon: React.ReactNode;
  title: string;
  hint?: string;
}) {
  return (
    <div className="mb-2.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
      <h3 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.07em] text-ink-3">
        <span>{icon}</span>
        {title}
      </h3>
      {hint && <span className="text-[11.5px] text-ink-3">· {hint}</span>}
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative";
}) {
  return (
    <div className="rounded-lg border border-line bg-canvas px-2.5 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.05em] text-ink-3">
        {label}
      </p>
      <p
        className={cx(
          "tnum mt-0.5 font-mono text-[14px] font-semibold text-ink",
          tone === "positive" && "text-[var(--pos)]",
          tone === "negative" && "text-[var(--neg)]"
        )}
      >
        {value}
      </p>
    </div>
  );
}

