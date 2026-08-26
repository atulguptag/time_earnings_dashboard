/**
 * Verifies the computation layer against a real CSV, with no browser.
 *
 * Deliberately dataset-agnostic: instead of hardcoding totals for one export,
 * it re-derives every expected figure from the raw file with an independent
 * parser, then asserts src/lib agrees. That way it stays meaningful for any
 * export you drop in, including merged multi-file histories.
 *
 *   npm run verify                       # ./Outlier_Earnings_Report.csv
 *   npm run verify -- path/to/other.csv
 */
import * as fs from "fs";
import Papa from "papaparse";
import { addDays, format, startOfDay, startOfWeek } from "date-fns";
import {
  normalizeStatus,
  parseDuration,
  parseMoney,
  parseRate,
  parseWorkDate,
  rowsFromParsed,
  titleize,
} from "@/lib/parseCsv";
import { applyFilters, describeWindow, resolveWindow } from "@/lib/filters";
import {
  bucketBy,
  dailySeries,
  foldOther,
  groupBy,
  lastNDays,
  periodDelta,
  streaks,
  summarize,
  weekdayProfile,
} from "@/lib/metrics";
import {
  buildCycles,
  currentCycle,
  resolveAnchor,
  weekProgress,
} from "@/lib/cycles";
import { mergeRowSets, rowSignature } from "@/lib/merge";
import { EMPTY_FILTERS } from "@/lib/types";
import { formatHours, money, moneyCompact } from "@/lib/format";

let failures = 0;
function check(name: string, cond: boolean, detail = "") {
  if (cond) console.log(`  PASS  ${name}`);
  else {
    failures++;
    console.log(`  FAIL  ${name}  ${detail}`);
  }
}
const near = (a: number, b: number, eps = 0.01) => Math.abs(a - b) < eps;

/* ---------------- independent reference parser (no src/lib) ------------- */

const path = process.argv[2] ?? "Outlier_Earnings_Report.csv";
const text = fs.readFileSync(path, "utf8");

function splitLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (q && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else q = !q;
    } else if (c === "," && !q) {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out;
}

const lines = text.replace(/\r\n/g, "\n").trim().split("\n");
const rawHeaders = splitLine(lines[0]).map((h) => h.trim());
const norm = (k: string) => k.toLowerCase().replace(/[^a-z0-9]/g, "");
const col = (...aliases: string[]) =>
  rawHeaders.findIndex((h) => aliases.includes(norm(h)));

const iDate = col("workdate", "date");
const iDur = col("duration", "time");
const iPay = col("payout", "payable", "amount");
const iType = col("paytype", "type");
const iStatus = col("status", "state");
const iProject = col("projectname", "project");
const iId = col("itemid", "id");

const refMoney = (s: string) => {
  const n = parseFloat((s ?? "").replace(/[^0-9.-]/g, ""));
  return isFinite(n) ? Math.min(1_000_000, Math.max(0, n)) : 0;
};
const refSecs = (s: string) => {
  const t = (s ?? "").trim();
  if (!t || t === "-") return 0;
  let total = 0;
  for (const m of t.matchAll(/(\d+(?:\.\d+)?)\s*([hms])/gi)) {
    const v = parseFloat(m[1]);
    const u = m[2].toLowerCase();
    total += v * (u === "h" ? 3600 : u === "m" ? 60 : 1);
  }
  return total;
};
const isCancelled = (s: string) =>
  (s ?? "").toLowerCase().replace(/[^a-z]/g, "").startsWith("cancel");

interface RefRow {
  iso: string;
  secs: number;
  pay: number;
  type: string;
  status: string;
  project: string;
  id: string;
  cancelled: boolean;
}

const ref: RefRow[] = [];
for (const line of lines.slice(1)) {
  if (!line.trim()) continue;
  const v = splitLine(line);
  const d = parseWorkDate((v[iDate] ?? "").trim());
  if (!d) continue;
  ref.push({
    iso: format(d, "yyyy-MM-dd"),
    secs: refSecs(v[iDur] ?? ""),
    pay: refMoney(v[iPay] ?? ""),
    type: (v[iType] ?? "").trim(),
    status: (v[iStatus] ?? "").trim(),
    project: (v[iProject] ?? "").trim(),
    id: (v[iId] ?? "").trim(),
    cancelled: isCancelled(v[iStatus] ?? ""),
  });
}

const live = ref.filter((r) => !r.cancelled);
const refGross = ref.reduce((a, r) => a + r.pay, 0);
const refCancelled = ref.filter((r) => r.cancelled).reduce((a, r) => a + r.pay, 0);
const refNet = refGross - refCancelled;
const refHours = live.reduce((a, r) => a + r.secs, 0) / 3600;
const refDays = new Set(live.map((r) => r.iso)).size;
const refTasks = new Set(live.filter((r) => r.id).map((r) => r.id)).size;
const refTypes = new Set(live.map((r) => titleize(r.type) || "Unknown")).size;

/* ---------------------------- src/lib under test ----------------------- */

const parsed = Papa.parse<Record<string, unknown>>(text, {
  header: true,
  skipEmptyLines: "greedy",
  dynamicTyping: false,
  transformHeader: (h: string) => h.trim(),
});
const { rows, skipped, missing } = rowsFromParsed(
  (parsed.meta.fields ?? []).filter(Boolean),
  parsed.data
);

console.log(`\nFile     : ${path}`);
console.log(`Headers  : ${JSON.stringify(parsed.meta.fields)}`);
console.log(`Rows     : ${rows.length} parsed, ${skipped} skipped`);
console.log(
  `Reference: gross ${money(refGross)} · cancelled ${money(
    refCancelled
  )} · net ${money(refNet)} · ${refHours.toFixed(2)}h · ${refDays} days\n`
);

console.log("header mapping");
check("no missing required columns", missing.length === 0, JSON.stringify(missing));
check("row count matches the reference parse", rows.length === ref.length, `${rows.length} vs ${ref.length}`);
check("legacy headers still map", rowsFromParsed(
  ["workDate", "itemID", "duration", "rateApplied", "payout", "payType", "projectName", "status"],
  [{ workDate: "Aug 25, 2026", itemID: "x", duration: "1h", rateApplied: "$10/hr", payout: "$10", payType: "prepay", projectName: "a", status: "paid" }]
).rows.length === 1);
check("current headers map", rowsFromParsed(
  ["Work Date", "Item ID", "Project Name", "Duration", "Rate", "Payable", "Type", "Status"],
  [{ "Work Date": "Aug 25, 2026", "Item ID": "x", "Project Name": "a", Duration: "1h", Rate: "$10/hr", Payable: "$10", Type: "Task", Status: "Paid" }]
).rows.length === 1);
check("unknown headers are rejected", rowsFromParsed(["foo", "bar"], []).missing.length > 0);

console.log("\nparsers");
check("duration '46m 15s'", parseDuration("46m 15s") === 2775);
check("duration '1h 40m 0s'", parseDuration("1h 40m 0s") === 6000);
check("duration '1h 39m 58s'", parseDuration("1h 39m 58s") === 5998);
check("duration '-'", parseDuration("-") === 0);
check("duration clock '1:30:04'", parseDuration("1:30:04") === 5404);
check("duration bare '3600'", parseDuration("3600") === 3600);
check("money '$42.63'", parseMoney("$42.63") === 42.63);
check("money '$1,204.00'", parseMoney("$1,204.00") === 1204);
check("money negative clamps", parseMoney("-5") === 0);
check("rate '$25.58/hr'", parseRate("$25.58/hr") === 25.58);
check("rate '-' -> 0", parseRate("-") === 0);
check("date round-trips", format(parseWorkDate("Aug 25, 2026")!, "yyyy-MM-dd") === "2026-08-25");
check("date garbage -> null", parseWorkDate("not a date") === null);
check("titleize camelCase", titleize("missionReward") === "Mission Reward");
check("titleize snake", titleize("move_lobster") === "Move Lobster");
check("titleize passthrough", titleize("Mission Reward") === "Mission Reward");
check("status Cancelled -> canceled", normalizeStatus("Cancelled").key === "canceled");
check("status canceled -> canceled", normalizeStatus("canceled").key === "canceled");
check("status keeps original label", normalizeStatus("Cancelled").label === "Cancelled");
check("status Paid", normalizeStatus("Paid").key === "paid");
check("status processed -> paid", normalizeStatus("processed").key === "paid");
check("XSS payload stripped", rowsFromParsed(
  ["Work Date", "Duration", "Payable", "Type", "Status", "Project Name"],
  [{ "Work Date": "Aug 25, 2026", Duration: "1h", Payable: "$1", Type: "Task", Status: "Paid", "Project Name": "<script>alert(1)</script>evil" }]
).rows[0].projectName === "evil");

console.log("\nsummary vs independent reference");
const s = summarize(rows);
console.log(`  net=${money(s.net)} hours=${s.hours.toFixed(2)} eff=$${s.effectiveRate.toFixed(2)}/h tasks=${s.tasks} days=${s.activeDays}`);
check("gross matches reference", near(s.gross, refGross, 0.02), `${s.gross} vs ${refGross}`);
check("cancelled matches reference", near(s.canceled, refCancelled, 0.02), `${s.canceled} vs ${refCancelled}`);
check("net matches reference", near(s.net, refNet, 0.02), `${s.net} vs ${refNet}`);
check("net = gross - cancelled", near(s.net, s.gross - s.canceled));
check("paid + pending = net", near(s.paid + s.pending, s.net), `${s.paid}+${s.pending}`);
check("hours match reference", near(s.hours, refHours, 0.02), `${s.hours} vs ${refHours}`);
check("active days match reference", s.activeDays === refDays, `${s.activeDays} vs ${refDays}`);
check("tasks match reference", s.tasks === refTasks, `${s.tasks} vs ${refTasks}`);
check("cancelled money is excluded from net", s.net < s.gross || refCancelled === 0);
check("effectiveRate = net / hours", near(s.effectiveRate, s.net / s.hours, 0.001));
check("effectiveRate >= hourlyRate", s.effectiveRate >= s.hourlyRate - 1e-9);
check("empty summarize is zeroed", summarize([]).net === 0);

console.log("\ngrouping");
const byPay = groupBy(rows, "payType");
const byProject = groupBy(rows, "projectName");
const byStatus = groupBy(rows, "status");
check("pay type count matches reference", byPay.length === refTypes, `${byPay.length} vs ${refTypes}`);
check("pay types sorted by earnings desc", byPay.every((g, i) => i === 0 || byPay[i - 1].earnings >= g.earnings));
check("pay type earnings sum to net", near(byPay.reduce((a, g) => a + g.earnings, 0), s.net, 0.02));
check("project earnings sum to net", near(byProject.reduce((a, g) => a + g.earnings, 0), s.net, 0.02));
check("status groups include every row", near(byStatus.reduce((a, g) => a + g.rows, 0), rows.length, 0.5));
check("shares sum to ~100", near(byPay.reduce((a, g) => a + g.share, 0), 100, 0.5));
const cap = Math.max(1, byPay.length - 1);
const folded = foldOther(byPay, cap);
check("foldOther caps the slot count", folded.length === cap + 1, `${folded.length}`);
check("foldOther conserves money", near(folded.reduce((a, g) => a + g.earnings, 0), byPay.reduce((a, g) => a + g.earnings, 0), 0.02));
check("foldOther labels the remainder", folded[folded.length - 1].name.startsWith("Other"));
check("foldOther is a no-op under the cap", foldOther(byPay, byPay.length + 5).length === byPay.length);

console.log("\nseries");
const daily = dailySeries(rows);
check("daily buckets = distinct active days", daily.length === refDays, `${daily.length} vs ${refDays}`);
check("daily is ascending", daily.every((p, i) => i === 0 || daily[i - 1].date <= p.date));
check("daily earnings sum to net", near(daily.reduce((a, p) => a + p.earnings, 0), s.net, 0.02));
check("daily hours sum to total", near(daily.reduce((a, p) => a + p.hours, 0), s.hours, 0.02));
check("gap-filled series is never shorter", dailySeries(rows, true).length >= daily.length);
const weekly = bucketBy(rows, "week");
const monthly = bucketBy(rows, "month");
check("weekly conserves money", near(weekly.reduce((a, b) => a + b.earnings, 0), s.net, 0.02));
check("monthly conserves money", near(monthly.reduce((a, b) => a + b.earnings, 0), s.net, 0.02));
check("weekly conserves hours", near(weekly.reduce((a, b) => a + b.hours, 0), s.hours, 0.02));
check("monthly buckets <= weekly buckets", monthly.length <= weekly.length, `${monthly.length} vs ${weekly.length}`);
check("weekly buckets start on Mondays", weekly.every((b) => b.date.getDay() === 1));
const wd = weekdayProfile(rows);
check("weekday profile has 7 entries", wd.length === 7);
check("weekday profile starts Monday", wd[0].day === "Mon");
check("weekday conserves money", near(wd.reduce((a, d) => a + d.earnings, 0), s.net, 0.02));

console.log("\nfilters");
const newest = rows[0].date;
const oldest = rows[rows.length - 1].date;
const NOW = startOfDay(newest);
check("all-time returns every row", applyFilters(rows, EMPTY_FILTERS, NOW).length === rows.length);
const w7 = resolveWindow({ range: "7d", startDate: "", endDate: "" }, NOW)!;
check(
  "7d window covers 7 calendar days inclusive",
  format(w7.start, "yyyy-MM-dd") === format(addDays(NOW, -6), "yyyy-MM-dd") &&
    format(w7.end, "yyyy-MM-dd") === format(NOW, "yyyy-MM-dd"),
  `${format(w7.start, "yyyy-MM-dd")} -> ${format(w7.end, "yyyy-MM-dd")}`
);
const wk = resolveWindow({ range: "week", startDate: "", endDate: "" }, NOW)!;
check("week window starts Monday", wk.start.getDay() === 1);
check("week window ends Sunday", wk.end.getDay() === 0);
const oldestIso = format(oldest, "yyyy-MM-dd");
const first = applyFilters(rows, { ...EMPTY_FILTERS, range: "custom", startDate: oldestIso, endDate: oldestIso }, NOW);
check("oldest day is reachable (no UTC off-by-one)", first.length > 0 && first.every((r) => format(r.date, "yyyy-MM-dd") === oldestIso), `${first.length}`);
const newestIso = format(newest, "yyyy-MM-dd");
const last = applyFilters(rows, { ...EMPTY_FILTERS, range: "custom", startDate: newestIso, endDate: newestIso }, NOW);
check("newest day is reachable", last.length > 0);
check("full custom range returns everything", applyFilters(rows, { ...EMPTY_FILTERS, range: "custom", startDate: oldestIso, endDate: newestIso }, NOW).length === rows.length);
const proj = byProject[0].name;
check("project filter isolates", applyFilters(rows, { ...EMPTY_FILTERS, projects: [proj] }, NOW).every((r) => r.projectName === proj));
const twoTypes = byPay.slice(0, 2).map((g) => g.name);
const multi = applyFilters(rows, { ...EMPTY_FILTERS, payTypes: twoTypes }, NOW);
check("multi pay-type filter", multi.length > 0 && multi.every((r) => twoTypes.includes(r.payType)));
check("status filter", applyFilters(rows, { ...EMPTY_FILTERS, statuses: ["paid"] }, NOW).every((r) => r.status === "paid"));
const term = proj.slice(0, 5);
const searched = applyFilters(rows, { ...EMPTY_FILTERS, search: term }, NOW);
check("search matches", searched.length > 0);
check("search is case-insensitive", applyFilters(rows, { ...EMPTY_FILTERS, search: term.toUpperCase() }, NOW).length === searched.length);
check("combined filters intersect", applyFilters(rows, { ...EMPTY_FILTERS, projects: [proj], payTypes: [twoTypes[0]] }, NOW).every((r) => r.projectName === proj && r.payType === twoTypes[0]));
check("filtered subset never exceeds the whole", applyFilters(rows, { ...EMPTY_FILTERS, range: "30d" }, NOW).length <= rows.length);
check("describeWindow all", describeWindow(EMPTY_FILTERS, NOW) === "All time");
check("describeWindow week reads as a range", describeWindow({ range: "week", startDate: "", endDate: "" }, NOW).includes("–"));

console.log("\ncycles");
const GOAL = 30;
const cycles = buildCycles(rows, GOAL, null, NOW);
const cur = currentCycle(cycles)!;
const anchor = resolveAnchor(rows, null)!;
console.log(`  ${cycles.length} cycles · anchor ${format(anchor, "MMM d, yyyy")} · current ${cur.label} (week ${cur.weeksElapsed}/4)`);
check("anchor is 1 January", format(anchor, "MM-dd") === "01-01", format(anchor, "yyyy-MM-dd"));
check("anchor is a calendar date, not the first logged day", anchor <= oldest);
check("cycles are 28 days", cycles.every((c) => Math.round((c.end.getTime() - c.start.getTime()) / 86400000) === 27));
check("cycles are contiguous", cycles.every((c, i) => i === 0 || format(addDays(cycles[i - 1].end, 1), "yyyy-MM-dd") === format(c.start, "yyyy-MM-dd")));
check("cycles renumbered from 1", cycles[0].index === 1 && cycles.every((c, i) => c.index === i + 1));
check("no cycle ends before the first logged day", cycles.every((c) => c.end >= oldest));
check("exactly one current cycle", cycles.filter((c) => c.isCurrent).length === 1);
check("current cycle contains today", cur.start <= NOW && cur.end >= NOW);
check("hours conserved across cycles", near(cycles.reduce((a, c) => a + c.hours, 0), s.hours, 0.02));
check("earnings conserved across cycles", near(cycles.reduce((a, c) => a + c.earnings, 0), s.net, 0.02));
check("completed cycles use the full target", cycles.filter((c) => c.isComplete).every((c) => c.targetHours === GOAL * 4));
check("current target is prorated", cur.targetHours === GOAL * cur.weeksElapsed, `${cur.targetHours}`);
check("weeksElapsed is 1..4", cur.weeksElapsed >= 1 && cur.weeksElapsed <= 4);
check("week buckets conserve cycle hours", cycles.every((c) => near(c.weeks.reduce((a, w) => a + w.hours, 0), c.hours, 0.02)));
check("every cycle has 4 weeks", cycles.every((c) => c.weeks.length === 4));
check("pct is capped 0..100", cycles.every((c) => c.pct <= 100 && c.pct >= 0));
check("onTrack matches the delta sign", cycles.every((c) => c.onTrack === c.deltaHours >= 0));
check("completed cycles have no days remaining", cycles.filter((c) => c.isComplete).every((c) => c.daysRemaining === 0));
const pinIso = format(addDays(oldest, 10), "yyyy-MM-dd");
check("pinned anchor is honoured", format(buildCycles(rows, GOAL, pinIso, NOW)[0].start, "yyyy-MM-dd") === pinIso);
check("boundaries do not depend on the data", (() => {
  const trimmed = rows.filter((r) => r.date > addDays(oldest, 30));
  const t = buildCycles(trimmed, GOAL, null, NOW);
  return format(t[t.length - 1].start, "yyyy-MM-dd") === format(cycles[cycles.length - 1].start, "yyyy-MM-dd");
})(), "current cycle start shifted after trimming early rows");
check("empty rows produce no cycles", buildCycles([], GOAL, null, NOW).length === 0);
check("goal change rescales the target", buildCycles(rows, 40, null, NOW).find((c) => c.isComplete)!.targetHours === 160);
check("timed + bonus = cycle earnings", cycles.every((c) => near(c.timedEarnings + c.bonusEarnings, c.earnings, 0.02)));
check("timed earnings conserved across cycles", near(cycles.reduce((a, c) => a + c.timedEarnings, 0), summarize(rows).net - summarize(rows).bonusEarnings, 0.02));
check("cycle rate uses timed earnings only", cycles.every((c) => c.hours === 0 || near(c.rate, c.timedEarnings / c.hours, 0.001)));
check("no cycle reports an absurd wage", cycles.every((c) => c.hours < 1 || c.rate < 500), JSON.stringify(cycles.filter((c) => c.hours >= 1 && c.rate >= 500).map((c) => [c.label, c.rate.toFixed(2)])));

console.log("\nweek progress");
const wp = weekProgress(rows, GOAL, NOW);
console.log(`  ${format(wp.start, "MMM d")}–${format(wp.end, "MMM d")} · ${wp.hours.toFixed(2)}/${wp.goalHours}h · pace ${wp.paceHours.toFixed(2)}`);
check("week has 7 days", wp.days.length === 7);
check("week starts Monday", wp.start.getDay() === 1);
check("week start matches date-fns", format(wp.start, "yyyy-MM-dd") === format(startOfWeek(NOW, { weekStartsOn: 1 }), "yyyy-MM-dd"));
check("day hours sum to week hours", near(wp.days.reduce((a, d) => a + d.hours, 0), wp.hours, 0.02));
check("exactly one day is today", wp.days.filter((d) => d.isToday).length === 1);
check("future days are flagged", wp.days.filter((d) => d.isFuture).length === 7 - wp.daysElapsed);
check("pace never exceeds the goal", wp.paceHours <= wp.goalHours + 0.001);
check("pct is capped", wp.pct <= 100);
check("week hours match the week filter", near(wp.hours, summarize(applyFilters(rows, { ...EMPTY_FILTERS, range: "week" }, NOW)).hours, 0.02));

console.log("\nrolling + deltas");
const l7 = lastNDays(rows, 7, NOW);
check("lastNDays returns exactly 7", l7.length === 7);
check("lastNDays ends today", format(l7[6].date, "yyyy-MM-dd") === format(NOW, "yyyy-MM-dd"));
check("lastNDays starts 6 days back", format(l7[0].date, "yyyy-MM-dd") === format(addDays(NOW, -6), "yyyy-MM-dd"));
check("lastNDays is ascending", l7.every((p, i) => i === 0 || l7[i - 1].date <= p.date));
check("lastNDays(30) has 30 points", lastNDays(rows, 30, NOW).length === 30);
const d = periodDelta(rows, addDays(NOW, -6), NOW, (x) => x.net);
check("delta change is consistent", near(d.change, d.current - d.previous));
check("delta current matches the window", near(d.current, l7.reduce((a, p) => a + p.earnings, 0), 0.02));
const st = streaks(rows);
console.log(`  streak current=${st.current} longest=${st.longest}`);
check("longest streak >= current", st.longest >= st.current);
check("longest streak >= 1", st.longest >= 1);
check("streaks on empty input", streaks([]).longest === 0);

console.log("\nmerge");
{
  const half = Math.floor(rows.length / 2);
  const a = rows.slice(0, half + 60);
  const b = rows.slice(half);
  const m = mergeRowSets([a, b]);
  check("merge restores the full set", m.rows.length === rows.length, `${m.rows.length} vs ${rows.length}`);
  check("merge reports the overlap", m.duplicates === a.length + b.length - rows.length, `${m.duplicates}`);
  check("merge conserves money", near(summarize(m.rows).net, s.net, 0.02));
  check("merge conserves hours", near(summarize(m.rows).hours, s.hours, 0.02));

  const self = mergeRowSets([rows, rows]);
  check("merging a file with itself is a no-op", self.rows.length === rows.length, `${self.rows.length}`);
  check("self-merge keeps money identical", near(summarize(self.rows).net, s.net, 0.02));

  const sigCount = new Map<string, number>();
  for (const r of rows) {
    const k = rowSignature(r);
    sigCount.set(k, (sigCount.get(k) ?? 0) + 1);
  }
  const repeated = [...sigCount.values()].filter((n) => n > 1).length;
  check("byte-identical rows survive a merge", self.rows.length === rows.length, `${repeated} repeated signatures in this file`);

  const mid = addDays(oldest, Math.floor((newest.getTime() - oldest.getTime()) / 86400000 / 2));
  const dA = rows.filter((r) => r.date >= mid);
  const dB = rows.filter((r) => r.date < mid);
  const dis = mergeRowSets([dA, dB]);
  check("disjoint exports concatenate cleanly", dis.rows.length === rows.length && dis.duplicates === 0, `${dis.rows.length}/${dis.duplicates}`);
  check("merge output is newest-first", dis.rows.every((r, i) => i === 0 || dis.rows[i - 1].date >= r.date));
  check("merged totals equal the original", near(summarize(dis.rows).net, s.net, 0.02));
  check("empty merge is safe", mergeRowSets([]).rows.length === 0);
  check("single set passes through", mergeRowSets([rows]).rows.length === rows.length);
}

console.log("\nformatters");
check("money", money(12438.2) === "$12,438.20", money(12438.2));
check("moneyCompact k", moneyCompact(12438) === "$12k", moneyCompact(12438));
check("moneyCompact small", moneyCompact(340) === "$340", moneyCompact(340));
check("moneyCompact 1.2k", moneyCompact(1240) === "$1.2k", moneyCompact(1240));
check("formatHours", formatHours(84.2) === "84h 12m", formatHours(84.2));
check("formatHours whole", formatHours(3) === "3h", formatHours(3));
check("formatHours sub-hour", formatHours(0.5) === "30m", formatHours(0.5));

console.log(
  `\n${failures === 0 ? "ALL CHECKS PASSED" : failures + " CHECK(S) FAILED"}\n`
);
process.exit(failures === 0 ? 0 : 1);
