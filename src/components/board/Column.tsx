import * as React from "react";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowLeft,
  ArrowRight,
  CircleCheckBig,
  EllipsisVertical,
  GripVertical,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import type { Column, Tag, Task } from "@/models/types";
import { actions } from "@/store/actions";
import { useUI } from "@/store/ui";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn, pluralize } from "@/lib/utils";
import { SortableTaskCard } from "./TaskCard";

interface Props {
  column: Column;
  tasks: Task[];
  /** Total (unfiltered) task count, shown when a filter hides some tasks. */
  totalCount: number;
  tagsById: Record<string, Tag>;
  index: number;
  columnCount: number;
  onMove: (dir: -1 | 1) => void;
  filtered: boolean;
}

export const BoardColumn = React.memo(function BoardColumn({
  column,
  tasks,
  totalCount,
  tagsById,
  index,
  columnCount,
  onMove,
  filtered,
}: Props) {
  const ui = useUI();
  const [renaming, setRenaming] = React.useState(false);
  const [adding, setAdding] = React.useState(false);
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: `col:${column.id}`,
    data: { type: "column" },
  });

  const confirmDelete = async () => {
    if (totalCount === 0) return actions.deleteColumn(column.id);
    const ok = await ui.confirm({
      title: `Delete "${column.name}"?`,
      description: `This list and its ${pluralize(totalCount, "task")} will be deleted. You can undo right after.`,
      actionLabel: "Delete",
      destructive: true,
    });
    if (ok) actions.deleteColumn(column.id);
  };

  return (
    <section
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        "flex max-h-full w-[85vw] shrink-0 snap-start flex-col rounded-2xl bg-surface-2 sm:w-[300px]",
        isDragging && "opacity-50 ring-2 ring-primary/40"
      )}
      aria-label={`List ${column.name}`}
    >
      <header className="group/header flex items-center gap-1 px-2 pb-1 pt-2">
        <button
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          className="flex size-7 cursor-grab items-center justify-center rounded-md text-subtle-foreground opacity-0 transition-opacity hover:bg-hover focus-visible:opacity-100 group-hover/header:opacity-100 active:cursor-grabbing max-md:opacity-100"
          aria-label={`Reorder list ${column.name}`}
        >
          <GripVertical className="size-4" />
        </button>
        {renaming ? (
          <input
            autoFocus
            defaultValue={column.name}
            aria-label="List name"
            className="h-8 min-w-0 flex-1 rounded-md bg-surface px-2 text-sm font-medium outline-none ring-2 ring-primary"
            onFocus={(e) => e.target.select()}
            onBlur={(e) => {
              actions.renameColumn(column.id, e.target.value);
              setRenaming(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") {
                e.currentTarget.value = column.name;
                e.currentTarget.blur();
              }
            }}
          />
        ) : (
          <button
            className="min-w-0 flex-1 truncate rounded-md px-1 py-1 text-left text-sm font-medium text-foreground hover:bg-hover"
            onClick={() => setRenaming(true)}
            title="Click to rename"
          >
            {column.name}
          </button>
        )}
        {column.isDoneColumn && (
          <CircleCheckBig className="size-4 shrink-0 text-success" aria-label="Completion list" />
        )}
        <span
          className="min-w-6 shrink-0 rounded-full bg-surface-3 px-2 py-0.5 text-center text-xs font-medium text-muted-foreground"
          title={filtered ? `${tasks.length} of ${totalCount} tasks shown` : `${totalCount} tasks`}
        >
          {filtered ? `${tasks.length}/${totalCount}` : totalCount}
        </span>
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={`List actions for ${column.name}`}>
              <EllipsisVertical />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onCloseAutoFocus={(e) => e.preventDefault()}>
            <DropdownMenuItem onSelect={() => setAdding(true)}>
              <Plus /> Add task
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setRenaming(true)}>
              <Pencil /> Rename list
            </DropdownMenuItem>
            <DropdownMenuCheckboxItem
              checked={column.isDoneColumn}
              onCheckedChange={(c) => actions.setDoneColumn(column.id, c === true)}
            >
              Completion list
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled={index === 0} onSelect={() => onMove(-1)}>
              <ArrowLeft /> Move left
            </DropdownMenuItem>
            <DropdownMenuItem disabled={index === columnCount - 1} onSelect={() => onMove(1)}>
              <ArrowRight /> Move right
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem destructive onSelect={confirmDelete}>
              <Trash2 /> Delete list
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <div className="min-h-2 flex-1 overflow-y-auto px-2 pb-1 scrollbar-thin">
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          <div className="flex min-h-10 flex-col gap-2 pb-1 pt-1">
            {tasks.map((t) => (
              <SortableTaskCard
                key={t.id}
                task={t}
                tags={t.tagIds.map((id) => tagsById[id]).filter(Boolean)}
              />
            ))}
            {tasks.length === 0 && !adding && (
              <div className="flex h-16 items-center justify-center rounded-xl border-2 border-dashed border-border text-xs text-subtle-foreground">
                {filtered && totalCount > 0 ? "No matching tasks" : "Drop tasks here"}
              </div>
            )}
          </div>
        </SortableContext>
      </div>

      <div className="px-2 pb-2">
        {adding ? (
          <QuickAdd column={column} onDone={() => setAdding(false)} />
        ) : (
          <Button
            variant="ghost"
            className="h-9 w-full justify-start rounded-xl px-3 text-muted-foreground"
            onClick={() => setAdding(true)}
          >
            <Plus /> Add a task
          </Button>
        )}
      </div>
    </section>
  );
});

function QuickAdd({ column, onDone }: { column: Column; onDone: () => void }) {
  const [value, setValue] = React.useState("");
  const ref = React.useRef<HTMLTextAreaElement>(null);
  const submit = () => {
    if (!value.trim()) return;
    actions.addTask({ boardId: column.boardId, columnId: column.id, title: value });
    setValue("");
    // Keep the new card visible.
    requestAnimationFrame(() => ref.current?.scrollIntoView({ block: "nearest" }));
  };
  return (
    <div className="rounded-xl border border-primary bg-card p-2 shadow-g1">
      <textarea
        ref={ref}
        autoFocus
        rows={2}
        value={value}
        placeholder="Enter a title for this task…"
        aria-label={`New task in ${column.name}`}
        onChange={(e) => setValue(e.target.value.replace(/\n/g, ""))}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          }
          if (e.key === "Escape") onDone();
        }}
        onBlur={() => {
          if (value.trim()) submit();
          onDone();
        }}
        className="w-full resize-none bg-transparent text-sm outline-none placeholder:text-subtle-foreground"
      />
      <div className="flex items-center justify-end gap-1">
        <Button size="sm" variant="text" onMouseDown={(e) => e.preventDefault()} onClick={onDone}>
          Cancel
        </Button>
        <Button size="sm" onMouseDown={(e) => e.preventDefault()} onClick={submit} disabled={!value.trim()}>
          Add
        </Button>
      </div>
    </div>
  );
}

export function AddColumn({ boardId }: { boardId: string }) {
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState("");
  const submit = () => {
    if (value.trim()) actions.addColumn(boardId, value);
    setValue("");
  };
  if (!open) {
    return (
      <Button
        variant="ghost"
        className="h-11 w-[85vw] shrink-0 justify-start rounded-2xl border-2 border-dashed border-border px-4 text-muted-foreground sm:w-[300px]"
        onClick={() => setOpen(true)}
      >
        <Plus /> Add list
      </Button>
    );
  }
  return (
    <div className="w-[85vw] shrink-0 rounded-2xl bg-surface-2 p-2 sm:w-[300px]">
      <input
        autoFocus
        value={value}
        placeholder="List name"
        aria-label="New list name"
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") setOpen(false);
        }}
        onBlur={() => {
          submit();
          setOpen(false);
        }}
        className="h-9 w-full rounded-lg border border-primary bg-card px-3 text-sm outline-none"
      />
      <p className="px-1 pt-1.5 text-xs text-muted-foreground">Enter to add · Esc to cancel</p>
    </div>
  );
}
