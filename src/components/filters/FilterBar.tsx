"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import {
  QUICK_RANGES,
  countActiveFilters,
  describeWindow,
} from "@/lib/filters";
import { EMPTY_FILTERS, type Filters } from "@/lib/types";
import { Badge, Button, TextInput, cx } from "@/components/ui/Primitives";
import { MultiSelect, Select } from "@/components/ui/Select";

export function FilterBar({
  filters,
  onChange,
  projects,
  payTypes,
  statuses,
  resultCount,
  totalCount,
  now,
}: {
  filters: Filters;
  onChange: (next: Filters) => void;
  projects: string[];
  payTypes: string[];
  statuses: { key: string; label: string }[];
  resultCount: number;
  totalCount: number;
  now: Date;
}) {
  const active = countActiveFilters(filters);
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });

  return (
    <div className="rounded-[14px] border border-line bg-surface">
      <div className="flex flex-col gap-3 p-3 sm:p-3.5">
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          <Select
            id="range"
            label="Date range"
            value={filters.range}
            options={QUICK_RANGES}
            onChange={(v) =>
              set({
                range: v as Filters["range"],
                // Leaving custom clears the explicit dates so the label can't lie.
                ...(v === "custom" ? {} : { startDate: "", endDate: "" }),
              })
            }
          />
          <MultiSelect
            label="Projects"
            values={filters.projects}
            options={projects}
            onChange={(v) => set({ projects: v })}
            placeholder="All projects"
          />
          <MultiSelect
            label="Pay types"
            values={filters.payTypes}
            options={payTypes}
            onChange={(v) => set({ payTypes: v })}
            placeholder="All pay types"
          />
          <MultiSelect
            label="Status"
            values={filters.statuses}
            options={statuses.map((s) => s.key)}
            onChange={(v) => set({ statuses: v })}
            placeholder="All statuses"
          />
        </div>

        {filters.range === "custom" && (
          <div className="grid gap-2.5 rounded-lg border border-line bg-canvas p-2.5 sm:grid-cols-2">
            <div>
              <label
                htmlFor="from"
                className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-3"
              >
                From
              </label>
              <input
                id="from"
                type="date"
                value={filters.startDate}
                max={filters.endDate || undefined}
                onChange={(e) => set({ startDate: e.target.value })}
                className="h-9 w-full rounded-lg border border-line bg-surface px-2.5 text-[13px] text-ink focus:border-brand focus:outline-none"
              />
            </div>
            <div>
              <label
                htmlFor="to"
                className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-3"
              >
                To
              </label>
              <input
                id="to"
                type="date"
                value={filters.endDate}
                min={filters.startDate || undefined}
                onChange={(e) => set({ endDate: e.target.value })}
                className="h-9 w-full rounded-lg border border-line bg-surface px-2.5 text-[13px] text-ink focus:border-brand focus:outline-none"
              />
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <div className="min-w-[180px] flex-1">
            <TextInput
              value={filters.search}
              onChange={(e) => set({ search: e.target.value })}
              placeholder="Search item ID, project, type…"
              icon={<Search className="size-3.5" />}
              aria-label="Search rows"
            />
          </div>

          <div className="flex items-center gap-2">
            <Badge tone={active > 0 ? "brand" : "neutral"}>
              <SlidersHorizontal className="size-3" />
              {resultCount.toLocaleString()} of {totalCount.toLocaleString()}
            </Badge>
            {active > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onChange({ ...EMPTY_FILTERS })}
                icon={<X className="size-3.5" />}
              >
                Clear
              </Button>
            )}
          </div>
        </div>
      </div>

      {active > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-line px-3 py-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-3">
            Showing
          </span>
          <Chip
            label={describeWindow(filters, now)}
            onClear={
              filters.range !== "all"
                ? () => set({ range: "all", startDate: "", endDate: "" })
                : undefined
            }
          />
          {filters.projects.map((p) => (
            <Chip
              key={p}
              label={p}
              onClear={() =>
                set({ projects: filters.projects.filter((x) => x !== p) })
              }
            />
          ))}
          {filters.payTypes.map((p) => (
            <Chip
              key={p}
              label={p}
              onClear={() =>
                set({ payTypes: filters.payTypes.filter((x) => x !== p) })
              }
            />
          ))}
          {filters.statuses.map((s) => (
            <Chip
              key={s}
              label={statuses.find((x) => x.key === s)?.label ?? s}
              onClear={() =>
                set({ statuses: filters.statuses.filter((x) => x !== s) })
              }
            />
          ))}
          {filters.search.trim() && (
            <Chip
              label={`"${filters.search.trim()}"`}
              onClear={() => set({ search: "" })}
            />
          )}
        </div>
      )}
    </div>
  );
}

function Chip({
  label,
  onClear,
}: {
  label: string;
  onClear?: () => void;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-md border border-line bg-canvas py-0.5 pl-1.5 text-[11.5px] font-medium text-ink-2",
        onClear ? "pr-0.5" : "pr-1.5"
      )}
    >
      <span className="max-w-[160px] truncate">{label}</span>
      {onClear && (
        <button
          type="button"
          onClick={onClear}
          aria-label={`Remove ${label}`}
          className="rounded p-0.5 text-ink-3 hover:bg-elevated hover:text-ink"
        >
          <X className="size-3" />
        </button>
      )}
    </span>
  );
}
