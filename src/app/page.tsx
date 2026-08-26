"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { RefreshCw } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { InsightPanel } from "@/components/layout/InsightPanel";
import { NAV_ITEMS } from "@/components/layout/nav";
import { UploadView } from "@/components/upload/UploadView";
import { AnalyticsSection } from "@/components/sections/AnalyticsSection";
import { BreakdownSection } from "@/components/sections/BreakdownSection";
import { CyclesSection } from "@/components/sections/CyclesSection";
import { OverviewSection } from "@/components/sections/OverviewSection";
import { ProjectsSection } from "@/components/sections/ProjectsSection";
import { SettingsSection } from "@/components/sections/SettingsSection";
import { Button } from "@/components/ui/Primitives";
import {
  buildCycles,
  currentCycle,
  resolveAnchor,
  weekProgress,
} from "@/lib/cycles";
import { applyFilters } from "@/lib/filters";
import { groupBy, streaks, summarize } from "@/lib/metrics";
import { parseCsvFiles } from "@/lib/parseCsv";
import { mergeRowSets } from "@/lib/merge";
import { loadSettings, saveSettings } from "@/lib/storage";
import {
  DEFAULT_SETTINGS,
  EMPTY_FILTERS,
  type EarningRow,
  type FileMeta,
  type Filters,
  type SectionId,
  type Settings,
} from "@/lib/types";

export default function HomePage() {
  const [rows, setRows] = useState<EarningRow[] | null>(null);
  const [meta, setMeta] = useState<FileMeta | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [section, setSection] = useState<SectionId>("overview");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>({ ...EMPTY_FILTERS });
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  /**
   * One clock for the whole render tree. Sections derive "today" from this so
   * every panel agrees, and it refreshes if the tab is left open past midnight.
   */
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const id = setInterval(() => {
      setNow((prev) => {
        const next = new Date();
        return format(prev, "yyyy-MM-dd") === format(next, "yyyy-MM-dd")
          ? prev
          : next;
      });
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  // Preferences are read after mount so server and client markup match.
  useEffect(() => setSettings(loadSettings()), []);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  /**
   * Accepts any number of exports and merges them. `append` keeps what is
   * already loaded, which is how you stitch a range-limited download into a
   * full history without re-picking every file.
   */
  const handleFiles = useCallback(
    (files: File[], append = false) => {
      if (files.length === 0) return;
      setBusy(true);
      setError("");

      parseCsvFiles(files, (results, errors) => {
        if (results.length === 0) {
          setError(errors.join(" · ") || "Could not read those files.");
          setBusy(false);
          return;
        }

        setRows((prev) => {
          const sets = append && prev ? [prev, ...results.map((r) => r.rows)]
                                      : results.map((r) => r.rows);
          const merged = mergeRowSets(sets);

          setMeta((prevMeta) => ({
            sources: [
              ...(append && prevMeta ? prevMeta.sources : []),
              ...results.map((r) => r.source),
            ],
            rows: merged.rows.length,
            skipped:
              (append && prevMeta ? prevMeta.skipped : 0) +
              results.reduce((a, r) => a + r.source.skipped, 0),
            duplicates: merged.duplicates,
            truncated: results.some((r) => r.source.truncated),
            uploadedAt: Date.now(),
          }));

          return merged.rows;
        });

        setError(errors.join(" · "));
        if (!append) {
          setFilters({ ...EMPTY_FILTERS });
          setSection("overview");
        }
        setNow(new Date());
        setBusy(false);
      });
    },
    []
  );

  const replaceCsv = useCallback(() => {
    setRows(null);
    setMeta(null);
    setError("");
    setSection("overview");
  }, []);

  /* ------------------------------------------------------------ derived */

  // Stable identity: `rows ?? []` would allocate a fresh array every render
  // and invalidate every memo below it.
  const data = useMemo(() => rows ?? [], [rows]);

  const summaryAll = useMemo(() => summarize(data), [data]);
  const filtered = useMemo(
    () => applyFilters(data, filters, now),
    [data, filters, now]
  );
  const summaryFiltered = useMemo(() => summarize(filtered), [filtered]);

  const cycles = useMemo(
    () => buildCycles(data, settings.weeklyGoalHours, settings.cycleAnchor, now),
    [data, settings.weeklyGoalHours, settings.cycleAnchor, now]
  );
  const cycle = useMemo(() => currentCycle(cycles), [cycles]);
  const cycleAnchor = useMemo(
    () => resolveAnchor(data, settings.cycleAnchor),
    [data, settings.cycleAnchor]
  );
  const week = useMemo(
    () => weekProgress(data, settings.weeklyGoalHours, now),
    [data, settings.weeklyGoalHours, now]
  );
  const streak = useMemo(() => streaks(data), [data]);
  const topProjects = useMemo(
    () => groupBy(data, "projectName").slice(0, 4),
    [data]
  );

  const projectOptions = useMemo(
    () => [...new Set(data.map((r) => r.projectName))].sort(),
    [data]
  );
  const payTypeOptions = useMemo(
    () => [...new Set(data.map((r) => r.payType))].sort(),
    [data]
  );
  const statusOptions = useMemo(() => {
    const map = new Map<string, string>();
    data.forEach((r) => map.set(r.status, r.statusLabel));
    return [...map].map(([key, label]) => ({ key, label }));
  }, [data]);

  /* ------------------------------------------------------------- render */

  if (!rows) {
    return (
      <UploadView
        onFiles={handleFiles}
        error={error}
        onError={setError}
        busy={busy}
      />
    );
  }

  const nav = NAV_ITEMS.find((n) => n.id === section)!;
  const subtitle =
    section === "overview" && meta
      ? `${meta.rows.toLocaleString()} entries · ${
          meta.sources.length === 1
            ? meta.sources[0].name
            : `${meta.sources.length} files merged`
        }`
      : nav.hint;

  return (
    <AppShell
      section={section}
      onSectionChange={setSection}
      title={nav.label}
      subtitle={subtitle}
      drawerOpen={drawerOpen}
      onDrawerChange={setDrawerOpen}
      actions={
        <Button
          size="sm"
          variant="secondary"
          onClick={replaceCsv}
          icon={<RefreshCw className="size-3.5" />}
          className="px-2 sm:px-3"
        >
          <span className="hidden sm:inline">Replace CSV</span>
        </Button>
      }
      // Overview only. Kept on every tab it crowded the charts and tables and
      // repeated what those sections already show.
      panel={
        section === "overview" ? (
        <InsightPanel
          cycle={cycle}
          week={week}
          summary={summaryAll}
          topProjects={topProjects}
          streak={streak}
          onOpenCycles={() => setSection("cycles")}
        />
        ) : undefined
      }
      // Below xl there is no side column, so the overview carries this
      // context inline rather than dropping it entirely.
      mobilePanel={
        section === "overview" ? (
          <InsightPanel
            cycle={cycle}
            week={week}
            summary={summaryAll}
            topProjects={topProjects}
            streak={streak}
            onOpenCycles={() => setSection("cycles")}
            showWeek={false}
          />
        ) : undefined
      }
    >
      {section === "overview" && (
        <OverviewSection
          rows={data}
          summary={summaryAll}
          week={week}
          cycle={cycle}
          now={now}
          onOpenAnalytics={() => setSection("analytics")}
          onOpenSettings={() => setSection("settings")}
        />
      )}

      {section === "analytics" && (
        <AnalyticsSection
          rows={data}
          filtered={filtered}
          summary={summaryFiltered}
          filters={filters}
          onFiltersChange={setFilters}
          projects={projectOptions}
          payTypes={payTypeOptions}
          statuses={statusOptions}
          now={now}
        />
      )}

      {section === "breakdown" && (
        <BreakdownSection
          rows={data}
          filtered={filtered}
          summary={summaryFiltered}
          filters={filters}
          onFiltersChange={setFilters}
          projects={projectOptions}
          payTypes={payTypeOptions}
          statuses={statusOptions}
          pageSize={settings.pageSize}
          onPageSizeChange={(n) => updateSettings({ pageSize: n })}
          now={now}
        />
      )}

      {section === "cycles" && (
        <CyclesSection
          cycles={cycles}
          weeklyGoal={settings.weeklyGoalHours}
          anchor={cycleAnchor}
          onGoalChange={(h) => updateSettings({ weeklyGoalHours: h })}
          onOpenSettings={() => setSection("settings")}
        />
      )}

      {section === "projects" && (
        <ProjectsSection
          rows={data}
          filtered={filtered}
          filters={filters}
          onFiltersChange={setFilters}
          projects={projectOptions}
          payTypes={payTypeOptions}
          statuses={statusOptions}
          now={now}
        />
      )}

      {section === "settings" && (
        <SettingsSection
          settings={settings}
          onSettingsChange={updateSettings}
          rows={data}
          meta={meta}
          onReplaceCsv={replaceCsv}
          onAddFiles={(files) => handleFiles(files, true)}
          busy={busy}
        />
      )}
    </AppShell>
  );
}
