"use client";

import { format } from "date-fns";
import { Clock, Flame, Target, TrendingUp, Wallet } from "lucide-react";
import type { Cycle, WeekProgress } from "@/lib/cycles";
import type { GroupStat, Summary } from "@/lib/metrics";
import { formatHours, money, moneyCompact } from "@/lib/format";
import { seriesColor } from "@/lib/palette";
import { useChartTheme } from "@/components/charts/ChartFrame";
import { Badge, ProgressBar, cx } from "@/components/ui/Primitives";

function PanelBlock({
  title,
  icon,
  children,
  action,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="border-b border-line py-4 first:pt-0 last:border-b-0">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.07em] text-ink-3">
          <span className="text-ink-3">{icon}</span>
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}

const Row = ({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative" | "muted";
}) => (
  <div className="flex items-baseline justify-between gap-2 text-[12.5px]">
    <span className="min-w-0 truncate text-ink-2">{label}</span>
    <span
      className={cx(
        "tnum shrink-0 font-semibold",
        tone === "positive"
          ? "text-[var(--pos)]"
          : tone === "negative"
          ? "text-[var(--neg)]"
          : tone === "muted"
          ? "text-ink-3"
          : "text-ink"
      )}
    >
      {value}
    </span>
  </div>
);

export function InsightPanel({
  cycle,
  week,
  summary,
  topProjects,
  streak,
  onOpenCycles,
  showWeek = true,
}: {
  cycle: Cycle | null;
  week: WeekProgress;
  summary: Summary;
  topProjects: GroupStat[];
  streak: { current: number; longest: number };
  onOpenCycles: () => void;
  /** Off where the surrounding page already renders week progress. */
  showWeek?: boolean;
}) {
  const theme = useChartTheme();
  const weekPace = week.goalHours > 0 ? (week.paceHours / week.goalHours) * 100 : 0;

  return (
    <div
      className={cx(
        "flex flex-col",
        !showWeek && "sm:grid sm:grid-cols-2 sm:gap-x-6 xl:block"
      )}
    >
      {cycle && (
        <PanelBlock
          title="Current cycle"
          icon={<Target className="size-3.5" />}
          action={
            <button
              onClick={onOpenCycles}
              className="text-[11px] font-semibold text-brand hover:underline"
            >
              View all
            </button>
          }
        >
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <span className="text-[13px] font-bold text-ink">{cycle.label}</span>
            <Badge tone={cycle.onTrack ? "positive" : "warning"}>
              {cycle.onTrack ? "On track" : "Behind"}
            </Badge>
          </div>
          <p className="mb-2.5 text-[11.5px] text-ink-3">{cycle.rangeLabel}</p>

          <div className="mb-1.5 flex items-baseline justify-between gap-2">
            <span className="tnum font-mono text-[19px] font-semibold leading-none text-ink">
              {cycle.hours.toFixed(1)}
              <span className="text-[13px] text-ink-3">
                /{cycle.targetHours}h
              </span>
            </span>
            <span className="tnum text-[12px] font-semibold text-ink-2">
              {cycle.pct.toFixed(0)}%
            </span>
          </div>
          <ProgressBar
            value={cycle.pct}
            label={`${cycle.label} progress`}
            height={7}
          />

          <div className="mt-3 space-y-1.5">
            <Row
              label={cycle.onTrack ? "Ahead by" : "Short by"}
              value={`${Math.abs(cycle.deltaHours).toFixed(1)}h`}
              tone={cycle.onTrack ? "positive" : "negative"}
            />
            <Row label="Earned" value={money(cycle.earnings)} />
            {cycle.isCurrent && (
              <>
                <Row
                  label="Days remaining"
                  value={String(cycle.daysRemaining)}
                  tone="muted"
                />
                {cycle.requiredPace > 0 && (
                  <Row
                    label={`Pace for ${cycle.fullTargetHours}h`}
                    value={`${cycle.requiredPace.toFixed(1)}h/day`}
                    tone="muted"
                  />
                )}
              </>
            )}
          </div>
        </PanelBlock>
      )}

      {showWeek && (
      <PanelBlock title="This week" icon={<Clock className="size-3.5" />}>
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          <span className="tnum font-mono text-[19px] font-semibold leading-none text-ink">
            {week.hours.toFixed(1)}
            <span className="text-[13px] text-ink-3">/{week.goalHours}h</span>
          </span>
          <span className="tnum text-[12px] font-semibold text-ink-2">
            {week.pct.toFixed(0)}%
          </span>
        </div>
        <ProgressBar
          value={week.pct}
          marker={weekPace}
          label="Weekly goal progress"
          height={7}
        />
        <p className="mt-2 text-[11.5px] leading-snug text-ink-3">
          Pace marker sits at {week.paceHours.toFixed(1)}h — where you would be
          on day {week.daysElapsed} of 7.
        </p>

        <div className="mt-3 flex gap-1">
          {week.days.map((d) => {
            const share = week.goalHours
              ? Math.min(100, (d.hours / (week.goalHours / 7)) * 100)
              : 0;
            return (
              <div key={d.date.toISOString()} className="flex-1 text-center">
                <div className="mx-auto h-9 w-full overflow-hidden rounded-[3px] bg-[var(--sunken)]">
                  <div className="flex h-full items-end">
                    <div
                      className="w-full rounded-[3px] transition-[height] duration-500"
                      style={{
                        height: `${share}%`,
                        background: d.isFuture ? theme.ink3 : theme.earnings,
                        opacity: d.isFuture ? 0.25 : 1,
                      }}
                      title={`${format(d.date, "EEE")}: ${formatHours(d.hours)}`}
                    />
                  </div>
                </div>
                <span
                  className={cx(
                    "mt-1 block text-[9.5px] font-semibold",
                    d.isToday ? "text-brand" : "text-ink-3"
                  )}
                >
                  {d.label}
                </span>
              </div>
            );
          })}
        </div>
      </PanelBlock>
      )}

      <PanelBlock title="Payout status" icon={<Wallet className="size-3.5" />}>
        <div className="space-y-1.5">
          <Row label="Paid" value={money(summary.paid)} tone="positive" />
          <Row label="Pending" value={money(summary.pending)} />
          {summary.canceled > 0 && (
            <Row
              label="Cancelled"
              value={money(summary.canceled)}
              tone="negative"
            />
          )}
        </div>
        {summary.canceled > 0 && (
          <p className="mt-2 text-[11px] leading-snug text-ink-3">
            Cancelled payouts are excluded from every total on this dashboard.
          </p>
        )}
      </PanelBlock>

      {topProjects.length > 0 && (
        <PanelBlock
          title="Top projects"
          icon={<TrendingUp className="size-3.5" />}
        >
          <div className="space-y-2">
            {topProjects.map((p, i) => (
              <div key={p.name}>
                <div className="mb-1 flex items-baseline justify-between gap-2 text-[12.5px]">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span
                      className="size-2 shrink-0 rounded-[2px]"
                      style={{ background: seriesColor(theme, i, p.name) }}
                      aria-hidden
                    />
                    <span className="truncate text-ink-2" title={p.name}>
                      {p.name}
                    </span>
                  </span>
                  <span className="tnum shrink-0 font-semibold text-ink">
                    {moneyCompact(p.earnings)}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-[var(--sunken)]">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${p.share}%`,
                      background: seriesColor(theme, i, p.name),
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </PanelBlock>
      )}

      <PanelBlock title="Consistency" icon={<Flame className="size-3.5" />}>
        <div className="space-y-1.5">
          <Row
            label="Current streak"
            value={`${streak.current} day${streak.current === 1 ? "" : "s"}`}
            tone={streak.current > 0 ? "positive" : "muted"}
          />
          <Row label="Longest streak" value={`${streak.longest} days`} />
          <Row label="Active days" value={String(summary.activeDays)} />
        </div>
      </PanelBlock>
    </div>
  );
}
