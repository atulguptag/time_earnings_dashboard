"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { loadTheme, saveTheme } from "@/lib/storage";
import type { ResolvedTheme, ThemeChoice } from "@/lib/types";

interface ThemeContextValue {
  /** What the user picked: light, dark, or follow the OS. */
  choice: ThemeChoice;
  /** What is actually painted right now. */
  resolved: ResolvedTheme;
  setChoice: (choice: ThemeChoice) => void;
  /** False until after hydration, so SSR markup stays stable. */
  ready: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const systemTheme = (): ResolvedTheme =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";

function paint(resolved: ResolvedTheme) {
  const el = document.documentElement;
  el.classList.toggle("dark", resolved === "dark");
  el.style.colorScheme = resolved;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [choice, setChoiceState] = useState<ThemeChoice>("system");
  const [resolved, setResolved] = useState<ResolvedTheme>("light");
  const [ready, setReady] = useState(false);

  // Adopt the stored choice once mounted; the inline bootstrap already
  // painted the right colours, this just syncs React to them.
  useEffect(() => {
    const stored = loadTheme();
    const next = stored === "system" ? systemTheme() : stored;
    setChoiceState(stored);
    setResolved(next);
    paint(next);
    setReady(true);
  }, []);

  // Follow the OS while the choice is "system".
  useEffect(() => {
    if (choice !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const next = mq.matches ? "dark" : "light";
      setResolved(next);
      paint(next);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [choice]);

  const setChoice = useCallback((next: ThemeChoice) => {
    const nextResolved = next === "system" ? systemTheme() : next;
    setChoiceState(next);
    setResolved(nextResolved);
    paint(nextResolved);
    saveTheme(next);
  }, []);

  const value = useMemo(
    () => ({ choice, resolved, setChoice, ready }),
    [choice, resolved, setChoice, ready]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}
