"use client";

import { useCallback, useEffect, type ReactNode } from "react";
import { Menu, Wallet, X } from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Button, cx } from "@/components/ui/Primitives";
import type { SectionId } from "@/lib/types";
import { NAV_ITEMS } from "./nav";

/* ------------------------------------------------------------------ Mark */

function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand text-brand-fg">
        <Wallet className="size-[18px]" strokeWidth={2.25} />
      </span>
      {!compact && (
        <span className="text-[15px] font-extrabold tracking-[-0.02em] text-ink">
          Ledger
        </span>
      )}
    </span>
  );
}

/* ------------------------------------------------------------- Nav items */

function NavButton({
  item,
  active,
  onSelect,
  variant,
}: {
  item: (typeof NAV_ITEMS)[number];
  active: boolean;
  onSelect: () => void;
  variant: "rail" | "drawer";
}) {
  const { Icon, label, hint } = item;

  if (variant === "rail") {
    return (
      <button
        type="button"
        data-section={item.id}
        onClick={onSelect}
        aria-current={active ? "page" : undefined}
        title={`${label} — ${hint}`}
        className={cx(
          "group relative flex w-full flex-col items-center gap-1 rounded-xl py-2.5 transition-colors",
          active
            ? "bg-[var(--brand-soft)] text-brand"
            : "text-ink-3 hover:bg-elevated hover:text-ink"
        )}
      >
        <Icon className="size-[19px]" strokeWidth={active ? 2.4 : 2} />
        <span className="text-[9.5px] font-semibold tracking-tight">
          {label}
        </span>
        {active && (
          <span
            className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-brand"
            aria-hidden
          />
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      data-section={item.id}
      onClick={onSelect}
      aria-current={active ? "page" : undefined}
      className={cx(
        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
        active
          ? "bg-[var(--brand-soft)] text-brand"
          : "text-ink-2 hover:bg-elevated hover:text-ink"
      )}
    >
      <Icon className="size-[18px] shrink-0" strokeWidth={active ? 2.4 : 2} />
      <span className="min-w-0">
        <span className="block text-[13.5px] font-semibold">{label}</span>
        <span className="block text-[11.5px] text-ink-3">{hint}</span>
      </span>
    </button>
  );
}

/* ----------------------------------------------------------------- Shell */

export function AppShell({
  section,
  onSectionChange,
  title,
  subtitle,
  actions,
  panel,
  mobilePanel,
  drawerOpen,
  onDrawerChange,
  children,
}: {
  section: SectionId;
  onSectionChange: (id: SectionId) => void;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  /** Right-hand column, shown from the xl breakpoint up. */
  panel?: ReactNode;
  /** Same information for narrower screens, rendered inline below the page. */
  mobilePanel?: ReactNode;
  drawerOpen: boolean;
  onDrawerChange: (open: boolean) => void;
  children: ReactNode;
}) {
  const closeDrawer = useCallback(() => onDrawerChange(false), [onDrawerChange]);

  // Lock body scroll behind the mobile drawer, and close it on Escape.
  useEffect(() => {
    if (!drawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeDrawer();
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [drawerOpen, closeDrawer]);

  const select = (id: SectionId) => {
    onSectionChange(id);
    closeDrawer();
  };

  return (
    <div className="min-h-dvh bg-canvas">
      {/* Desktop rail */}
      <nav
        aria-label="Sections"
        className="fixed inset-y-0 left-0 z-30 hidden w-[76px] flex-col border-r border-line bg-surface lg:flex"
      >
        <div className="grid h-14 shrink-0 place-items-center border-b border-line">
          <Wordmark compact />
        </div>
        <div className="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
          {NAV_ITEMS.map((item) => (
            <NavButton
              key={item.id}
              item={item}
              active={section === item.id}
              onSelect={() => select(item.id)}
              variant="rail"
            />
          ))}
        </div>
      </nav>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Close menu"
            onClick={closeDrawer}
            className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
          />
          <nav
            aria-label="Sections"
            className="absolute inset-y-0 left-0 flex w-[264px] max-w-[82vw] flex-col border-r border-line bg-surface"
          >
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-line px-3">
              <Wordmark />
              <Button
                variant="ghost"
                size="sm"
                onClick={closeDrawer}
                aria-label="Close menu"
                className="px-2"
              >
                <X className="size-4" />
              </Button>
            </div>
            <div className="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
              {NAV_ITEMS.map((item) => (
                <NavButton
                  key={item.id}
                  item={item}
                  active={section === item.id}
                  onSelect={() => select(item.id)}
                  variant="drawer"
                />
              ))}
            </div>
          </nav>
        </div>
      )}

      <div className="lg:pl-[76px]">
        {/* Top bar */}
        <header className="sticky top-0 z-20 border-b border-line bg-canvas/85 backdrop-blur-md">
          <div className="flex h-14 items-center gap-2 px-3 sm:px-5">
            <Button
              variant="ghost"
              onClick={() => onDrawerChange(true)}
              aria-label="Open menu"
              className="px-2 lg:hidden"
            >
              <Menu className="size-5" />
            </Button>
            <div className="lg:hidden">
              <Wordmark compact />
            </div>

            <div className="ml-1 min-w-0 flex-1">
              <h1 className="truncate text-[15px] font-bold tracking-[-0.02em] text-ink sm:text-[17px]">
                {title}
              </h1>
              {subtitle && (
                <p className="hidden truncate text-[12px] text-ink-3 sm:block">
                  {subtitle}
                </p>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {actions}
              <ThemeToggle />
            </div>
          </div>
        </header>

        <div className="flex items-start">
          <main className="min-w-0 flex-1 p-3 pb-16 sm:p-5">
            {children}
            {mobilePanel && (
              <div className="mt-4 rounded-[14px] border border-line bg-surface p-4 xl:hidden">
                {mobilePanel}
              </div>
            )}
          </main>

          {panel && (
            <aside
              aria-label="Live summary"
              className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-[304px] shrink-0 overflow-y-auto border-l border-line bg-surface p-4 xl:block scrollbar-slim"
            >
              {panel}
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
