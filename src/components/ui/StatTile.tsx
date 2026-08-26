"use client";

import type { ReactNode } from "react";
import { Sparkline } from "@/components/charts/Micro";
import { Delta, cx } from "./Primitives";

/**
 * KPI tile. The value is the hero; the sparkline and delta are support.
 * Values use tabular figures so a row of tiles aligns optically.
 */
export function StatTile({
  label,
  value,
  sub,
  icon,
  spark,
  sparkTone = "earnings",
  delta,
  deltaFormat,
  deltaLabel,
  invertDelta,
  className,
}: {
  label: string;
  value: string;
  sub?: ReactNode;
  icon?: ReactNode;
  spark?: number[];
  sparkTone?: "earnings" | "hours" | "muted";
  delta?: number;
  deltaFormat?: (n: number) => string;
  deltaLabel?: string;
  invertDelta?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "flex flex-col justify-between gap-3 rounded-[14px] border border-line bg-surface p-3.5 sm:p-4",
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-3">
          {label}
        </p>
        {icon && (
          <span className="shrink-0 text-ink-3" aria-hidden>
            {icon}
          </span>
        )}
      </div>

      <div>
        <p className="tnum font-mono text-[22px] font-semibold leading-none tracking-[-0.02em] text-ink sm:text-[26px]">
          {value}
        </p>
        {sub && (
          <p className="mt-1.5 text-[12px] leading-snug text-ink-3">{sub}</p>
        )}
      </div>

      {(spark || delta !== undefined) && (
        <div className="flex items-end justify-between gap-2">
          {delta !== undefined && deltaFormat ? (
            <span className="flex min-w-0 flex-col gap-0.5">
              <Delta
                value={delta}
                format={deltaFormat}
                invert={invertDelta}
              />
              {deltaLabel && (
                <span className="truncate text-[10.5px] text-ink-3">
                  {deltaLabel}
                </span>
              )}
            </span>
          ) : (
            <span />
          )}
          {spark && spark.length > 1 && (
            <Sparkline values={spark} tone={sparkTone} width={72} height={26} />
          )}
        </div>
      )}
    </div>
  );
}
