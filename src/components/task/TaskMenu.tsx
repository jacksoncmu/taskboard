import * as React from "react";
import { addDays, format, nextMonday } from "date-fns";
import {
  Archive,
  ArchiveRestore,
  ArrowRight,
  CalendarClock,
  CalendarX,
  Copy,
  CornerDownRight,
  EllipsisVertical,
  Pencil,
  Trash2,
} from "lucide-react";
import type { Task } from "@/models/types";
import { actions } from "@/store/actions";
import { useAppData } from "@/store/store";
import { useUI } from "@/store/ui";
import { boardsSorted, columnsOf } from "@/store/operations";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  task: Task;
  className?: string;
  /** Inside the detail panel: hide items that only open the panel. */
  inDetail?: boolean;
  onDeleted?: () => void;
}

/** Opens the detail panel and focuses one of its fields once it has rendered. */
function openAndFocus(open: () => void, label: string) {
  open();
  setTimeout(() => {
    const el = document.querySelector<HTMLInputElement>(`[role="dialog"] [aria-label="${label}"]`);
    el?.focus();
    if (el?.type === "date") el.showPicker?.();
  }, 250);
}

const dateKey = (d: Date) => format(d, "yyyy-MM-dd");

export function TaskMenu({ task, className, inDetail, onDeleted }: Props) {
  const data = useAppData();
  const ui = useUI();
  const otherBoards = boardsSorted(data).filter((b) => b.id !== task.boardId);
  const columns = columnsOf(data, task.boardId).filter((c) => c.id !== task.columnId);
  const setDue = (dueDate: string) => actions.updateTask(task.id, { dueDate });

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className={cn("text-muted-foreground", className)}
          aria-label="Task actions"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <EllipsisVertical />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[260px]" onClick={(e) => e.stopPropagation()}>
        {!inDetail && (
          <DropdownMenuItem onSelect={() => ui.openTask(task.id)}>
            <Pencil /> Edit
          </DropdownMenuItem>
        )}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <CalendarClock /> Change date
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem onSelect={() => setDue(dateKey(new Date()))}>Today</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setDue(dateKey(addDays(new Date(), 1)))}>Tomorrow</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setDue(dateKey(nextMonday(new Date())))}>Next week</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => openAndFocus(() => ui.openTask(task.id), "Due date")}>
              Pick a date…
            </DropdownMenuItem>
            {task.dueDate && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => actions.updateTask(task.id, { dueDate: null, dueTime: null })}>
                  <CalendarX /> Remove date
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuItem onSelect={() => openAndFocus(() => ui.openTask(task.id), "New subtask")}>
          <CornerDownRight /> Add a subtask
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => actions.duplicateTask(task.id)}>
          <Copy /> Duplicate task
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger disabled={columns.length === 0 && otherBoards.length === 0}>
            <ArrowRight /> Move to another list
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="max-w-[260px]">
            {columns.map((c) => (
              <DropdownMenuItem key={c.id} onSelect={() => actions.moveTask(task.id, c.id, null)}>
                <span className="truncate">{c.name}</span>
              </DropdownMenuItem>
            ))}
            {otherBoards.length > 0 && (
              <>
                {columns.length > 0 && <DropdownMenuSeparator />}
                <DropdownMenuLabel>Other boards</DropdownMenuLabel>
                {otherBoards.map((b) => (
                  <DropdownMenuItem key={b.id} onSelect={() => actions.moveTaskToBoard(task.id, b.id)}>
                    <span className="truncate">{b.name}</span>
                  </DropdownMenuItem>
                ))}
              </>
            )}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuItem
          onSelect={() => {
            actions.archiveTask(task.id, !task.archived);
            if (!task.archived) onDeleted?.();
          }}
        >
          {task.archived ? <ArchiveRestore /> : <Archive />}
          {task.archived ? "Restore from archive" : "Archive"}
        </DropdownMenuItem>
        <DropdownMenuItem
          destructive
          onSelect={() => {
            actions.deleteTasks([task.id]);
            onDeleted?.();
          }}
        >
          <Trash2 /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export const MemoTaskMenu = React.memo(TaskMenu);
