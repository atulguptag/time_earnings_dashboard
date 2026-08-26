import Papa from "papaparse";
import { isValid, parse } from "date-fns";
import type { EarningRow, SourceFile } from "./types";

interface RawFields {
  workDate: string;
  itemID: string;
  projectName: string;
  duration: string;
  rateApplied: string;
  payout: string;
  payType: string;
  status: string;
}

/**
 * Outlier has shipped at least two header spellings. Rather than pin one, each
 * logical field accepts a set of normalised aliases, so both the legacy
 * `workDate,itemID,...` export and the current `Work Date,Item ID,...` export
 * load without the user having to touch the file.
 */
const FIELD_ALIASES: Record<keyof RawFields, string[]> = {
  workDate: ["workdate", "date", "day"],
  itemID: ["itemid", "id", "taskid"],
  projectName: ["projectname", "project"],
  duration: ["duration", "time", "timeworked"],
  rateApplied: ["rateapplied", "rate", "hourlyrate"],
  payout: ["payout", "payable", "amount", "earnings", "pay"],
  payType: ["paytype", "type", "category"],
  status: ["status", "state"],
};

/** Fields a file must supply for the dashboard to mean anything. */
const REQUIRED: (keyof RawFields)[] = [
  "workDate",
  "duration",
  "payout",
  "payType",
  "status",
];

export const REQUIRED_COLUMN_LABELS = [
  "Work Date",
  "Item ID",
  "Project Name",
  "Duration",
  "Rate",
  "Payable",
  "Type",
  "Status",
];

export const MAX_FILE_BYTES = 25 * 1024 * 1024;
export const MAX_ROWS = 50_000;

const normalizeKey = (k: string) => k.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Maps this file's actual headers onto our canonical field names. */
function buildHeaderMap(headers: string[]): {
  map: Map<string, keyof RawFields>;
  missing: (keyof RawFields)[];
} {
  const map = new Map<string, keyof RawFields>();
  const found = new Set<keyof RawFields>();

  for (const header of headers) {
    const norm = normalizeKey(header);
    for (const [field, aliases] of Object.entries(FIELD_ALIASES) as [
      keyof RawFields,
      string[]
    ][]) {
      if (found.has(field)) continue;
      if (aliases.includes(norm)) {
        map.set(header, field);
        found.add(field);
        break;
      }
    }
  }

  return { map, missing: REQUIRED.filter((f) => !found.has(f)) };
}

/** Formats accepted for the work date, tried in order. */
const DATE_FORMATS = [
  "MMM d, yyyy",
  "MMM d yyyy",
  "MMMM d, yyyy",
  "yyyy-MM-dd",
  "MM/dd/yyyy",
  "M/d/yyyy",
];

export function parseWorkDate(raw: string): Date | null {
  const s = raw.trim();
  if (!s) return null;
  for (const fmt of DATE_FORMATS) {
    const d = parse(s, fmt, new Date());
    if (isValid(d)) return d;
  }
  return null;
}

/** "1h 30m 4s" -> seconds. Also accepts a bare seconds count and "1:30:04". */
export function parseDuration(raw: unknown): number {
  if (typeof raw === "number" && isFinite(raw)) return Math.max(0, raw);
  if (typeof raw !== "string") return 0;
  const s = raw.trim();
  if (!s || s === "-" || s === "—") return 0;

  const clock = s.match(/^(\d+):([0-5]?\d)(?::([0-5]?\d))?$/);
  if (clock) {
    return (
      Number(clock[1]) * 3600 + Number(clock[2]) * 60 + Number(clock[3] ?? 0)
    );
  }

  const units = s.match(/(\d+(?:\.\d+)?)\s*[hms]/gi);
  if (units) {
    return units.reduce((total, part) => {
      const value = parseFloat(part);
      const suffix = part.trim().slice(-1).toLowerCase();
      const mult = suffix === "h" ? 3600 : suffix === "m" ? 60 : 1;
      return total + value * mult;
    }, 0);
  }

  const bare = parseFloat(s);
  return isFinite(bare) ? Math.max(0, bare) : 0;
}

/** Currency-ish string or number -> a sane, clamped number. */
export function parseMoney(raw: unknown): number {
  const n =
    typeof raw === "number"
      ? raw
      : parseFloat(String(raw ?? "").replace(/[^0-9.-]/g, ""));
  if (!isFinite(n)) return 0;
  return Math.min(1_000_000, Math.max(0, n));
}

/** "$25.58/hr" -> 25.58. Returns 0 when the row carries no rate. */
export function parseRate(raw: string): number {
  const n = parseFloat(String(raw).replace(/[^0-9.]/g, ""));
  return isFinite(n) ? n : 0;
}

/** Strips script payloads and control chars, caps length. CSVs are untrusted. */
function clean(raw: unknown): string {
  if (raw === null || raw === undefined) return "";
  return String(raw)
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .trim()
    .slice(0, 200);
}

/** Outlier writes a bare dash for "not applicable". */
const dashToEmpty = (s: string) => (s === "-" || s === "—" ? "" : s);

/** "missionReward" -> "Mission Reward". Newer exports are already spaced. */
export function titleize(s: string): string {
  if (!s) return "";
  if (/[ _]/.test(s)) {
    return s
      .replace(/_/g, " ")
      .replace(/\s+/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return s
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/^./, (c) => c.toUpperCase());
}

/**
 * Canonical status keys. Both "canceled" and "Cancelled" appear in the wild;
 * everything downstream keys off the canonical form, never the raw text.
 */
export function normalizeStatus(raw: string): { key: string; label: string } {
  const label = titleize(raw) || "Unknown";
  const norm = raw.toLowerCase().replace(/[^a-z]/g, "");
  if (norm.startsWith("cancel")) return { key: "canceled", label };
  if (norm.startsWith("paid") || norm.startsWith("processed"))
    return { key: "paid", label };
  if (norm.startsWith("pending") || norm.startsWith("unpaid"))
    return { key: "pending", label };
  return { key: norm || "unknown", label };
}

export interface ParseResult {
  rows: EarningRow[];
  source: SourceFile;
}

export function isCsvFile(file: File): boolean {
  return (
    file.name.toLowerCase().endsWith(".csv") ||
    file.type === "text/csv" ||
    file.type === "application/vnd.ms-excel"
  );
}

/** Shared by the file input and the drop zone. */
export function rowsFromParsed(
  headers: string[],
  data: Record<string, unknown>[]
): { rows: EarningRow[]; skipped: number; missing: (keyof RawFields)[] } {
  const { map, missing } = buildHeaderMap(headers);
  if (missing.length > 0) return { rows: [], skipped: 0, missing };

  let skipped = 0;
  const rows: EarningRow[] = [];

  for (const source of data) {
    if (!source || typeof source !== "object") {
      skipped++;
      continue;
    }

    // Re-key this row onto canonical field names.
    const f: Partial<RawFields> = {};
    for (const [header, field] of map) f[field] = clean(source[header]);

    const workDate = f.workDate ?? "";
    const date = parseWorkDate(workDate);
    if (!date) {
      skipped++;
      continue;
    }
    date.setHours(0, 0, 0, 0);

    const status = normalizeStatus(f.status ?? "");
    const rateApplied = dashToEmpty(f.rateApplied ?? "");

    rows.push({
      workDate,
      date,
      itemID: f.itemID ?? "",
      duration: parseDuration(f.duration),
      durationString: dashToEmpty(f.duration ?? "") || "—",
      rateApplied: rateApplied || "—",
      rateValue: parseRate(rateApplied),
      payout: parseMoney(f.payout),
      payType: titleize(dashToEmpty(f.payType ?? "")) || "Unknown",
      projectName: dashToEmpty(f.projectName ?? "") || "Unassigned",
      status: status.key,
      statusLabel: status.label,
    });
  }

  rows.sort((a, b) => b.date.getTime() - a.date.getTime());
  return { rows, skipped, missing: [] };
}

export function parseCsvFile(
  file: File,
  onDone: (result: ParseResult) => void,
  onError: (message: string) => void
): void {
  if (!isCsvFile(file)) {
    onError("That is not a CSV file. Please upload a file ending in .csv.");
    return;
  }
  if (file.size > MAX_FILE_BYTES) {
    onError(
      `File is ${(file.size / 1024 / 1024).toFixed(1)}MB. The limit is ${
        MAX_FILE_BYTES / 1024 / 1024
      }MB.`
    );
    return;
  }

  Papa.parse<Record<string, unknown>>(file, {
    header: true,
    skipEmptyLines: "greedy",
    // Left off deliberately: it mangles IDs like "0012" and durations like "3600".
    dynamicTyping: false,
    transformHeader: (h) => h.trim(),
    complete: (results) => {
      const headers = (results.meta.fields ?? []).filter(Boolean);
      const all = results.data;
      const truncated = all.length > MAX_ROWS;
      const slice = truncated ? all.slice(0, MAX_ROWS) : all;

      const { rows, skipped, missing } = rowsFromParsed(headers, slice);

      if (missing.length > 0) {
        onError(
          `This CSV is missing a ${missing.join(
            ", "
          )} column. Expected headers like: ${REQUIRED_COLUMN_LABELS.join(", ")}.`
        );
        return;
      }
      if (rows.length === 0) {
        onError(
          "No usable rows found. Check that the work date column looks like Aug 25, 2026."
        );
        return;
      }

      onDone({
        rows,
        source: { name: file.name, rows: rows.length, skipped, truncated },
      });
    },
    error: (error: Error) => {
      onError(`Could not read the CSV: ${String(error.message).slice(0, 120)}`);
    },
  });
}

/**
 * Parses several exports at once. Outlier's own download is range-limited, so
 * pulling history in chunks and dropping them all in together is the normal
 * path rather than an edge case.
 */
export function parseCsvFiles(
  files: File[],
  onDone: (results: ParseResult[], errors: string[]) => void
): void {
  const results: ParseResult[] = [];
  const errors: string[] = [];
  let pending = files.length;
  if (pending === 0) {
    onDone([], []);
    return;
  }

  const settle = () => {
    if (--pending === 0) onDone(results, errors);
  };

  for (const file of files) {
    parseCsvFile(
      file,
      (result) => {
        results.push(result);
        settle();
      },
      (message) => {
        errors.push(`${file.name}: ${message}`);
        settle();
      }
    );
  }
}
