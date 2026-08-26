"use client";

import { useCallback, useMemo, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { useDismiss } from "@/hooks/useDismiss";
import { cx } from "./Primitives";

export interface Option {
  value: string;
  label: string;
}

/**
 * Native <select> under the hood: keyboard, screen readers and the mobile
 * wheel picker all come for free. `appearance-none` plus color-scheme keeps
 * it on-theme in both modes.
 */
export function Select({
  label,
  value,
  options,
  onChange,
  className,
  id,
}: {
  label?: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  className?: string;
  id?: string;
}) {
  return (
    <div className={cx("min-w-0", className)}>
      {label && (
        <label
          htmlFor={id}
          className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-3"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cx(
            "h-9 w-full cursor-pointer appearance-none rounded-lg border border-line bg-surface",
            "pl-2.5 pr-8 text-[13px] font-medium text-ink",
            "transition-colors hover:border-line-strong focus:border-brand focus:outline-none"
          )}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-ink-3"
          aria-hidden
        />
      </div>
    </div>
  );
}

/**
 * Checkbox popover for dimension filters. Includes an inline search once the
 * list is long enough to need it.
 */
export function MultiSelect({
  label,
  values,
  options,
  onChange,
  placeholder = "All",
  className,
}: {
  label: string;
  values: string[];
  options: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
  }, []);
  const ref = useDismiss<HTMLDivElement>(open, close);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.toLowerCase().includes(q)) : options;
  }, [options, query]);

  const toggle = (option: string) =>
    onChange(
      values.includes(option)
        ? values.filter((v) => v !== option)
        : [...values, option]
    );

  const summary =
    values.length === 0
      ? placeholder
      : values.length === 1
      ? values[0]
      : `${values.length} selected`;

  return (
    <div ref={ref} className={cx("relative min-w-0", className)}>
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-3">
        {label}
        {values.length > 0 && (
          <span className="ml-1 text-brand">({values.length})</span>
        )}
      </span>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={cx(
          "flex h-9 w-full items-center justify-between gap-2 rounded-lg border bg-surface px-2.5",
          "text-[13px] font-medium transition-colors hover:border-line-strong focus:outline-none",
          open ? "border-brand" : "border-line",
          values.length ? "text-ink" : "text-ink-3"
        )}
      >
        <span className="truncate">{summary}</span>
        <span className="flex shrink-0 items-center gap-1">
          {values.length > 0 && (
            <span
              role="button"
              tabIndex={0}
              aria-label={`Clear ${label}`}
              onClick={(e) => {
                e.stopPropagation();
                onChange([]);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  onChange([]);
                }
              }}
              className="rounded p-0.5 text-ink-3 hover:bg-elevated hover:text-ink"
            >
              <X className="size-3.5" />
            </span>
          )}
          <ChevronDown
            className={cx(
              "size-4 text-ink-3 transition-transform",
              open && "rotate-180"
            )}
          />
        </span>
      </button>

      {open && (
        <div
          role="listbox"
          aria-multiselectable
          className="absolute z-40 mt-1 w-full min-w-[200px] overflow-hidden rounded-xl border border-line bg-surface shadow-lg shadow-black/10"
        >
          {options.length > 8 && (
            <div className="border-b border-line p-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-ink-3" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={`Search ${label.toLowerCase()}`}
                  className="h-8 w-full rounded-md border border-line bg-canvas pl-7 pr-2 text-[12.5px] text-ink placeholder:text-ink-3 focus:border-brand focus:outline-none"
                />
              </div>
            </div>
          )}

          <div className="scrollbar-slim max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 && (
              <p className="px-3 py-4 text-center text-[12.5px] text-ink-3">
                No matches
              </p>
            )}
            {filtered.map((option) => {
              const checked = values.includes(option);
              return (
                <button
                  key={option}
                  type="button"
                  role="option"
                  aria-selected={checked}
                  onClick={() => toggle(option)}
                  className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-[13px] text-ink hover:bg-elevated"
                >
                  <span
                    className={cx(
                      "flex size-4 shrink-0 items-center justify-center rounded border transition-colors",
                      checked
                        ? "border-brand bg-brand text-brand-fg"
                        : "border-line-strong"
                    )}
                  >
                    {checked && <Check className="size-3" strokeWidth={3} />}
                  </span>
                  <span className="truncate">{option}</span>
                </button>
              );
            })}
          </div>

          {values.length > 0 && (
            <div className="border-t border-line p-1.5">
              <button
                type="button"
                onClick={() => onChange([])}
                className="w-full rounded-md px-2 py-1 text-[12px] font-medium text-ink-2 hover:bg-elevated hover:text-ink"
              >
                Clear {values.length} selected
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
