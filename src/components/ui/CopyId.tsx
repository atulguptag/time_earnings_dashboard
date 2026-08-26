"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { cx } from "./Primitives";

/**
 * Shows an item ID in full and makes it copyable.
 *
 * These IDs are how you look a task up on the earnings platform, so an
 * abbreviated one is useless — an earlier version rendered only the last 10 of
 * 24 characters, with no ellipsis to signal the value was clipped.
 */
export function CopyId({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textRef = useRef<HTMLSpanElement>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Blocked clipboard (insecure origin, permissions): select the text so
      // the reader can still copy it by hand rather than losing the value.
      const node = textRef.current;
      if (node) {
        const range = document.createRange();
        range.selectNodeContents(node);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
      return;
    }
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1400);
  }, [value]);

  if (!value) return <span className="text-ink-3">—</span>;

  return (
    <span className={cx("group/id inline-flex items-center gap-1", className)}>
      <span
        ref={textRef}
        // select-all makes a single click grab the whole ID.
        className="select-all font-mono text-[11px] text-ink-3"
      >
        {value}
      </span>
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? "Item ID copied" : `Copy item ID ${value}`}
        title="Copy item ID"
        className={cx(
          "shrink-0 rounded p-0.5 text-ink-3 transition-opacity",
          "hover:bg-elevated hover:text-ink",
          "opacity-0 group-hover/id:opacity-100 focus-visible:opacity-100",
          copied && "opacity-100 text-[var(--pos)]"
        )}
      >
        {copied ? (
          <Check className="size-3" strokeWidth={3} />
        ) : (
          <Copy className="size-3" />
        )}
      </button>
    </span>
  );
}
