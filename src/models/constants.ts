import type { Priority, Settings } from "./types";

/** Version of the data schema used in IndexedDB and in backup files. */
export const SCHEMA_VERSION = 1;

export const DEFAULT_COLUMNS = ["To Do", "In Progress", "Done"] as const;

export const DEFAULT_SETTINGS: Settings = {
  theme: "system",
  lastBoardId: null,
  lastView: "board",
  listGroupBy: "status",
  listSortBy: "manual",
  showCompletedOnBoard: true,
  sidebarOpen: true,
  onboarded: false,
  lastExportAt: null,
};

export interface PriorityMeta {
  value: Priority;
  label: string;
  rank: number;
  /** CSS color used for flags and indicators */
  color: string;
}

export const PRIORITIES: PriorityMeta[] = [
  { value: "urgent", label: "Urgent", rank: 4, color: "#d93025" },
  { value: "high", label: "High", rank: 3, color: "#e8710a" },
  { value: "medium", label: "Medium", rank: 2, color: "#f9ab00" },
  { value: "low", label: "Low", rank: 1, color: "#1a73e8" },
  { value: "none", label: "None", rank: 0, color: "#80868b" },
];

export const PRIORITY_BY_VALUE = Object.fromEntries(PRIORITIES.map((p) => [p.value, p])) as Record<
  Priority,
  PriorityMeta
>;

export const TAG_COLORS: { name: string; value: string }[] = [
  { name: "Tomato", value: "#d50000" },
  { name: "Flamingo", value: "#e67c73" },
  { name: "Tangerine", value: "#f4511e" },
  { name: "Banana", value: "#f6bf26" },
  { name: "Sage", value: "#33b679" },
  { name: "Basil", value: "#0b8043" },
  { name: "Peacock", value: "#039be5" },
  { name: "Blueberry", value: "#3f51b5" },
  { name: "Lavender", value: "#7986cb" },
  { name: "Grape", value: "#8e24aa" },
  { name: "Graphite", value: "#616161" },
];
