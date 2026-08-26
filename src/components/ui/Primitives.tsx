"use client";

import {
  forwardRef,
  memo,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";

export const cx = (...parts: (string | false | null | undefined)[]) =>
  parts.filter(Boolean).join(" ");

/* ------------------------------------------------------------------ Card */

export const Card = memo(function Card({
  children,
  className,
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section
      className={cx(
        "rounded-[14px] border border-line bg-surface",
        padded && "p-4 sm:p-5",
        className
      )}
    >
      {children}
    </section>
  );
});

export function CardHeader({
  title,
  subtitle,
  icon,
  actions,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "mb-4 flex flex-wrap items-start justify-between gap-3",
        className
      )}
    >
      <div className="flex min-w-0 items-start gap-2.5">
        {icon && (
          <span className="mt-0.5 shrink-0 text-ink-3" aria-hidden>
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <h2 className="truncate text-[15px] font-semibold tracking-[-0.01em] text-ink">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-0.5 text-[12.5px] leading-snug text-ink-3">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ---------------------------------------------------------------- Button */

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
  icon?: ReactNode;
};

const BUTTON_VARIANTS: Record<string, string> = {
  primary:
    "bg-brand text-brand-fg hover:bg-brand-hover border border-transparent",
  secondary:
    "bg-surface text-ink border border-line hover:bg-elevated hover:border-line-strong",
  ghost: "text-ink-2 hover:text-ink hover:bg-elevated border border-transparent",
  danger:
    "bg-surface text-[var(--neg)] border border-line hover:bg-elevated hover:border-[var(--neg)]",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { variant = "secondary", size = "md", icon, className, children, ...rest },
    ref
  ) {
    return (
      <button
        ref={ref}
        type="button"
        className={cx(
          "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium",
          "transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-45",
          size === "sm"
            ? "h-8 px-2.5 text-[12.5px]"
            : "h-9 px-3 text-[13px] sm:h-10 sm:px-3.5",
          BUTTON_VARIANTS[variant],
          className
        )}
        {...rest}
      >
        {icon}
        {children}
      </button>
    );
  }
);

/* ----------------------------------------------------------------- Badge */

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "brand" | "positive" | "negative" | "warning";
  className?: string;
}) {
  const tones: Record<string, string> = {
    neutral: "bg-elevated text-ink-2 border-line",
    brand: "bg-[var(--brand-soft)] text-brand border-transparent",
    positive: "bg-[var(--brand-soft)] text-[var(--pos)] border-transparent",
    negative: "bg-[color-mix(in_srgb,var(--neg)_12%,transparent)] text-[var(--neg)] border-transparent",
    warning: "bg-[color-mix(in_srgb,var(--warn)_14%,transparent)] text-[var(--warn)] border-transparent",
  };
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-1.5 py-0.5 text-[11px] font-semibold",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------------------- Progress */

export function ProgressBar({
  value,
  tone = "brand",
  height = 8,
  marker,
  label,
}: {
  /** 0-100. */
  value: number;
  tone?: "brand" | "neutral";
  height?: number;
  /** Optional pace marker, also 0-100. */
  marker?: number;
  label?: string;
}) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      className="relative w-full overflow-hidden rounded-full bg-[var(--sunken)]"
      style={{ height }}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className={cx(
          "h-full rounded-full transition-[width] duration-500 ease-out",
          tone === "brand" ? "bg-brand" : "bg-[var(--line-strong)]"
        )}
        style={{ width: `${pct}%` }}
      />
      {marker !== undefined && marker > 0 && marker < 100 && (
        <span
          className="absolute top-0 h-full w-px bg-[var(--ink-3)]"
          style={{ left: `${Math.min(100, marker)}%` }}
          aria-hidden
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------ Text input */

export const TextInput = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { icon?: ReactNode }
>(function TextInput({ icon, className, ...rest }, ref) {
  return (
    <div className="relative">
      {icon && (
        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3">
          {icon}
        </span>
      )}
      <input
        ref={ref}
        className={cx(
          "h-9 w-full rounded-lg border border-line bg-surface text-[13px] text-ink",
          "placeholder:text-ink-3 focus:border-brand focus:outline-none",
          "transition-colors",
          icon ? "pl-8 pr-2.5" : "px-2.5",
          className
        )}
        {...rest}
      />
    </div>
  );
});

/* ------------------------------------------------------------ Empty state */

export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon?: ReactNode;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center">
      {icon && <span className="text-ink-3">{icon}</span>}
      <p className="text-[14px] font-semibold text-ink">{title}</p>
      {hint && <p className="max-w-sm text-[13px] text-ink-3">{hint}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/* ------------------------------------------------------------- Delta cue */

/** Direction is carried by the glyph and the label, never by colour alone. */
export function Delta({
  value,
  format,
  invert = false,
  className,
}: {
  value: number;
  format: (n: number) => string;
  /** True when a rise is bad (e.g. cancelled money). */
  invert?: boolean;
  className?: string;
}) {
  const flat = Math.abs(value) < 0.005;
  const good = invert ? value < 0 : value > 0;
  return (
    <span
      className={cx(
        "tnum inline-flex items-center gap-0.5 text-[12px] font-semibold",
        flat ? "text-ink-3" : good ? "text-[var(--pos)]" : "text-[var(--neg)]",
        className
      )}
    >
      <span aria-hidden>{flat ? "→" : value > 0 ? "↑" : "↓"}</span>
      <span className="sr-only">
        {flat ? "no change" : value > 0 ? "up" : "down"}
      </span>
      {format(Math.abs(value))}
    </span>
  );
}

/* --------------------------------------------------------------- Skeleton */

export const Divider = ({ className }: { className?: string }) => (
  <hr className={cx("border-0 border-t border-line", className)} />
);
