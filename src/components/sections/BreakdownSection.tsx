"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ArrowDown, ArrowUp, Download, Table2 } from "lucide-react";
import type { EarningRow, Filters } from "@/lib/types";
import type { Summary } from "@/lib/metrics";
import { formatHours, money } from "@/lib/format";
import { FilterBar } from "@/components/filters/FilterBar";
import { CopyId } from "@/components/ui/CopyId";
import { Pagination } from "@/components/ui/Pagination";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  cx,
} from "@/components/ui/Primitives";

type SortKey =
  | "date"
  | "itemID"
  | "duration"
  | "payout"
  | "payType"
  | "projectName"
  | "status";

interface Column {
  key: SortKey;
  label: string;
  align?: "right";
  /** Tailwind classes controlling at which breakpoint the column appears. */
  visibility?: string;
  numeric?: boolean;
}

const COLUMNS: Column[] = [
  { key: "date", label: "Date" },
  { key: "itemID", label: "Item ID", visibility: "hidden xl:table-cell" },
  { key: "projectName", label: "Project", visibility: "hidden lg:table-cell" },
  { key: "duration", label: "Duration", align: "right", numeric: true },
  { key: "payout", label: "Payable", align: "right", numeric: true },
  { key: "payType", label: "Type", visibility: "hidden sm:table-cell" },
  { key: "status", label: "Status" },
];

function statusTone(status: string) {
  if (status === "paid") return "positive" as const;
  if (status === "canceled") return "negative" as const;
  return "warning" as const;
}

export function BreakdownSection({
  rows,
  filtered,
  summary,
  filters,
  onFiltersChange,
  projects,
  payTypes,
  statuses,
  pageSize,
  onPageSizeChange,
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
  pageSize: number;
  onPageSizeChange: (n: number) => void;
  now: Date;
}) {
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "date",
    dir: "desc",
  });

  const sorted = useMemo(() => {
    const list = [...filtered];
    const dir = sort.dir === "asc" ? 1 : -1;
    list.sort((a, b) => {
      switch (sort.key) {
        case "date":
          return (a.date.getTime() - b.date.getTime()) * dir;
        case "duration":
          return (a.duration - b.duration) * dir;
        case "payout":
          return (a.payout - b.payout) * dir;
        default:
          return String(a[sort.key]).localeCompare(String(b[sort.key])) * dir;
      }
    });
    return list;
  }, [filtered, sort]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));

  // Any change that shrinks the result set must not strand the user on a
  // page that no longer exists.
  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  useEffect(() => {
    setPage(1);
  }, [filters, pageSize, sort]);

  const visible = useMemo(
    () => sorted.slice((page - 1) * pageSize, page * pageSize),
    [sorted, page, pageSize]
  );

  const toggleSort = (key: SortKey) =>
    setSort((s) =>
      s.key === key
        ? { key, dir: s.dir === "asc" ? "desc" : "asc" }
        : { key, dir: key === "date" || key === "payout" ? "desc" : "asc" }
    );

  const exportCsv = () => {
    const header = [
      "Work Date",
      "Item ID",
      "Project Name",
      "Duration",
      "Rate",
      "Payable",
      "Type",
      "Status",
    ];
    const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const body = sorted.map((r) =>
      [
        r.workDate,
        r.itemID,
        r.projectName,
        r.durationString,
        r.rateApplied,
        r.payout.toFixed(2),
        r.payType,
        r.statusLabel,
      ]
        .map(escape)
        .join(",")
    );
    const blob = new Blob([[header.map(escape).join(","), ...body].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ledger-export-${format(now, "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

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

      {/* Totals for the current filter */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        {[
          { label: "Net in view", value: money(summary.net) },
          { label: "Hours in view", value: formatHours(summary.hours) },
          {
            label: "Effective rate",
            value: `$${summary.effectiveRate.toFixed(2)}/hr`,
          },
          { label: "Tasks", value: summary.tasks.toLocaleString() },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-[14px] border border-line bg-surface px-3 py-2.5"
          >
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-ink-3">
              {s.label}
            </p>
            <p className="tnum mt-1 font-mono text-[17px] font-semibold text-ink">
              {s.value}
            </p>
          </div>
        ))}
      </div>

      <Card padded={false}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-3 py-3">
          <div>
            <h2 className="flex items-center gap-1.5 text-[15px] font-semibold tracking-[-0.01em] text-ink">
              <Table2 className="size-4 text-ink-3" />
              Detailed breakdown
            </h2>
            <p className="mt-0.5 text-[12px] text-ink-3">
              Sort any column · export what you see
            </p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={exportCsv}
            disabled={sorted.length === 0}
            icon={<Download className="size-3.5" />}
          >
            Export CSV
          </Button>
        </div>

        {sorted.length === 0 ? (
          <EmptyState
            icon={<Table2 className="size-6" />}
            title="No rows match these filters"
            hint="Try widening the date range or clearing a project filter."
          />
        ) : (
          <>
            {/* Desktop / tablet table */}
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full min-w-[640px] border-collapse text-left">
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
                            col.align === "right" && "text-right",
                            col.visibility
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => toggleSort(col.key)}
                            className={cx(
                              "inline-flex items-center gap-1 transition-colors hover:text-ink",
                              active && "text-ink",
                              col.align === "right" && "flex-row-reverse"
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
                  {visible.map((row, i) => (
                    <tr
                      key={`${row.itemID}-${row.payType}-${row.workDate}-${i}`}
                      className="border-b border-line last:border-b-0 hover:bg-elevated"
                    >
                      <td className="whitespace-nowrap px-3 py-2.5 text-[12.5px] font-medium text-ink">
                        {format(row.date, "MMM d, yyyy")}
                      </td>
                      <td className="hidden whitespace-nowrap px-3 py-2.5 xl:table-cell">
                        <CopyId value={row.itemID} />
                      </td>
                      <td className="hidden max-w-[200px] truncate px-3 py-2.5 text-[12.5px] text-ink-2 lg:table-cell">
                        {row.projectName}
                      </td>
                      <td className="tnum whitespace-nowrap px-3 py-2.5 text-right text-[12.5px] text-ink-2">
                        {row.durationString}
                      </td>
                      <td className="tnum whitespace-nowrap px-3 py-2.5 text-right font-mono text-[12.5px] font-semibold text-ink">
                        {money(row.payout)}
                      </td>
                      <td className="hidden whitespace-nowrap px-3 py-2.5 text-[12.5px] text-ink-2 sm:table-cell">
                        {row.payType}
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge tone={statusTone(row.status)}>
                          {row.statusLabel}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile card list — a 7-column table is unreadable under 640px */}
            <ul className="divide-y divide-[var(--line)] sm:hidden">
              {visible.map((row, i) => (
                <li
                  key={`${row.itemID}-${row.payType}-${row.workDate}-${i}`}
                  className="px-3 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-ink">
                        {row.projectName}
                      </p>
                      <p className="mt-0.5 text-[11.5px] text-ink-3">
                        {format(row.date, "MMM d, yyyy")} · {row.payType}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="tnum font-mono text-[14px] font-semibold text-ink">
                        {money(row.payout)}
                      </p>
                      <p className="tnum mt-0.5 text-[11.5px] text-ink-3">
                        {row.durationString}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge tone={statusTone(row.status)}>
                      {row.statusLabel}
                    </Badge>
                    <span className="tnum text-[11px] text-ink-3">
                      {row.rateApplied}
                    </span>
                  </div>
                  {row.itemID && (
                    <div className="mt-1.5 overflow-x-auto">
                      <CopyId value={row.itemID} className="!opacity-100" />
                    </div>
                  )}
                </li>
              ))}
            </ul>

            <Pagination
              page={page}
              pageSize={pageSize}
              total={sorted.length}
              onPageChange={setPage}
              onPageSizeChange={onPageSizeChange}
            />
          </>
        )}
      </Card>
    </div>
  );
}
