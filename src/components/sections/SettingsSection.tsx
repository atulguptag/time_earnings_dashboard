"use client";

import { useRef } from "react";
import { format } from "date-fns";
import {
  CalendarRange,
  FileSpreadsheet,
  Monitor,
  Moon,
  Palette,
  Plus,
  RotateCcw,
  ShieldCheck,
  Sun,
  Target,
  Trash2,
} from "lucide-react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { resolveAnchor } from "@/lib/cycles";
import { toInputDate } from "@/lib/filters";
import type { EarningRow, FileMeta, Settings, ThemeChoice } from "@/lib/types";
import { PAGE_SIZES } from "@/lib/types";
import { Button, Card, CardHeader, cx } from "@/components/ui/Primitives";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 border-b border-line py-3.5 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="min-w-0 sm:max-w-sm">
        <p className="text-[13px] font-semibold text-ink">{label}</p>
        {hint && (
          <p className="mt-0.5 text-[12px] leading-relaxed text-ink-3">{hint}</p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

const THEMES: { value: ThemeChoice; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
];

export function SettingsSection({
  settings,
  onSettingsChange,
  rows,
  meta,
  onReplaceCsv,
  onAddFiles,
  busy,
}: {
  settings: Settings;
  onSettingsChange: (patch: Partial<Settings>) => void;
  rows: EarningRow[];
  meta: FileMeta | null;
  onReplaceCsv: () => void;
  onAddFiles: (files: File[]) => void;
  busy: boolean;
}) {
  const { choice, setChoice } = useTheme();
  const addRef = useRef<HTMLInputElement>(null);
  const autoAnchor = resolveAnchor(rows, null);

  return (
    <div className="max-w-3xl space-y-4">
      <Card>
        <CardHeader
          title="Goals"
          subtitle="Drives the weekly ring and every 4-week cycle card"
          icon={<Target className="size-4" />}
        />

        <Field
          label="Weekly hours target"
          hint={`Your 4-week cycle target is ${(
            settings.weeklyGoalHours * 4
          ).toFixed(0)}h. While a cycle is running the target is prorated by weeks elapsed.`}
        >
          <div className="flex h-10 items-center gap-1.5 rounded-lg border border-line bg-canvas px-3">
            <input
              type="number"
              min={1}
              max={168}
              step={0.5}
              value={settings.weeklyGoalHours}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (isFinite(v))
                  onSettingsChange({
                    weeklyGoalHours: Math.min(168, Math.max(1, v)),
                  });
              }}
              className="tnum w-16 bg-transparent text-right font-mono text-[14px] font-semibold text-ink focus:outline-none"
            />
            <span className="text-[12.5px] text-ink-3">hours / week</span>
          </div>
        </Field>

        <Field
          label="Cycle start date"
          hint={
            settings.cycleAnchor
              ? "Cycles run in fixed 28-day blocks from this date."
              : `Defaults to 1 January${
                  autoAnchor ? ` ${format(autoAnchor, "yyyy")}` : ""
                }, so boundaries stay put when you re-export. Pick any date to align cycles to your own schedule.`
          }
        >
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={
                settings.cycleAnchor ??
                (autoAnchor ? toInputDate(autoAnchor) : "")
              }
              onChange={(e) =>
                onSettingsChange({ cycleAnchor: e.target.value || null })
              }
              className="h-10 rounded-lg border border-line bg-canvas px-2.5 text-[13px] text-ink focus:border-brand focus:outline-none"
            />
            {settings.cycleAnchor && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onSettingsChange({ cycleAnchor: null })}
                icon={<RotateCcw className="size-3.5" />}
                aria-label="Reset to auto-detected anchor"
              >
                Auto
              </Button>
            )}
          </div>
        </Field>
      </Card>

      <Card>
        <CardHeader
          title="Appearance"
          subtitle="Applies instantly and is remembered on this device"
          icon={<Palette className="size-4" />}
        />

        <Field
          label="Theme"
          hint="System follows your device's light/dark setting and updates live."
        >
          <div
            role="radiogroup"
            aria-label="Theme"
            className="flex gap-1 rounded-lg border border-line bg-canvas p-1"
          >
            {THEMES.map(({ value, label, Icon }) => (
              <button
                key={value}
                role="radio"
                aria-checked={choice === value}
                onClick={() => setChoice(value)}
                className={cx(
                  "flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[12.5px] font-semibold transition-colors",
                  choice === value
                    ? "bg-brand text-brand-fg"
                    : "text-ink-2 hover:bg-elevated hover:text-ink"
                )}
              >
                <Icon className="size-3.5" />
                {label}
              </button>
            ))}
          </div>
        </Field>

        <Field
          label="Rows per page"
          hint="The default page size for the detailed breakdown table."
        >
          <div className="flex gap-1 rounded-lg border border-line bg-canvas p-1">
            {PAGE_SIZES.map((n) => (
              <button
                key={n}
                onClick={() => onSettingsChange({ pageSize: n })}
                aria-pressed={settings.pageSize === n}
                className={cx(
                  "tnum h-8 min-w-10 rounded-md px-2 text-[12.5px] font-semibold transition-colors",
                  settings.pageSize === n
                    ? "bg-brand text-brand-fg"
                    : "text-ink-2 hover:bg-elevated hover:text-ink"
                )}
              >
                {n}
              </button>
            ))}
          </div>
        </Field>
      </Card>

      <Card>
        <CardHeader
          title="Data"
          subtitle="Loaded file and privacy"
          icon={<FileSpreadsheet className="size-4" />}
        />

        <Field
          label="Loaded exports"
          hint={
            meta
              ? `${meta.rows.toLocaleString()} rows from ${
                  meta.sources.length
                } file${meta.sources.length === 1 ? "" : "s"}${
                  meta.duplicates > 0
                    ? `, ${meta.duplicates.toLocaleString()} overlapping rows removed`
                    : ""
                }${
                  meta.skipped > 0
                    ? `, ${meta.skipped.toLocaleString()} skipped (unreadable dates)`
                    : ""
                }`
              : undefined
          }
        >
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => addRef.current?.click()}
              disabled={busy}
              icon={<Plus className="size-3.5" />}
            >
              Add export
            </Button>
            <input
              ref={addRef}
              type="file"
              accept=".csv,text/csv"
              multiple
              className="sr-only"
              onChange={(e) => {
                onAddFiles(Array.from(e.target.files ?? []));
                e.target.value = "";
              }}
            />
            <Button
              size="sm"
              variant="danger"
              onClick={onReplaceCsv}
              icon={<Trash2 className="size-3.5" />}
            >
              Clear
            </Button>
          </div>
        </Field>

        {meta && meta.sources.length > 0 && (
          <Field
            label="Files merged"
            hint="Add a date-range export at a time to build up a full history; overlaps are removed automatically."
          >
            <ul className="flex max-w-[280px] flex-col gap-1">
              {meta.sources.map((f, i) => (
                <li
                  key={`${f.name}-${i}`}
                  className="flex items-center justify-between gap-2 rounded-md border border-line bg-canvas px-2 py-1"
                >
                  <span className="truncate font-mono text-[11px] text-ink-2">
                    {f.name}
                  </span>
                  <span className="tnum shrink-0 text-[11px] text-ink-3">
                    {f.rows.toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          </Field>
        )}

        <Field
          label="Where your data lives"
          hint="Rows stay in this tab's memory only and are cleared on refresh. Only your theme, goal and page-size preferences are saved to this browser."
        >
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-[var(--brand-soft)] px-2.5 py-1.5 text-[12px] font-semibold text-brand">
            <ShieldCheck className="size-3.5" />
            Never leaves your device
          </span>
        </Field>

        {rows.length > 0 && (
          <Field
            label="Date coverage"
            hint="The span the dashboard is reading from."
          >
            <span className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-2">
              <CalendarRange className="size-3.5 text-ink-3" />
              {format(rows[rows.length - 1].date, "MMM d, yyyy")} –{" "}
              {format(rows[0].date, "MMM d, yyyy")}
            </span>
          </Field>
        )}
      </Card>
    </div>
  );
}
