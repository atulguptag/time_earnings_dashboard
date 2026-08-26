import {
  BarChart3,
  Boxes,
  LayoutGrid,
  Settings,
  Table2,
  Target,
} from "lucide-react";
import type { SectionId } from "@/lib/types";

export interface NavItem {
  id: SectionId;
  label: string;
  hint: string;
  Icon: typeof LayoutGrid;
}

export const NAV_ITEMS: NavItem[] = [
  {
    id: "overview",
    label: "Overview",
    hint: "Your week at a glance",
    Icon: LayoutGrid,
  },
  {
    id: "analytics",
    label: "Analytics",
    hint: "Trends and comparisons",
    Icon: BarChart3,
  },
  {
    id: "breakdown",
    label: "Breakdown",
    hint: "Every earnings log",
    Icon: Table2,
  },
  {
    id: "cycles",
    label: "Cycles",
    hint: "4-week goal progress",
    Icon: Target,
  },
  {
    id: "projects",
    label: "Projects",
    hint: "Where the money comes from",
    Icon: Boxes,
  },
  {
    id: "settings",
    label: "Settings",
    hint: "Goals, theme and data",
    Icon: Settings,
  },
];
