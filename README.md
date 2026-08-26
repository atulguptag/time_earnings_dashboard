# Ledger — Earnings Dashboard

A private, client-side dashboard for Outlier earnings exports. Drop in a CSV and
get hours, payouts, effective rate, trends and 4-week cycle goal tracking.

**Nothing leaves the browser.** The file is parsed in-page with the File API;
there is no server, no upload endpoint and no account. Only your theme, weekly
goal and page-size preferences are written to `localStorage`.

## Getting started

```bash
npm install
npm run dev          # http://localhost:3000
```

Then drop your earnings CSV onto the upload screen.

| Script | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build and serve |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run verify` | Runs the computation suite against a real CSV |

`npm run verify` takes an optional path: `npm run verify -- path/to/export.csv`.
It exercises the parser, filters, metrics and cycle maths and asserts the totals
reconcile — useful after changing anything in `src/lib`.

## CSV format

Column order does not matter, and headers are matched by alias, so both the
current and legacy Outlier exports load unchanged:

| Field | Current header | Legacy header |
|---|---|---|
| Date | `Work Date` | `workDate` |
| Task ID | `Item ID` | `itemID` |
| Project | `Project Name` | `projectName` |
| Duration | `Duration` | `duration` |
| Rate | `Rate` | `rateApplied` |
| Amount | `Payable` | `payout` |
| Category | `Type` | `payType` |
| State | `Status` | `status` |

Durations accept `1h 40m 0s`, `1:40:00` or a raw seconds count. Amounts accept
`$42.63` or `42.63`. A bare `-` means "not applicable". Dates accept
`Aug 25, 2026`, `2026-08-25` and a few common variants.

### How the numbers are defined

- **Cancelled payouts are excluded from every total.** They are reported
  separately under Payout status so the money is still visible.
- **Effective rate** is net earnings ÷ logged hours, so reward and adjustment
  rows with no logged time lift it. **Timed rate** counts only rows that logged
  time — the gap between the two is your bonus income.
- **Tasks** counts distinct item IDs, not rows; one task often produces several
  rows (a Task row plus an Exceeded Time row).

## 4-week cycles

Cycles are fixed 28-day blocks counted from a **calendar date**, defaulting to
1 January of the year your data starts in. Blocks that ended before your first
entry are hidden, and the rest are numbered from 1.

The anchor is deliberately not derived from your earliest logged day: that made
every boundary shift whenever the first row changed, so the same week could land
in a different cycle after a re-export. Pin any start date in Settings to match
your own schedule.

The target is **prorated while a cycle is running**: with a 30h weekly goal, a
cycle three weeks in targets 90h, and the completed cycle targets 120h. That
answers "am I keeping pace right now" rather than "how much of the block is
done".

## Project layout

```
src/
  app/            layout, global tokens, the page shell
  lib/            all computation — no React
    parseCsv.ts     header aliasing, sanitising, duration/money parsing
    filters.ts      date windows; one source of truth for range + label
    metrics.ts      summaries, series, grouping, deltas, streaks
    cycles.ts       4-week cycles and weekly progress
    palette.ts      validated chart colours for both themes
    format.ts       currency, hours, deltas
    storage.ts      guarded localStorage + the no-flash theme bootstrap
  components/
    layout/         app shell, nav rail, insight panel
    sections/       one file per section (overview, analytics, …)
    charts/         recharts wrappers + hand-rolled micro charts
    ui/             buttons, cards, selects, pagination, stat tiles
    filters/        the shared filter bar
    theme/          theme provider and the light/dark/system control
  hooks/          useDismiss, useMediaQuery
```

`src/lib` is pure TypeScript with no React imports, which is what makes
`npm run verify` possible without a browser.

## Design notes

- **Type:** Plus Jakarta Sans for UI, IBM Plex Mono for every figure. Numbers use
  `font-variant-numeric: tabular-nums` so columns align.
- **Colour:** OKLCH-adjacent neutral tokens defined once in `globals.css` and
  swapped by a `.dark` class. Dark mode is a warm near-black (`#0d0d0d` page,
  `#1a1a19` cards) rather than blue-grey.
- **Charts:** one measure per axis — earnings and hours are separate charts, never
  a dual axis. Categorical hues are assigned in a fixed, colourblind-checked
  order and never cycled; past six series the rest fold into "Other".
- **Theme:** an inline script in `<head>` applies the stored theme before first
  paint, so there is no flash. "System" follows the OS live.

## Security

- CSV content is sanitised at parse time (script tags and control characters
  stripped, fields length-capped, amounts clamped).
- Strict CSP with no external origins, plus `nosniff`, `frame-ancestors 'none'`,
  `Referrer-Policy: no-referrer` and HSTS — see `next.config.ts`.
- `npm audit` is clean; `postcss` and `sharp` are pinned via `overrides`.
- `*.csv` is git-ignored so real earnings data is never committed.
