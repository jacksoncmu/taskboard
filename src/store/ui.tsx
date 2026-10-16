/** Transient UI state (navigation, search, filters, open dialogs) shared across the app. */
import * as React from "react";
import type { ID, SmartView, ViewMode } from "@/models/types";
import { EMPTY_FILTERS, type TaskFilters } from "@/lib/taskQuery";
import { actions } from "./actions";
import { useAppData } from "./store";

export type Nav = { kind: "board" } | { kind: "smart"; view: SmartView };
export type Scope = "board" | "all";

export interface NewTaskDefaults {
  boardId?: ID;
  columnId?: ID;
  dueDate?: string | null;
}

export interface ConfirmOptions {
  title: string;
  description: React.ReactNode;
  actionLabel?: string;
  destructive?: boolean;
}

interface UIState {
  nav: Nav;
  setNav: (nav: Nav) => void;
  openBoard: (id: ID) => void;
  view: ViewMode;
  setView: (v: ViewMode) => void;
  scope: Scope;
  setScope: (s: Scope) => void;
  search: string;
  setSearch: (s: string) => void;
  filters: TaskFilters;
  setFilters: React.Dispatch<React.SetStateAction<TaskFilters>>;
  clearFilters: () => void;
  openTaskId: ID | null;
  openTask: (id: ID | null) => void;
  newTask: NewTaskDefaults | null;
  openNewTask: (defaults?: NewTaskDefaults) => void;
  closeNewTask: () => void;
  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
  shortcutsOpen: boolean;
  setShortcutsOpen: (open: boolean) => void;
  importOpen: boolean;
  setImportOpen: (open: boolean) => void;
  newBoardOpen: boolean;
  setNewBoardOpen: (open: boolean) => void;
  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
  confirmState: (ConfirmOptions & { resolve: (ok: boolean) => void }) | null;
  closeConfirm: () => void;
  /** Incremented to ask the toolbar search box to take focus. */
  searchFocusSignal: number;
  focusSearch: () => void;
}

const UIContext = React.createContext<UIState | null>(null);

export function UIProvider({ children }: { children: React.ReactNode }) {
  const data = useAppData();
  const [nav, setNavState] = React.useState<Nav>({ kind: "board" });
  const [scope, setScope] = React.useState<Scope>("board");
  const [search, setSearch] = React.useState("");
  const [filters, setFilters] = React.useState<TaskFilters>(EMPTY_FILTERS);
  const [openTaskId, setOpenTaskId] = React.useState<ID | null>(null);
  const [newTask, setNewTask] = React.useState<NewTaskDefaults | null>(null);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [shortcutsOpen, setShortcutsOpen] = React.useState(false);
  const [importOpen, setImportOpen] = React.useState(false);
  const [newBoardOpen, setNewBoardOpen] = React.useState(false);
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);
  const [confirmState, setConfirmState] = React.useState<UIState["confirmState"]>(null);
  const [searchFocusSignal, setSearchFocusSignal] = React.useState(0);

  const view = data.settings.lastView;

  const value: UIState = {
    nav,
    setNav: (n) => {
      setNavState(n);
      setMobileNavOpen(false);
    },
    openBoard: (id) => {
      actions.updateSettings({ lastBoardId: id });
      setNavState({ kind: "board" });
      setMobileNavOpen(false);
    },
    view,
    setView: (v) => {
      actions.updateSettings({ lastView: v });
      setNavState({ kind: "board" });
    },
    scope,
    setScope,
    search,
    setSearch,
    filters,
    setFilters,
    clearFilters: () => setFilters(EMPTY_FILTERS),
    openTaskId: openTaskId && data.tasks[openTaskId] ? openTaskId : null,
    openTask: setOpenTaskId,
    newTask,
    openNewTask: (d = {}) => setNewTask(d),
    closeNewTask: () => setNewTask(null),
    settingsOpen,
    setSettingsOpen,
    shortcutsOpen,
    setShortcutsOpen,
    importOpen,
    setImportOpen,
    newBoardOpen,
    setNewBoardOpen,
    mobileNavOpen,
    setMobileNavOpen,
    confirm: (opts) => new Promise<boolean>((resolve) => setConfirmState({ ...opts, resolve })),
    confirmState,
    closeConfirm: () => setConfirmState(null),
    searchFocusSignal,
    focusSearch: () => setSearchFocusSignal((n) => n + 1),
  };
  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI(): UIState {
  const ctx = React.useContext(UIContext);
  if (!ctx) throw new Error("useUI must be used inside UIProvider");
  return ctx;
}

/** Current board (falls back to the first board when the saved one no longer exists). */
export function useCurrentBoardId(): ID | null {
  const data = useAppData();
  const saved = data.settings.lastBoardId;
  if (saved && data.boards[saved]) return saved;
  const first = Object.values(data.boards).sort((a, b) => a.order - b.order)[0];
  return first?.id ?? null;
}
