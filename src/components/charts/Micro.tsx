"use client";

import { useId } from "react";
import { format } from "date-fns";
import type { DayPoint } from "@/lib/metrics";
import { formatHours, money } from "@/lib/format";
import { cx } from "@/components/ui/Primitives";
import { useChartTheme } from "./ChartFrame";

/**
 * Hand-rolled SVG rather than a chart library: these render dozens of times
 * across the page and carry no axes, so recharts would be pure overhead.
 */
export function Sparkline({
  values,
  width = 96,
  height = 28,
  tone = "earnings",
  className,
}: {
  values: number[];
  width?: number;
  height?: number;
  tone?: "earnings" | "hours" | "muted";
  className?: string;
}) {
  const theme = useChartTheme();
  const gradientId = useId();
  const color =
    tone === "earnings"
      ? theme.earnings
      : tone === "hours"
      ? theme.hours
      : theme.ink3;

  if (values.length < 2) {
    return <div style={{ width, height }} className={className} aria-hidden />;
  }

  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const step = width / (values.length - 1);
  const y = (v: number) => height - 2 - ((v - min) / span) * (height - 4);

  const line = values.map((v, i) => `${i * step},${y(v)}`).join(" ");
  const area = `0,${height} ${line} ${width},${height}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cx("overflow-visible", className)}
      aria-hidden
      focusable="false"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.28} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${gradientId})`} />
      <polyline
        points={line}
        fill="none"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={width} cy={y(values[values.length - 1])} r={2.25} fill={color} />
    </svg>
  );
}

/**
 * Last-N-days column strip. Bars encode the measure; the day letter and the
 * value label carry identity so the bars never have to be read by colour.
 */
export function ActivityStrip({
  days,
  measure = "earnings",
  goalPerDay,
  className,
}: {
  days: DayPoint[];
  measure?: "earnings" | "hours";
  /** Draws a dashed target line and marks days that cleared it. */
  goalPerDay?: number;
  className?: string;
}) {
  const theme = useChartTheme();
  const color = measure === "earnings" ? theme.earnings : theme.hours;
  const values = days.map((d) => (measure === "earnings" ? d.earnings : d.hours));
  const max = Math.max(...values, goalPerDay ?? 0, 1);
  const fmt = (v: number) => (measure === "earnings" ? money(v) : formatHours(v));
  const today = format(new Date(), "yyyy-MM-dd");

  return (
    <div className={cx("flex items-end gap-1.5", className)}>
      {days.map((day, i) => {
        const value = values[i];
        const pct = (value / max) * 100;
        const isToday = day.iso === today;
        const hit = goalPerDay !== undefined && value >= goalPerDay;
        return (
          <div
            key={day.iso}
            className="group relative flex min-w-0 flex-1 flex-col items-center gap-1.5"
          >
            <div className="relative flex h-20 w-full items-end sm:h-24">
              {goalPerDay !== undefined && goalPerDay > 0 && (
                <span
                  className="absolute left-0 right-0 border-t border-dashed border-[var(--line-strong)]"
                  style={{ bottom: `${(goalPerDay / max) * 100}%` }}
                  aria-hidden
                />
              )}
              <div
                className="w-full rounded-t-[4px] transition-[height] duration-500"
                style={{
                  height: `${Math.max(value > 0 ? 3 : 0, pct)}%`,
                  background: color,
                  opacity: value === 0 ? 0.25 : hit || !goalPerDay ? 1 : 0.55,
                }}
              />
              {value === 0 && (
                <span
                  className="absolute inset-x-0 bottom-0 h-px bg-[var(--line-strong)]"
                  aria-hidden
                />
              )}
              {/* Tooltip on hover, and always reachable via the sr-only text. */}
              <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-line bg-surface px-2 py-1 text-[11.5px] shadow-lg group-hover:block">
                <span className="block font-semibold text-ink">
                  {format(day.date, "EEE, MMM d")}
                </span>
                <span className="tnum block text-ink-2">
                  {money(day.earnings)} · {formatHours(day.hours)}
                </span>
              </div>
            </div>
            <span
              className={cx(
                "text-[10.5px] font-medium",
                isToday ? "text-brand" : "text-ink-3"
              )}
            >
              {format(day.date, days.length > 10 ? "d" : "EEEEE")}
            </span>
            <span className="sr-only">
              {format(day.date, "EEEE MMM d")}: {fmt(value)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Progress ring for goal-vs-actual. The number in the middle is the headline;
 * the arc is the supporting visual, never the only signal.
 */
export function RadialProgress({
  value,
  size = 132,
  stroke = 10,
  label,
  caption,
  tone = "brand",
}: {
  /** 0-100, already capped by the caller. */
  value: number;
  size?: number;
  stroke?: number;
  label: string;
  caption?: string;
  tone?: "brand" | "warn";
}) {
  const theme = useChartTheme();
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(100, value));
  const color = tone === "brand" ? theme.earnings : theme.ink3;

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${label}${caption ? `, ${caption}` : ""}`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={theme.track}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct / 100)}
          style={{ transition: "stroke-dashoffset 700ms ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 text-center">
        <span className="tnum font-mono text-[20px] font-semibold leading-none text-ink">
          {label}
        </span>
        {caption && (
          <span className="px-2 text-[10.5px] leading-tight text-ink-3">
            {caption}
          </span>
        )}
      </div>
    </div>
  );
}
