const CURRENCY = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const CURRENCY_0 = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const NUMBER = new Intl.NumberFormat("en-US");

export const money = (n: number) => CURRENCY.format(n || 0);
export const moneyWhole = (n: number) => CURRENCY_0.format(n || 0);
export const count = (n: number) => NUMBER.format(n || 0);

/** Compact money for axis ticks and tight tiles: $1.2k, $340. */
export function moneyCompact(n: number): string {
  const v = n || 0;
  const abs = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(abs >= 10_000 ? 0 : 1)}k`;
  return `${sign}$${Math.round(abs)}`;
}

export const toHours = (seconds: number) => (seconds || 0) / 3600;

/** "84h 12m" — for prose and tiles. */
export function formatHours(hours: number): string {
  const total = Math.max(0, Math.round((hours || 0) * 60));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/** "84.20h" — for goal maths where decimals must reconcile. */
export const formatHoursDecimal = (hours: number) => `${(hours || 0).toFixed(2)}h`;

export function formatPct(n: number, digits = 1): string {
  if (!isFinite(n)) return "—";
  return `${n.toFixed(digits)}%`;
}

/** Signed delta with an explicit glyph — never colour alone. */
export function formatDelta(n: number, kind: "pct" | "hours" | "money"): string {
  const sign = n > 0 ? "+" : n < 0 ? "−" : "";
  const abs = Math.abs(n);
  if (kind === "pct") return `${sign}${abs.toFixed(1)}%`;
  if (kind === "hours") return `${sign}${abs.toFixed(2)}h`;
  return `${sign}${money(abs).replace("$", "$")}`;
}

export const rate = (payout: number, hours: number) =>
  hours > 0 ? payout / hours : 0;

/** Truncate a long project name without breaking layout. */
export const ellipsis = (s: string, max: number) =>
  s.length > max ? `${s.slice(0, max - 1)}…` : s;
