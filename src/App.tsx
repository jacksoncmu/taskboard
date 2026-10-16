import * as React from "react";
import { Toaster, toast } from "sonner";
import { AlertTriangle, Kanban, Plus, Sparkles } from "lucide-react";
import { useStore, store } from "@/store/store";
import { UIProvider, useCurrentBoardId, useUI } from "@/store/ui";
import { actions } from "@/store/actions";
import { isTypingTarget, cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/layout/Sidebar";
import { Toolbar } from "@/components/layout/Toolbar";
import { EmptyState } from "@/components/layout/EmptyState";
import { useApplyTheme, useIsDark } from "@/components/layout/theme";
import { BoardView } from "@/components/board/BoardView";
import { ListView } from "@/components/views/ListView";
import { CalendarView } from "@/components/views/CalendarView";
import { SmartViewPage } from "@/components/views/SmartViews";
import { TaskDetailPanel } from "@/components/task/TaskDetail";
import { NewTaskDialog } from "@/components/task/NewTaskDialog";
import { SettingsDialog } from "@/components/settings/SettingsDialog";
import { ImportDialog } from "@/components/settings/ImportDialog";
import { ConfirmDialog, NewBoardDialog, OnboardingDialog, ShortcutsDialog } from "@/components/settings/Dialogs";

store.setErrorHandler((m) => toast.error(m));

export default function App() {
  const { status } = useStore();
  useApplyTheme();
  const isDark = useIsDark();

  if (status === "loading") {
    return (
      <div className="flex h-full items-center justify-center" aria-busy="true">
        <div className="size-10 animate-spin rounded-full border-4 border-primary-container border-t-primary" />
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={500}>
      <UIProvider>
        <Shell />
        <TaskDetailPanel />
        <NewTaskDialog />
        <NewBoardDialog />
        <SettingsDialog />
        <ImportDialog />
        <ShortcutsDialog />
        <ConfirmDialog />
        <OnboardingDialog />
        <Toaster
          position="bottom-left"
          theme={isDark ? "dark" : "light"}
          toastOptions={{
            className: "!rounded-lg !bg-[#3c4043] !text-white !border-0 dark:!bg-[#e3e3e3] dark:!text-[#1f1f1f]",
            actionButtonStyle: { background: "transparent", color: "var(--primary-hover)", fontWeight: 600 },
          }}
        />
      </UIProvider>
    </TooltipProvider>
  );
}

function useShortcuts() {
  const ui = useUI();
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || isTypingTarget(e.target)) return;
      // Ignore while a dialog/menu is open.
      if (document.querySelector('[role="dialog"], [role="alertdialog"], [role="menu"]')) return;
      const k = e.key;
      if (k === "c" || k === "n") ui.openNewTask();
      else if (k === "/") ui.focusSearch();
      else if (k === "b") ui.setNewBoardOpen(true);
      else if (k === "1") ui.setView("board");
      else if (k === "2") ui.setView("list");
      else if (k === "3") ui.setView("calendar");
      else if (k === "t") ui.setNav({ kind: "smart", view: "today" });
      else if (k === "?") ui.setShortcutsOpen(true);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ui]);
}

function Shell() {
  const ui = useUI();
  const { data, storageError } = useStore();
  const boardId = useCurrentBoardId();
  const sidebarOpen = data.settings.sidebarOpen;
  useShortcuts();

  const toggleSidebar = () => {
    if (window.matchMedia("(min-width: 1024px)").matches) actions.updateSettings({ sidebarOpen: !sidebarOpen });
    else ui.setMobileNavOpen(!ui.mobileNavOpen);
  };

  let content: React.ReactNode;
  if (ui.nav.kind === "smart") {
    content = <SmartViewPage view={ui.nav.view} />;
  } else if (!boardId) {
    content = (
      <EmptyState
        icon={Kanban}
        title="Create your first board"
        description="Boards hold lists of tasks. Start with a fresh board, or try a demo board to explore."
      >
        <Button onClick={() => ui.setNewBoardOpen(true)}>
          <Plus /> New board
        </Button>
        <Button variant="outline" onClick={() => actions.loadDemo()}>
          <Sparkles /> Load demo board
        </Button>
      </EmptyState>
    );
  } else if (ui.view === "list") {
    content = <ListView boardId={boardId} />;
  } else if (ui.view === "calendar") {
    content = <CalendarView boardId={boardId} />;
  } else {
    content = <BoardView key={boardId} boardId={boardId} />;
  }

  return (
    <div className="flex h-full">
      {/* desktop sidebar */}
      <div
        className={cn(
          "hidden shrink-0 overflow-hidden transition-[width] duration-200 lg:block",
          sidebarOpen ? "w-[280px]" : "w-0"
        )}
      >
        <Sidebar />
      </div>
      {/* mobile drawer */}
      {ui.mobileNavOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => ui.setMobileNavOpen(false)} />
          <Sidebar className="absolute inset-y-0 left-0 animate-[tb-in_160ms_ease-out] rounded-r-2xl shadow-g3" />
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <Toolbar onToggleSidebar={toggleSidebar} />
        {storageError && (
          <div className="mx-2 mb-2 flex items-start gap-2 rounded-xl bg-destructive-container px-4 py-2.5 text-sm sm:mx-4" role="alert">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
            <span>{storageError}</span>
          </div>
        )}
        <main className="mx-0 mb-0 min-h-0 flex-1 overflow-hidden bg-surface pt-2 sm:mb-2 sm:mr-2 sm:rounded-[24px] lg:ml-0 sm:ml-2">
          {content}
        </main>
      </div>
    </div>
  );
}
