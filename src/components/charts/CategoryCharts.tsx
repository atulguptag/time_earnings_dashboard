"use client";

import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { GroupStat, WeekdayStat } from "@/lib/metrics";
import { ellipsis, formatHours, money, moneyCompact } from "@/lib/format";
import { seriesColor } from "@/lib/palette";
import {
  ChartBox,
  ChartTooltip,
  axisProps,
  useChartTheme,
} from "./ChartFrame";

interface TipPayload<T> {
  active?: boolean;
  payload?: { payload: T }[];
}

/**
 * Horizontal bars, sorted by magnitude, with the value direct-labelled at the
 * end of each bar. Direct labels are the relief for the light-mode contrast
 * warning on the lighter categorical slots.
 */
export function CategoryBarChart({ data }: { data: GroupStat[] }) {
  const theme = useChartTheme();
  const max = Math.max(...data.map((d) => d.earnings), 1);

  // Height follows the row count. A fixed box clipped the first and last
  // rows once "Other" pushed the list past six entries.
  return (
    <div className="w-full">
      <ul className="flex flex-col gap-3">
        {data.map((item, i) => {
          const color = seriesColor(theme, i, item.name);
          return (
            <li key={item.name} className="group">
              <div className="mb-1 flex items-baseline justify-between gap-2">
                <span className="flex min-w-0 items-center gap-1.5">
                  <span
                    className="size-2.5 shrink-0 rounded-[3px]"
                    style={{ background: color }}
                    aria-hidden
                  />
                  <span
                    className="truncate text-[12.5px] font-medium text-ink"
                    title={item.name}
                  >
                    {ellipsis(item.name, 28)}
                  </span>
                </span>
                <span className="tnum shrink-0 text-[12.5px] font-semibold text-ink">
                  {money(item.earnings)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--sunken)]">
                  <div
                    className="h-full rounded-full transition-[width] duration-500"
                    style={{
                      width: `${(item.earnings / max) * 100}%`,
                      background: color,
                    }}
                  />
                </div>
                <span className="tnum w-24 shrink-0 text-right text-[11.5px] text-ink-3">
                  {formatHours(item.hours)} · {item.share.toFixed(1)}%
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Share of earnings by category. Sectors carry a legend and direct values. */
export function DonutChart({
  data,
  height = 240,
}: {
  data: GroupStat[];
  height?: number;
}) {
  const theme = useChartTheme();
  const total = data.reduce((a, d) => a + d.earnings, 0);

  const Tip = ({ active, payload }: TipPayload<GroupStat>) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    const i = data.findIndex((x) => x.name === d.name);
    return (
      <ChartTooltip
        title={d.name}
        rows={[
          {
            label: "Earned",
            value: money(d.earnings),
            color: seriesColor(theme, i, d.name),
          },
          { label: "Share", value: `${d.share.toFixed(1)}%` },
          { label: "Hours", value: formatHours(d.hours) },
        ]}
      />
    );
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <ChartBox height={height} className="sm:w-1/2">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="earnings"
              nameKey="name"
              innerRadius="58%"
              outerRadius="86%"
              paddingAngle={2}
              stroke={theme.surface}
              strokeWidth={2}
              isAnimationActive={false}
            >
              {data.map((d, i) => (
                <Cell key={d.name} fill={seriesColor(theme, i, d.name)} />
              ))}
            </Pie>
            <Tooltip content={Tip as never} />
          </PieChart>
        </ResponsiveContainer>
      </ChartBox>

      <div className="flex-1 space-y-1.5">
        {data.map((d, i) => (
          <div key={d.name} className="flex items-center gap-2 text-[12.5px]">
            <span
              className="size-2.5 shrink-0 rounded-[3px]"
              style={{ background: seriesColor(theme, i, d.name) }}
              aria-hidden
            />
            <span className="min-w-0 flex-1 truncate text-ink-2" title={d.name}>
              {d.name}
            </span>
            <span className="tnum shrink-0 font-semibold text-ink">
              {money(d.earnings)}
            </span>
            <span className="tnum w-11 shrink-0 text-right text-ink-3">
              {total > 0 ? ((d.earnings / total) * 100).toFixed(0) : 0}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Average earnings per active weekday — when the work actually happens. */
export function WeekdayChart({
  data,
  height = 220,
}: {
  data: WeekdayStat[];
  height?: number;
}) {
  const theme = useChartTheme();

  const Tip = ({ active, payload }: TipPayload<WeekdayStat>) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <ChartTooltip
        title={d.day}
        rows={[
          {
            label: "Avg / active day",
            value: money(d.avgEarnings),
            color: theme.earnings,
          },
          { label: "Total earned", value: money(d.earnings) },
          { label: "Total hours", value: formatHours(d.hours) },
          { label: "Active days", value: String(d.activeDays) },
        ]}
      />
    );
  };

  return (
    <ChartBox height={height}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
          <XAxis dataKey="day" {...axisProps(theme)} />
          <YAxis width={48} tickFormatter={moneyCompact} {...axisProps(theme)} />
          <Tooltip content={Tip as never} cursor={{ fill: theme.grid }} />
          <Bar dataKey="avgEarnings" radius={[4, 4, 0, 0]} maxBarSize={44}>
            {data.map((d) => (
              <Cell key={d.day} fill={theme.earnings} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartBox>
  );
}

