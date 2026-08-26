"use client";

import { useId } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Bucket } from "@/lib/metrics";
import { formatHours, money, moneyCompact } from "@/lib/format";
import { ChartBox, ChartTooltip, axisProps, useChartTheme } from "./ChartFrame";

type Measure = "earnings" | "hours";

interface TipPayload {
  active?: boolean;
  payload?: { payload: Bucket }[];
}

/**
 * One measure, one axis. Earnings and hours are deliberately separate charts
 * rather than a dual-axis overlay, which would make the two scales lie.
 */
export function TrendChart({
  data,
  measure,
  kind = "area",
  height = 260,
}: {
  data: Bucket[];
  measure: Measure;
  kind?: "area" | "bar";
  height?: number;
}) {
  const theme = useChartTheme();
  const gradientId = useId();
  const color = measure === "earnings" ? theme.earnings : theme.hours;
  const tickFmt = (v: number) =>
    measure === "earnings" ? moneyCompact(v) : `${Math.round(v)}h`;

  const Tip = ({ active, payload }: TipPayload) => {
    if (!active || !payload?.length) return null;
    const b = payload[0].payload;
    return (
      <ChartTooltip
        title={b.label}
        rows={[
          { label: "Earned", value: money(b.earnings), color: theme.earnings },
          { label: "Hours", value: formatHours(b.hours), color: theme.hours },
          { label: "Entries", value: String(b.tasks) },
        ]}
      />
    );
  };

  // Keep the x-axis readable no matter how many buckets are in range.
  const interval = Math.max(0, Math.floor(data.length / 8) - 1);

  const shared = (
    <>
      <CartesianGrid stroke={theme.grid} vertical={false} />
      <XAxis dataKey="label" interval={interval} minTickGap={8} {...axisProps(theme)} />
      <YAxis width={48} tickFormatter={tickFmt} {...axisProps(theme)} />
      <Tooltip
        content={Tip as never}
        cursor={{ fill: theme.grid, stroke: theme.axis }}
      />
    </>
  );

  return (
    <ChartBox height={height}>
      <ResponsiveContainer width="100%" height="100%">
        {kind === "area" ? (
          <AreaChart data={data} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.22} />
                <stop offset="100%" stopColor={color} stopOpacity={0.01} />
              </linearGradient>
            </defs>
            {shared}
            <Area
              type="monotone"
              dataKey={measure}
              stroke={color}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              activeDot={{ r: 4, strokeWidth: 2, stroke: theme.surface }}
              dot={false}
            />
          </AreaChart>
        ) : (
          <BarChart data={data} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
            {shared}
            <Bar
              dataKey={measure}
              fill={color}
              radius={[4, 4, 0, 0]}
              maxBarSize={38}
            />
          </BarChart>
        )}
      </ResponsiveContainer>
    </ChartBox>
  );
}

/** Running total — the "how far have I come" view. */
export function CumulativeChart({
  data,
  height = 260,
}: {
  data: (Bucket & { total: number })[];
  height?: number;
}) {
  const theme = useChartTheme();
  const gradientId = useId();

  const Tip = ({ active, payload }: TipPayload) => {
    if (!active || !payload?.length) return null;
    const b = payload[0].payload as Bucket & { total: number };
    return (
      <ChartTooltip
        title={b.label}
        rows={[
          { label: "Running total", value: money(b.total), color: theme.earnings },
          { label: "This period", value: money(b.earnings) },
        ]}
      />
    );
  };

  const interval = Math.max(0, Math.floor(data.length / 8) - 1);

  return (
    <ChartBox height={height}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={theme.earnings} stopOpacity={0.24} />
              <stop offset="100%" stopColor={theme.earnings} stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={theme.grid} vertical={false} />
          <XAxis dataKey="label" interval={interval} minTickGap={8} {...axisProps(theme)} />
          <YAxis width={52} tickFormatter={moneyCompact} {...axisProps(theme)} />
          <Tooltip content={Tip as never} cursor={{ stroke: theme.axis }} />
          <Area
            type="monotone"
            dataKey="total"
            stroke={theme.earnings}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            activeDot={{ r: 4, strokeWidth: 2, stroke: theme.surface }}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartBox>
  );
}
