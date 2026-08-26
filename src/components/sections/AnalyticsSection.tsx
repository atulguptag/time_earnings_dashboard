"use client";

import { useMemo, useState } from "react";
import {
  BarChart3,
  CalendarClock,
  Coins,
  LineChart,
  PieChart,
  TrendingUp,
} from "lucide-react";
import {
  bucketBy,
  cumulative,
  foldOther,
  groupBy,
  weekdayProfile,
  type Granularity,
  type Summary,
} from "@/lib/metrics";
import { SAFE_SLOTS } from "@/lib/palette";
import type { EarningRow, Filters } from "@/lib/types";
import { formatHours, money } from "@/lib/format";
import { FilterBar } from "@/components/filters/FilterBar";
import { CumulativeChart, TrendChart } from "@/components/charts/TrendChart";
import {
  CategoryBarChart,
  DonutChart,
  WeekdayChart,
} from "@/components/charts/CategoryCharts";
import { Card, CardHeader, EmptyState } from "@/components/ui/Primitives";
import { Select } from "@/components/ui/Select";

export function AnalyticsSection({
  rows,
  filtered,
  summary,
  filters,
  onFiltersChange,
  projects,
  payTypes,
  statuses,
  now,
}: {
  rows: EarningRow[];
  filtered: EarningRow[];
  summary: Summary;
  filters: Filters;
  onFiltersChange: (f: Filters) => void;
  projects: string[];
  payTypes: string[];
  statuses: { key: string; label: string }[];
  now: Date;
}) {
  const [granularity, setGranularity] = useState<Granularity>("day");

  const buckets = useMemo(
    () => bucketBy(filtered, granularity),
    [filtered, granularity]
  );
  const running = useMemo(() => cumulative(buckets), [buckets]);
  const byProject = useMemo(
    () => foldOther(groupBy(filtered, "projectName"), SAFE_SLOTS),
    [filtered]
  );
  const byPayType = useMemo(
    () => foldOther(groupBy(filtered, "payType"), SAFE_SLOTS),
    [filtered]
  );
  const weekdays = useMemo(() => weekdayProfile(filtered), [filtered]);

  const granularityOptions = [
    { value: "day", label: "Daily" },
    { value: "week", label: "Weekly" },
    { value: "month", label: "Monthly" },
  ];

  const empty = filtered.length === 0;

  return (
    <div className="space-y-4">
      <FilterBar
        filters={filters}
        onChange={onFiltersChange}
        projects={projects}
        payTypes={payTypes}
        statuses={statuses}
        resultCount={filtered.length}
        totalCount={rows.length}
        now={now}
      />

      {empty ? (
        <Card>
          <EmptyState
            icon={<BarChart3 className="size-6" />}
            title="Nothing to chart"
            hint="No rows match the current filters. Widen the date range or clear a filter to see trends."
          />
        </Card>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader
                title="Earnings over time"
                subtitle={`${money(summary.net)} across ${buckets.length} ${
                  granularity === "day"
                    ? "days"
                    : granularity === "week"
                    ? "weeks"
                    : "months"
                }`}
                icon={<LineChart className="size-4" />}
                actions={
                  <Select
                    value={granularity}
                    onChange={(v) => setGranularity(v as Granularity)}
                    options={granularityOptions}
                    className="w-[116px]"
                  />
                }
              />
              <TrendChart data={buckets} measure="earnings" kind="area" />
            </Card>

            <Card>
              <CardHeader
                title="Hours over time"
                subtitle={`${formatHours(summary.hours)} logged`}
                icon={<CalendarClock className="size-4" />}
              />
              {/* Separate chart, never a second axis on the one above. */}
              <TrendChart data={buckets} measure="hours" kind="bar" />
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader
                title="Cumulative earnings"
                subtitle="Running total across the selected range"
                icon={<TrendingUp className="size-4" />}
              />
              <CumulativeChart data={running} />
            </Card>

            <Card>
              <CardHeader
                title="Earnings by pay type"
                subtitle={`${byPayType.length} categories`}
                icon={<PieChart className="size-4" />}
              />
              <DonutChart data={byPayType} />
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader
                title="Earnings by project"
                subtitle={`Top ${Math.min(
                  SAFE_SLOTS,
                  byProject.length
                )} by payout`}
                icon={<Coins className="size-4" />}
              />
              <CategoryBarChart data={byProject} />
            </Card>

            <Card>
              <CardHeader
                title="Weekday rhythm"
                subtitle="Average earnings per active day"
                icon={<BarChart3 className="size-4" />}
              />
              <WeekdayChart data={weekdays} height={280} />
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
