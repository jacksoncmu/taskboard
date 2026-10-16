import * as React from "react";
import { toast } from "sonner";
import {
  CalendarDays,
  HardDriveDownload,
  HardDriveUpload,
  Kanban,
  Keyboard,
  List,
  Menu,
  Moon,
  Search,
  Settings,
  Sun,
  X,
} from "lucide-react";
import type { ViewMode } from "@/models/types";
import { actions } from "@/store/actions";
import { useAppData } from "@/store/store";
import { useCurrentBoardId, useUI } from "@/store/ui";
import { downloadBackup } from "@/storage/backup";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/misc";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FilterMenu } from "./FilterMenu";
import { useIsDark } from "./theme";

const VIEWS: { value: ViewMode; label: string; icon: React.ElementType; key: string }[] = [
  { value: "board", label: "Board", icon: Kanban, key: "1" },
  { value: "list", label: "List", icon: List, key: "2" },
  { value: "calendar", label: "Calendar", icon: CalendarDays, key: "3" },
];

const SMART_TITLES = { today: "Today", upcoming: "Upcoming", completed: "Completed", archived: "Archived" };

export function Toolbar({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const ui = useUI();
  const data = useAppData();
  const boardId = useCurrentBoardId();
  const board = boardId ? data.boards[boardId] : null;
  const searchRef = React.useRef<HTMLInputElement>(null);
  const [renaming, setRenaming] = React.useState(false);
  const isDark = useIsDark();

  React.useEffect(() => {
    if (ui.searchFocusSignal) {
      searchRef.current?.focus();
      searchRef.current?.select();
    }
  }, [ui.searchFocusSignal]);

  const onBoard = ui.nav.kind === "board";
  const title = ui.nav.kind === "smart" ? SMART_TITLES[ui.nav.view] : (board?.name ?? "Taskboard");

  const exportData = () => {
    const name = downloadBackup(data);
    actions.updateSettings({ lastExportAt: new Date().toISOString() });
    toast.success(`Backup saved as ${name}`);
  };

  return (
    <header className="flex shrink-0 flex-wrap items-center gap-x-2 gap-y-2 px-2 py-2 sm:px-4">
      <Tooltip content="Main menu">
        <Button variant="ghost" size="icon" onClick={onToggleSidebar} aria-label="Toggle navigation">
          <Menu />
        </Button>
      </Tooltip>

      <div className="min-w-0 flex-1 md:max-w-[30%] md:flex-none">
        {onBoard && board && renaming ? (
          <input
            autoFocus
            defaultValue={board.name}
            aria-label="Board name"
            onFocus={(e) => e.target.select()}
            onBlur={(e) => {
              actions.renameBoard(board.id, e.target.value);
              setRenaming(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") {
                e.currentTarget.value = board.name;
                e.currentTarget.blur();
              }
            }}
            className="h-10 w-full rounded-lg bg-surface px-2 text-[22px] outline-none ring-2 ring-primary"
          />
        ) : (
          <h1
            className={cn(
              "truncate rounded-lg px-2 py-1 text-lg font-normal text-foreground sm:text-[22px]",
              onBoard && board && "cursor-text hover:bg-hover"
            )}
            onClick={() => onBoard && board && setRenaming(true)}
            title={onBoard && board ? "Click to rename board" : undefined}
          >
            {title}
          </h1>
        )}
      </div>

      <div className="order-last flex min-w-0 basis-full items-center md:order-none md:mx-auto md:basis-auto md:flex-1 md:justify-center">
        <label className="flex h-11 w-full max-w-[640px] items-center gap-2 rounded-full bg-surface-3 px-4 transition-colors focus-within:bg-surface focus-within:shadow-g1">
          <Search className="size-5 shrink-0 text-muted-foreground" />
          <input
            ref={searchRef}
            value={ui.search}
            onChange={(e) => ui.setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                ui.setSearch("");
                e.currentTarget.blur();
              }
            }}
            placeholder="Search tasks, descriptions and labels"
            aria-label="Search tasks"
            className="h-full min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
          />
          {ui.search ? (
            <button
              onClick={() => ui.setSearch("")}
              className="rounded-full p-1 text-muted-foreground hover:bg-hover"
              aria-label="Clear search"
            >
              <X className="size-4" />
            </button>
          ) : (
            <kbd className="hidden rounded border border-border-strong px-1.5 text-[11px] text-muted-foreground sm:inline">/</kbd>
          )}
        </label>
      </div>

      <div className="ml-auto flex items-center gap-1">
        <FilterMenu />
        {onBoard && board && (
          <div className="flex h-10 items-center rounded-full border border-border-strong p-0.5" role="tablist" aria-label="View">
            {VIEWS.map((v) => {
              const active = ui.view === v.value;
              return (
                <Tooltip key={v.value} content={`${v.label} view (${v.key})`}>
                  <button
                    role="tab"
                    aria-selected={active}
                    aria-label={`${v.label} view`}
                    onClick={() => ui.setView(v.value)}
                    className={cn(
                      "flex h-full items-center gap-1.5 rounded-full px-2.5 text-sm transition-colors sm:px-3",
                      active
                        ? "bg-primary-container font-medium text-on-primary-container"
                        : "text-muted-foreground hover:bg-hover"
                    )}
                  >
                    <v.icon className="size-[18px]" />
                    <span className="max-xl:hidden">{v.label}</span>
                  </button>
                </Tooltip>
              );
            })}
          </div>
        )}
        <DropdownMenu modal={false}>
          <Tooltip content="Backup & restore">
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Backup and restore" className="max-sm:hidden">
                <HardDriveDownload />
              </Button>
            </DropdownMenuTrigger>
          </Tooltip>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={exportData}>
              <HardDriveDownload /> Export data (JSON)
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => ui.setImportOpen(true)}>
              <HardDriveUpload /> Import data…
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu modal={false}>
          <Tooltip content="Settings">
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Settings menu">
                <Settings />
              </Button>
            </DropdownMenuTrigger>
          </Tooltip>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => ui.setSettingsOpen(true)}>
              <Settings /> Settings
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => actions.updateSettings({ theme: isDark ? "light" : "dark" })}>
              {isDark ? <Sun /> : <Moon />} {isDark ? "Light theme" : "Dark theme"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={exportData}>
              <HardDriveDownload /> Export data
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => ui.setImportOpen(true)}>
              <HardDriveUpload /> Import data…
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => ui.setShortcutsOpen(true)}>
              <Keyboard /> Keyboard shortcuts
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
