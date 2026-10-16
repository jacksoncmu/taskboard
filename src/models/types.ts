export type ID = string;

export type Priority = "none" | "low" | "medium" | "high" | "urgent";

export type ThemePreference = "light" | "dark" | "system";

export type ViewMode = "board" | "list" | "calendar";

export type SmartView = "today" | "upcoming" | "completed" | "archived";

export type ListGroupBy = "none" | "board" | "status" | "dueDate" | "priority";

export type ListSortBy = "manual" | "dueDate" | "priority" | "createdAt" | "title";

export interface Board {
  id: ID;
  name: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface Column {
  id: ID;
  boardId: ID;
  name: string;
  order: number;
  /** Tasks in a completion column are considered done. */
  isDoneColumn: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Subtask {
  id: ID;
  title: string;
  completed: boolean;
  createdAt: string;
  completedAt: string | null;
}

export interface Tag {
  id: ID;
  name: string;
  /** Hex color, e.g. #1a73e8 */
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: ID;
  boardId: ID;
  columnId: ID;
  title: string;
  description: string;
  notes: string;
  priority: Priority;
  /** yyyy-MM-dd (local calendar date) */
  dueDate: string | null;
  /** HH:mm (24h) */
  dueTime: string | null;
  /** yyyy-MM-dd */
  startDate: string | null;
  tagIds: ID[];
  subtasks: Subtask[];
  completed: boolean;
  completedAt: string | null;
  archived: boolean;
  archivedAt: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface Settings {
  theme: ThemePreference;
  lastBoardId: ID | null;
  lastView: ViewMode;
  listGroupBy: ListGroupBy;
  listSortBy: ListSortBy;
  showCompletedOnBoard: boolean;
  sidebarOpen: boolean;
  /** Set once the first-run choice (demo or empty) has been made. */
  onboarded: boolean;
  lastExportAt: string | null;
}

export interface AppData {
  boards: Record<ID, Board>;
  columns: Record<ID, Column>;
  tasks: Record<ID, Task>;
  tags: Record<ID, Tag>;
  settings: Settings;
}

export type EntityKind = "boards" | "columns" | "tasks" | "tags";

/** Shape of an exported backup file. */
export interface BackupFile {
  app: "taskboard";
  schemaVersion: number;
  exportedAt: string;
  data: {
    boards: Board[];
    columns: Column[];
    tasks: Task[];
    tags: Tag[];
    settings: Settings;
  };
}
