import type { EarningRow } from "./types";

/**
 * Identity of a row for merge purposes. Deliberately the whole record: the
 * same task legitimately produces several rows (a Task line plus an Exceeded
 * Time line), and a file can even contain two byte-identical rows.
 */
export function rowSignature(r: EarningRow): string {
  return [
    r.workDate,
    r.itemID,
    r.projectName,
    r.durationString,
    r.rateApplied,
    r.payout.toFixed(2),
    r.payType,
    r.status,
  ].join("");
}

export interface MergeResult {
  rows: EarningRow[];
  /** Rows dropped because another file already supplied them. */
  duplicates: number;
}

/**
 * Merges exports that may overlap in date range.
 *
 * Uses max-count-per-signature rather than a plain Set: this file genuinely
 * contains identical rows (e.g. two $42.63 Task lines on the same day for the
 * same item), so collapsing to one would delete real earnings. Taking the
 * highest count any single file reports keeps those repeats while still
 * removing the overlap between two exports that cover the same period.
 *
 * Merging a file with itself is therefore a no-op, which is the property that
 * makes re-importing safe.
 */
export function mergeRowSets(sets: EarningRow[][]): MergeResult {
  if (sets.length === 0) return { rows: [], duplicates: 0 };
  if (sets.length === 1) return { rows: [...sets[0]], duplicates: 0 };

  // Highest occurrence count each signature reaches in any single file.
  const want = new Map<string, number>();
  let seenTotal = 0;

  for (const set of sets) {
    const counts = new Map<string, number>();
    for (const row of set) {
      const sig = rowSignature(row);
      counts.set(sig, (counts.get(sig) ?? 0) + 1);
      seenTotal += 1;
    }
    for (const [sig, n] of counts) {
      if ((want.get(sig) ?? 0) < n) want.set(sig, n);
    }
  }

  const taken = new Map<string, number>();
  const rows: EarningRow[] = [];

  for (const set of sets) {
    for (const row of set) {
      const sig = rowSignature(row);
      const used = taken.get(sig) ?? 0;
      if (used >= (want.get(sig) ?? 0)) continue;
      taken.set(sig, used + 1);
      rows.push(row);
    }
  }

  rows.sort((a, b) => b.date.getTime() - a.date.getTime());
  return { rows, duplicates: seenTotal - rows.length };
}
