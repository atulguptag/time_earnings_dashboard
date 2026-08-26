"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ArrowDown, ArrowUp, Boxes } from "lucide-react";
import { groupBy, type GroupStat } from "@/lib/metrics";
import { seriesColor } from "@/lib/palette";
import type { EarningRow, Filters } from "@/lib/types";
import { formatHours, money } from "@/lib/format";
import { FilterBar } from "@/components/filters/FilterBar";
import { useChartTheme } from "@/components/charts/ChartFrame";
import { Card, EmptyState, cx } from "@/components/ui/Primitives";

type SortKey = "earnings" | "hours" | "rate" | "tasks" | "name" | "lastSeen";

const COLUMNS: { key: SortKey; label: string; right?: boolean; hide?: string }[] =
  [
    { key: "name", label: "Project" },
    { key: "earnings", label: "Earned", right: true },
    { key: "hours", label: "Hours", right: true },
    { key: "rate", label: "Rate", right: true },
    { key: "tasks", label: "Tasks", right: true, hide: "hidden sm:table-cell" },
    {
      key: "lastSeen",
      label: "Last active",
      right: true,
      hide: "hidden lg:table-cell",
    },
  ];

export function ProjectsSection({
  rows,
  filtered,
  filters,
  onFiltersChange,
  projects,
  payTypes,
  statuses,
  now,
}: {
  rows: EarningRow[];
  filtered: EarningRow[];
  filters: Filters;
  onFiltersChange: (f: Filters) => void;
  projects: string[];
  payTypes: string[];
  statuses: { key: string; label: string }[];
  now: Date;
}) {
  const theme = useChartTheme();
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "earnings",
    dir: "desc",
  });

  const stats = useMemo(() => groupBy(filtered, "projectName"), [filtered]);

  const sorted = useMemo(() => {
    const list = [...stats];
    const dir = sort.dir === "asc" ? 1 : -1;
    list.sort((a, b) => {
      if (sort.key === "name") return a.name.localeCompare(b.name) * dir;
      if (sort.key === "lastSeen")
        return (a.lastSeen.getTime() - b.lastSeen.getTime()) * dir;
      return ((a[sort.key] as number) - (b[sort.key] as number)) * dir;
    });
    return list;
  }, [stats, sort]);

  // Colour follows the entity: locked to the all-time payout ranking so a
  // filter change never repaints the surviving projects.
  const colorIndex = useMemo(() => {
    const map = new Map<string, number>();
    groupBy(rows, "projectName").forEach((p, i) => map.set(p.name, i));
    return map;
  }, [rows]);

  const maxEarnings = Math.max(...sorted.map((s) => s.earnings), 1);

  const toggle = (key: SortKey) =>
    setSort((s) =>
      s.key === key
        ? { key, dir: s.dir === "asc" ? "desc" : "asc" }
        : { key, dir: key === "name" ? "asc" : "desc" }
    );

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

      <Card padded={false}>
        <div className="border-b border-line px-3 py-3">
          <h2 className="flex items-center gap-1.5 text-[15px] font-semibold tracking-[-0.01em] text-ink">
            <Boxes className="size-4 text-ink-3" />
            Projects
          </h2>
          <p className="mt-0.5 text-[12px] text-ink-3">
            {sorted.length} project{sorted.length === 1 ? "" : "s"} · rate is
            payout ÷ logged hours
          </p>
        </div>

        {sorted.length === 0 ? (
          <EmptyState
            icon={<Boxes className="size-6" />}
            title="No projects in range"
            hint="Adjust the filters to see project performance."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-left">
              <thead>
                <tr className="border-b border-line">
                  {COLUMNS.map((col) => {
                    const active = sort.key === col.key;
                    return (
                      <th
                        key={col.key}
                        scope="col"
                        aria-sort={
                          active
                            ? sort.dir === "asc"
                              ? "ascending"
                              : "descending"
                            : "none"
                        }
                        className={cx(
                          "bg-canvas px-3 py-2 text-[11px] font-bold uppercase tracking-[0.06em] text-ink-3",
                          col.right && "text-right",
                          col.hide
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => toggle(col.key)}
                          className={cx(
                            "inline-flex items-center gap-1 hover:text-ink",
                            active && "text-ink",
                            col.right && "flex-row-reverse"
                          )}
                        >
                          {col.label}
                          {active &&
                            (sort.dir === "asc" ? (
                              <ArrowUp className="size-3" />
                            ) : (
                              <ArrowDown className="size-3" />
                            ))}
                        </button>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {sorted.map((p: GroupStat) => (
                  <tr
                    key={p.name}
                    className="border-b border-line last:border-b-0 hover:bg-elevated"
                  >
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="size-2.5 shrink-0 rounded-[3px]"
                          style={{
                            background: seriesColor(
                              theme,
                              colorIndex.get(p.name) ?? 0,
                              p.name
                            ),
                          }}
                          aria-hidden
                        />
                        <div className="min-w-0">
                          <p
                            className="max-w-[200px] truncate text-[13px] font-semibold text-ink"
                            title={p.name}
                          >
                            {p.name}
                          </p>
                          <div className="mt-1 h-1 w-24 overflow-hidden rounded-full bg-[var(--sunken)]">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${(p.earnings / maxEarnings) * 100}%`,
                                background: seriesColor(
                                  theme,
                                  colorIndex.get(p.name) ?? 0,
                                  p.name
                                ),
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="tnum whitespace-nowrap px-3 py-2.5 text-right font-mono text-[13px] font-semibold text-ink">
                      {money(p.earnings)}
                      <span className="ml-1.5 text-[11px] font-normal text-ink-3">
                        {p.share.toFixed(0)}%
                      </span>
                    </td>
                    <td className="tnum whitespace-nowrap px-3 py-2.5 text-right text-[12.5px] text-ink-2">
                      {formatHours(p.hours)}
                    </td>
                    <td className="tnum whitespace-nowrap px-3 py-2.5 text-right text-[12.5px] text-ink-2">
                      {p.hours > 0 ? `$${p.rate.toFixed(2)}` : "—"}
                    </td>
                    <td className="tnum hidden whitespace-nowrap px-3 py-2.5 text-right text-[12.5px] text-ink-2 sm:table-cell">
                      {p.tasks}
                    </td>
                    <td className="hidden whitespace-nowrap px-3 py-2.5 text-right text-[12.5px] text-ink-3 lg:table-cell">
                      {format(p.lastSeen, "MMM d, yyyy")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
