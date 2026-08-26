"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { PAGE_SIZES } from "@/lib/types";
import { Button, cx } from "./Primitives";

/** Windowed page numbers with ellipses, so 400 pages stay one row. */
function pageWindow(current: number, total: number): (number | "gap")[] {
  if (total <= 7)
    return Array.from({ length: total }, (_, i) => i + 1);

  const pages = new Set<number>([1, total, current]);
  if (current > 1) pages.add(current - 1);
  if (current < total) pages.add(current + 1);
  if (current <= 3) [2, 3, 4].forEach((p) => p < total && pages.add(p));
  if (current >= total - 2)
    [total - 3, total - 2, total - 1].forEach((p) => p > 1 && pages.add(p));

  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push("gap");
    out.push(p);
  });
  return out;
}

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  itemLabel = "rows",
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  itemLabel?: string;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  return (
    <div className="flex flex-col gap-3 border-t border-line px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <label
          htmlFor="page-size"
          className="text-[12px] text-ink-3"
        >
          Show
        </label>
        <div className="relative">
          <select
            id="page-size"
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="h-8 cursor-pointer appearance-none rounded-lg border border-line bg-surface pl-2.5 pr-7 text-[12.5px] font-semibold text-ink hover:border-line-strong focus:border-brand focus:outline-none"
          >
            {PAGE_SIZES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <ChevronRight
            className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 rotate-90 text-ink-3"
            aria-hidden
          />
        </div>
        <span className="tnum text-[12px] text-ink-3">
          {from.toLocaleString()}–{to.toLocaleString()} of{" "}
          {total.toLocaleString()} {itemLabel}
        </span>
      </div>

      <nav
        aria-label="Pagination"
        className="flex items-center justify-between gap-1 sm:justify-end"
      >
        <Button
          size="sm"
          variant="secondary"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
          className="px-2"
        >
          <ChevronLeft className="size-4" />
          <span className="sm:hidden">Prev</span>
        </Button>

        <div className="flex items-center gap-1">
          {pageWindow(page, pageCount).map((p, i) =>
            p === "gap" ? (
              <span
                key={`gap-${i}`}
                className="px-1 text-[12px] text-ink-3"
                aria-hidden
              >
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                aria-current={p === page ? "page" : undefined}
                aria-label={`Page ${p}`}
                className={cx(
                  "tnum h-8 min-w-8 rounded-lg px-2 text-[12.5px] font-semibold transition-colors",
                  p === page
                    ? "bg-brand text-brand-fg"
                    : "border border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink"
                )}
              >
                {p}
              </button>
            )
          )}
        </div>

        <Button
          size="sm"
          variant="secondary"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pageCount}
          aria-label="Next page"
          className="px-2"
        >
          <span className="sm:hidden">Next</span>
          <ChevronRight className="size-4" />
        </Button>
      </nav>
    </div>
  );
}
