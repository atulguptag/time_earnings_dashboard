"use client";

import { useCallback, useState } from "react";
import { Check, ChevronDown, Monitor, Moon, Sun } from "lucide-react";
import { useDismiss } from "@/hooks/useDismiss";
import { cx } from "@/components/ui/Primitives";
import type { ThemeChoice } from "@/lib/types";
import { useTheme } from "./ThemeProvider";

const OPTIONS: {
  value: ThemeChoice;
  label: string;
  hint: string;
  Icon: typeof Sun;
}[] = [
  { value: "light", label: "Light", hint: "Always light", Icon: Sun },
  { value: "dark", label: "Dark", hint: "Always dark", Icon: Moon },
  {
    value: "system",
    label: "System",
    hint: "Match your device",
    Icon: Monitor,
  },
];

export function ThemeToggle({ className }: { className?: string }) {
  const { choice, resolved, setChoice, ready } = useTheme();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const ref = useDismiss<HTMLDivElement>(open, close);

  const active = OPTIONS.find((o) => o.value === choice) ?? OPTIONS[2];
  // Before hydration `choice` is a guess, so show the painted theme instead.
  const TriggerIcon = ready ? active.Icon : resolved === "dark" ? Moon : Sun;

  return (
    <div ref={ref} className={cx("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Theme: ${active.label}`}
        title={`Theme: ${active.label}`}
        className={cx(
          "inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-surface px-2",
          "text-[13px] font-medium text-ink-2 transition-colors",
          "hover:border-line-strong hover:text-ink focus:outline-none",
          open && "border-brand text-ink"
        )}
      >
        <TriggerIcon className="size-4" />
        <span className="hidden sm:inline">{ready ? active.label : "Theme"}</span>
        <ChevronDown
          className={cx("size-3.5 transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-1 w-48 overflow-hidden rounded-xl border border-line bg-surface p-1 shadow-lg shadow-black/10"
        >
          {OPTIONS.map(({ value, label, hint, Icon }) => {
            const selected = choice === value;
            return (
              <button
                key={value}
                role="menuitemradio"
                aria-checked={selected}
                onClick={() => {
                  setChoice(value);
                  setOpen(false);
                }}
                className={cx(
                  "flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors",
                  selected ? "bg-elevated" : "hover:bg-elevated"
                )}
              >
                <Icon className="size-4 shrink-0 text-ink-2" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-medium text-ink">
                    {label}
                  </span>
                  <span className="block text-[11.5px] text-ink-3">{hint}</span>
                </span>
                {selected && (
                  <Check className="size-4 shrink-0 text-brand" strokeWidth={2.5} />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
