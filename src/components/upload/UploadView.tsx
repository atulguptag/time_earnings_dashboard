"use client";

import { useCallback, useRef, useState } from "react";
import {
  AlertCircle,
  FileSpreadsheet,
  Loader2,
  ShieldCheck,
  Upload,
  Wallet,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Button, cx } from "@/components/ui/Primitives";
import { REQUIRED_COLUMN_LABELS, isCsvFile } from "@/lib/parseCsv";

const HIGHLIGHTS = [
  {
    Icon: ShieldCheck,
    title: "Never leaves your device",
    body: "The file is parsed in your browser. No upload, no server, no account.",
  },
  {
    Icon: FileSpreadsheet,
    title: "Merges split exports",
    body: "Drop in several date-range downloads at once; overlapping rows are removed, real repeats are kept.",
  },
  {
    Icon: Wallet,
    title: "Goals that mean something",
    body: "Set a weekly hours target and track it across rolling 4-week cycles.",
  },
];

export function UploadView({
  onFiles,
  error,
  onError,
  busy,
}: {
  onFiles: (files: File[]) => void;
  error: string;
  onError: (message: string) => void;
  busy: boolean;
}) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const depth = useRef(0);

  const accept = useCallback(
    (list: FileList | null) => {
      const files = Array.from(list ?? []);
      if (files.length === 0) return;
      const csvs = files.filter(isCsvFile);
      if (csvs.length === 0) {
        onError("No CSV files found. Please choose files ending in .csv.");
        return;
      }
      onError(
        csvs.length < files.length
          ? `Ignored ${files.length - csvs.length} non-CSV file(s).`
          : ""
      );
      onFiles(csvs);
    },
    [onFiles, onError]
  );

  return (
    <div className="min-h-dvh bg-canvas">
      <header className="flex h-14 items-center justify-between border-b border-line px-4 sm:px-6">
        <span className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-lg bg-brand text-brand-fg">
            <Wallet className="size-[18px]" strokeWidth={2.25} />
          </span>
          <span className="text-[15px] font-extrabold tracking-[-0.02em] text-ink">
            Ledger
          </span>
        </span>
        <ThemeToggle />
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10 sm:px-6 sm:py-16">
        <div className="max-w-2xl">
          <p className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-[11.5px] font-semibold text-ink-2">
            <span className="size-1.5 rounded-full bg-brand" aria-hidden />
            Runs entirely in your browser
          </p>
          <h1 className="text-[30px] font-extrabold leading-[1.1] tracking-[-0.03em] text-ink sm:text-[42px]">
            Turn your earnings export
            <br className="hidden sm:block" /> into a dashboard worth reading.
          </h1>
          <p className="mt-3 max-w-xl text-[14.5px] leading-relaxed text-ink-2">
            Drop in your Outlier CSV to see hours, payouts, effective rate and
            4-week cycle progress — with the trends that actually explain them.
          </p>
        </div>

        <div
          onDragEnter={(e) => {
            e.preventDefault();
            depth.current += 1;
            setDragging(true);
          }}
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={(e) => {
            e.preventDefault();
            depth.current -= 1;
            if (depth.current <= 0) {
              depth.current = 0;
              setDragging(false);
            }
          }}
          onDrop={(e) => {
            e.preventDefault();
            depth.current = 0;
            setDragging(false);
            accept(e.dataTransfer.files);
          }}
          className={cx(
            "rounded-2xl border-2 border-dashed p-8 text-center transition-colors sm:p-12",
            dragging
              ? "border-brand bg-[var(--brand-soft)]"
              : "border-line bg-surface hover:border-line-strong"
          )}
        >
          <div className="mx-auto flex max-w-md flex-col items-center gap-3">
            <span
              className={cx(
                "grid size-12 place-items-center rounded-xl transition-colors",
                dragging ? "bg-brand text-brand-fg" : "bg-elevated text-ink-2"
              )}
            >
              {busy ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <Upload className="size-5" />
              )}
            </span>

            <p className="text-[16px] font-bold tracking-[-0.01em] text-ink">
              {busy
                ? "Reading your files…"
                : dragging
                ? "Drop to load"
                : "Drop your CSV here"}
            </p>
            <p className="text-[13px] text-ink-3">
              Drop several at once if your export is split by date range — they
              are merged and de-duplicated automatically.
            </p>

            <Button
              variant="primary"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="mt-1 cursor-pointer"
              icon={<FileSpreadsheet className="size-4" />}
            >
              Choose CSV file(s)
            </Button>

            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              multiple
              onChange={(e) => {
                accept(e.target.files);
                // Allows re-picking the same file after an error.
                e.target.value = "";
              }}
            />
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl border border-[var(--neg)] bg-[color-mix(in_srgb,var(--neg)_8%,transparent)] px-3.5 py-3"
          >
            <AlertCircle className="mt-px size-4 shrink-0 text-[var(--neg)]" />
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-ink">
                Could not read that file
              </p>
              <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-2">
                {error}
              </p>
            </div>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-3">
          {HIGHLIGHTS.map(({ Icon, title, body }) => (
            <div
              key={title}
              className="rounded-xl border border-line bg-surface p-4"
            >
              <Icon className="mb-2 size-[18px] text-brand" />
              <p className="text-[13px] font-semibold text-ink">{title}</p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-ink-3">
                {body}
              </p>
            </div>
          ))}
        </div>

        <details className="rounded-xl border border-line bg-surface px-4 py-3">
          <summary className="cursor-pointer list-none text-[13px] font-semibold text-ink-2 hover:text-ink">
            What columns does my CSV need?
          </summary>
          <p className="mt-2.5 text-[12.5px] leading-relaxed text-ink-3">
            Ledger looks for these headers (order does not matter, and the older
            <code className="mx-1 rounded bg-elevated px-1 font-mono text-[11.5px]">
              workDate
            </code>
            style names work too):
          </p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {REQUIRED_COLUMN_LABELS.map((c) => (
              <li
                key={c}
                className="rounded-md border border-line bg-canvas px-1.5 py-0.5 font-mono text-[11.5px] text-ink-2"
              >
                {c}
              </li>
            ))}
          </ul>
        </details>
      </main>
    </div>
  );
}
