import * as React from "react";
import {
  Archive,
  ArchiveRestore,
  Check,
  Copy,
  EllipsisVertical,
  FolderInput,
  Pencil,
  RotateCcw,
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
  /** Hide the "Open" item (e.g. inside the detail panel). */
  inDetail?: boolean;
  onDeleted?: () => void;
}

export function TaskMenu({ task, className, inDetail, onDeleted }: Props) {
  const data = useAppData();
  const ui = useUI();
  const otherBoards = boardsSorted(data).filter((b) => b.id !== task.boardId);
  const columns = columnsOf(data, task.boardId).filter((c) => c.id !== task.columnId);

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
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        {!inDetail && (
          <DropdownMenuItem onSelect={() => ui.openTask(task.id)}>
            <Pencil /> Open details
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={() => actions.toggleCompleted(task.id)}>
          {task.completed ? <RotateCcw /> : <Check />}
          {task.completed ? "Mark incomplete" : "Mark complete"}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => actions.duplicateTask(task.id)}>
          <Copy /> Duplicate
        </DropdownMenuItem>
        {columns.length > 0 && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <FolderInput /> Move to list
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {columns.map((c) => (
                <DropdownMenuItem key={c.id} onSelect={() => actions.moveTask(task.id, c.id, null)}>
                  <span className="truncate">{c.name}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger disabled={otherBoards.length === 0}>
            <FolderInput /> Move to board
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuLabel>Boards</DropdownMenuLabel>
            {otherBoards.map((b) => (
              <DropdownMenuItem key={b.id} onSelect={() => actions.moveTaskToBoard(task.id, b.id)}>
                <span className="truncate">{b.name}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
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
