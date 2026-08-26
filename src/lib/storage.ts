import { DEFAULT_SETTINGS, type Settings, type ThemeChoice } from "./types";

const THEME_KEY = "ledger.theme";
const SETTINGS_KEY = "ledger.settings";

/** Every access is guarded: storage throws in private mode and some embeds. */
function readRaw(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeRaw(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* quota or blocked storage — settings simply do not persist */
  }
}

export function loadTheme(): ThemeChoice {
  const raw = readRaw(THEME_KEY);
  return raw === "light" || raw === "dark" || raw === "system" ? raw : "system";
}

export const saveTheme = (choice: ThemeChoice) => writeRaw(THEME_KEY, choice);

const clampGoal = (n: unknown): number => {
  const v = typeof n === "number" ? n : Number(n);
  if (!isFinite(v)) return DEFAULT_SETTINGS.weeklyGoalHours;
  return Math.min(168, Math.max(1, Math.round(v * 10) / 10));
};

export function loadSettings(): Settings {
  const raw = readRaw(SETTINGS_KEY);
  if (!raw) return DEFAULT_SETTINGS;
  try {
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      weeklyGoalHours: clampGoal(parsed.weeklyGoalHours),
      cycleAnchor:
        typeof parsed.cycleAnchor === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(parsed.cycleAnchor)
          ? parsed.cycleAnchor
          : null,
      pageSize: [10, 25, 50, 100].includes(Number(parsed.pageSize))
        ? Number(parsed.pageSize)
        : DEFAULT_SETTINGS.pageSize,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export const saveSettings = (settings: Settings) =>
  writeRaw(SETTINGS_KEY, JSON.stringify(settings));

/** Inlined in <head> so the correct theme paints before first paint. */
export const THEME_BOOTSTRAP = `(function(){try{var t=localStorage.getItem('${THEME_KEY}');var d=t==='dark'||((!t||t==='system')&&window.matchMedia('(prefers-color-scheme: dark)').matches);var e=document.documentElement;e.classList.toggle('dark',d);e.style.colorScheme=d?'dark':'light';}catch(e){}})();`;
