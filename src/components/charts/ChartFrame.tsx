"use client";

import type { ReactNode } from "react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { chartTheme, type ChartTheme } from "@/lib/palette";
import { cx } from "@/components/ui/Primitives";

export function useChartTheme(): ChartTheme {
  const { resolved } = useTheme();
  return chartTheme(resolved);
}

/** Shared axis styling so every chart's chrome recedes identically. */
export function axisProps(theme: ChartTheme) {
  return {
    stroke: theme.axis,
    tick: { fill: theme.ink3, fontSize: 11 },
    tickLine: false,
    axisLine: false,
  } as const;
}

export interface TipRow {
  label: string;
  value: string;
  color?: string;
}

/** One tooltip shape for every chart in the app. */
export function ChartTooltip({
  title,
  rows,
}: {
  title: string;
  rows: TipRow[];
}) {
  return (
    <div className="pointer-events-none min-w-[140px] rounded-lg border border-line bg-surface px-2.5 py-2 shadow-lg shadow-black/10">
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.05em] text-ink-3">
        {title}
      </p>
      <div className="flex flex-col gap-1">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center gap-2 text-[12.5px]">
            {r.color && (
              <span
                className="size-2 shrink-0 rounded-[2px]"
                style={{ background: r.color }}
                aria-hidden
              />
            )}
            <span className="flex-1 text-ink-2">{r.label}</span>
            <span className="tnum font-semibold text-ink">{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Legend swatches sit beside text in normal ink — never coloured text. */
export function ChartLegend({
  items,
  className,
}: {
  items: { name: string; color: string; value?: string }[];
  className?: string;
}) {
  return (
    <ul className={cx("flex flex-wrap items-center gap-x-3 gap-y-1.5", className)}>
      {items.map((item) => (
        <li key={item.name} className="flex items-center gap-1.5 text-[12px]">
          <span
            className="size-2.5 shrink-0 rounded-[3px]"
            style={{ background: item.color }}
            aria-hidden
          />
          <span className="text-ink-2">{item.name}</span>
          {item.value && (
            <span className="tnum font-semibold text-ink">{item.value}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

/** Fixed-height wrapper; charts never collapse to zero height. */
export function ChartBox({
  height,
  children,
  className,
}: {
  height: number;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("w-full", className)} style={{ height }}>
      {children}
    </div>
  );
}
