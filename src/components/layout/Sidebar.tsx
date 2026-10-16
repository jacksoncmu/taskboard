import * as React from "react";
import { DndContext, PointerSensor, KeyboardSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "./dndModifiers";
import { CSS } from "@dnd-kit/utilities";
import {
  Archive,
  ArrowDown,
  ArrowUp,
  CalendarCheck,
  CalendarRange,
  CircleCheckBig,
  EllipsisVertical,
  HardDriveDownload,
  Kanban,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import type { Board, SmartView } from "@/models/types";
import { actions } from "@/store/actions";
import { useAppData } from "@/store/store";
import { useCurrentBoardId, useUI } from "@/store/ui";
import { boardsSorted } from "@/store/operations";
import { isOverdue, todayKey } from "@/lib/dates";
import { downloadBackup } from "@/storage/backup";
import { cn, pluralize } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Logo } from "./Logo";

const SMART: { view: SmartView; label: string; icon: React.ElementType }[] = [
  { view: "today", label: "Today", icon: CalendarCheck },
  { view: "upcoming", label: "Upcoming", icon: CalendarRange },
  { view: "completed", label: "Completed", icon: CircleCheckBig },
  { view: "archived", label: "Archived", icon: Archive },
];

const navItem =
  "group flex h-10 w-full items-center gap-3 rounded-full pl-4 pr-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function Sidebar({ className }: { className?: string }) {
  const data = useAppData();
  const ui = useUI();
  const currentBoardId = useCurrentBoardId();
  const boards = boardsSorted(data);

  const counts = React.useMemo(() => {
    const today = todayKey();
    let todayCount = 0;
    let overdue = 0;
    const perBoard: Record<string, number> = {};
    for (const t of Object.values(data.tasks)) {
      if (t.archived || t.completed) continue;
      perBoard[t.boardId] = (perBoard[t.boardId] ?? 0) + 1;
      if (t.dueDate === today) todayCount++;
      else if (isOverdue(t)) overdue++;
    }
    return { today: todayCount + overdue, overdue, perBoard };
  }, [data.tasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const ids = boards.map((b) => b.id);
    actions.reorderBoards(arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id))));
  };

  return (
    <nav className={cn("flex h-full w-[280px] flex-col bg-background", className)} aria-label="Main">
      <div className="flex h-16 shrink-0 items-center gap-2 px-5">
        <Logo />
      </div>
      <div className="px-3 pb-3">
        <Button variant="fab" size="lg" className="h-14 gap-3 pl-4 pr-6" onClick={() => ui.openNewTask()}>
          <Plus className="!size-6 text-primary" /> Create
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4 scrollbar-thin">
        <ul className="space-y-0.5">
          {SMART.map(({ view, label, icon: Icon }) => {
            const active = ui.nav.kind === "smart" && ui.nav.view === view;
            const badge = view === "today" && counts.today > 0 ? counts.today : null;
            return (
              <li key={view}>
                <button
                  className={cn(
                    navItem,
                    active
                      ? "bg-primary-container font-medium text-on-primary-container"
                      : "text-foreground hover:bg-hover"
                  )}
                  aria-current={active ? "page" : undefined}
                  onClick={() => ui.setNav({ kind: "smart", view })}
                >
                  <Icon className="size-5 shrink-0" />
                  <span className="flex-1 text-left">{label}</span>
                  {badge && (
                    <span
                      className={cn("pr-2 text-xs", counts.overdue ? "font-medium text-overdue" : "text-muted-foreground")}
                      title={counts.overdue ? `${counts.overdue} overdue` : undefined}
                    >
                      {badge}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        <div className="mt-5 flex items-center justify-between pl-4 pr-1">
          <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Boards</h2>
          <Button variant="ghost" size="icon-sm" aria-label="New board" onClick={() => ui.setNewBoardOpen(true)}>
            <Plus />
          </Button>
        </div>
        {boards.length === 0 ? (
          <p className="px-4 py-2 text-sm text-muted-foreground">No boards yet.</p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd} modifiers={[restrictToVerticalAxis]}>
            <SortableContext items={boards.map((b) => b.id)} strategy={verticalListSortingStrategy}>
              <ul className="mt-1 space-y-0.5">
                {boards.map((b, i) => (
                  <BoardItem
                    key={b.id}
                    board={b}
                    index={i}
                    total={boards.length}
                    count={counts.perBoard[b.id] ?? 0}
                    active={ui.nav.kind === "board" && currentBoardId === b.id}
                    onMove={(dir) => {
                      const ids = boards.map((x) => x.id);
                      actions.reorderBoards(arrayMove(ids, i, i + dir));
                    }}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}
      </div>

      <div className="m-3 rounded-2xl bg-surface-2 p-3 text-xs leading-relaxed text-muted-foreground">
        <p>Your tasks are stored only in this browser.</p>
        <button
          className="mt-1.5 inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
          onClick={() => {
            const name = downloadBackup(data);
            actions.updateSettings({ lastExportAt: new Date().toISOString() });
            toast.success(`Backup saved as ${name}`);
          }}
        >
          <HardDriveDownload className="size-3.5" /> Export a backup
        </button>
      </div>
    </nav>
  );
}

function BoardItem({
  board,
  active,
  count,
  index,
  total,
  onMove,
}: {
  board: Board;
  active: boolean;
  count: number;
  index: number;
  total: number;
  onMove: (dir: -1 | 1) => void;
}) {
  const ui = useUI();
  const data = useAppData();
  const [renaming, setRenaming] = React.useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: board.id });

  const remove = async () => {
    const taskCount = Object.values(data.tasks).filter((t) => t.boardId === board.id).length;
    const ok = await ui.confirm({
      title: `Delete "${board.name}"?`,
      description: `The board, its lists and ${pluralize(taskCount, "task")} will be deleted. You can undo right after.`,
      actionLabel: "Delete board",
      destructive: true,
    });
    if (ok) actions.deleteBoard(board.id);
  };

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn("relative", isDragging && "z-10 opacity-70")}
    >
      {renaming ? (
        <input
          autoFocus
          defaultValue={board.name}
          aria-label="Board name"
          className="h-10 w-full rounded-full bg-surface px-4 text-sm outline-none ring-2 ring-primary"
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
        />
      ) : (
        <div
          className={cn(
            navItem,
            "pr-1",
            active ? "bg-primary-container font-medium text-on-primary-container" : "text-foreground hover:bg-hover"
          )}
        >
          <button
            {...attributes}
            {...listeners}
            className="flex min-w-0 flex-1 items-center gap-3 self-stretch text-left outline-none"
            aria-current={active ? "page" : undefined}
            onClick={() => ui.openBoard(board.id)}
            onDoubleClick={() => setRenaming(true)}
          >
            <Kanban className="size-5 shrink-0" />
            <span className="flex-1 truncate">{board.name}</span>
          </button>
          {count > 0 && <span className="text-xs text-muted-foreground group-hover:hidden">{count}</span>}
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="hidden group-hover:inline-flex focus-visible:inline-flex data-[state=open]:inline-flex max-md:inline-flex"
                aria-label={`Board actions for ${board.name}`}
              >
                <EllipsisVertical />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" onCloseAutoFocus={(e) => e.preventDefault()}>
              <DropdownMenuItem onSelect={() => setRenaming(true)}>
                <Pencil /> Rename
              </DropdownMenuItem>
              <DropdownMenuItem disabled={index === 0} onSelect={() => onMove(-1)}>
                <ArrowUp /> Move up
              </DropdownMenuItem>
              <DropdownMenuItem disabled={index === total - 1} onSelect={() => onMove(1)}>
                <ArrowDown /> Move down
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem destructive onSelect={remove}>
                <Trash2 /> Delete board
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </li>
  );
}
