import * as React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { NotebookPen } from "lucide-react";
import type { Tag, Task } from "@/models/types";
import { PRIORITY_BY_VALUE } from "@/models/constants";
import { actions } from "@/store/actions";
import { useUI } from "@/store/ui";
import { TaskCheckbox } from "@/components/ui/misc";
import { DueChip, PriorityFlag, StartChip, SubtaskProgress, TagChip } from "@/components/task/TaskBits";
import { TaskMenu } from "@/components/task/TaskMenu";
import { isOverdue } from "@/lib/dates";
import { cn } from "@/lib/utils";

interface CardProps {
  task: Task;
  tags: Tag[];
  overlay?: boolean;
  dragging?: boolean;
}

export const TaskCardBody = React.memo(function TaskCardBody({ task, tags, overlay, dragging }: CardProps) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(task.title);
  const overdue = isOverdue(task);
  const priority = PRIORITY_BY_VALUE[task.priority];

  const commit = () => {
    setEditing(false);
    if (draft.trim() && draft !== task.title) actions.updateTask(task.id, { title: draft });
    else setDraft(task.title);
  };

  return (
    <div
      className={cn(
        "group relative rounded-xl border bg-card p-3 pl-3 transition-[box-shadow,border-color] duration-150",
        "hover:shadow-g1 focus-within:shadow-g1",
        overdue ? "border-overdue/40" : "border-border",
        overlay && "rotate-[1.5deg] cursor-grabbing shadow-g3",
        dragging && "opacity-40"
      )}
    >
      {task.priority !== "none" && (
        <span
          className="absolute inset-y-3 left-0 w-[3px] rounded-r-full"
          style={{ background: priority.color }}
          aria-hidden
        />
      )}
      <div className="flex items-start gap-2.5">
        <TaskCheckbox
          className="mt-0.5"
          checked={task.completed}
          onCheckedChange={(c) => actions.setCompleted(task.id, c === true)}
          aria-label={task.completed ? `Mark "${task.title}" incomplete` : `Mark "${task.title}" complete`}
        />
        <div className="min-w-0 flex-1">
          {editing ? (
            <input
              autoFocus
              value={draft}
              aria-label="Task title"
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Enter") commit();
                if (e.key === "Escape") {
                  setDraft(task.title);
                  setEditing(false);
                }
              }}
              className="w-full rounded bg-surface-2 px-1 text-sm outline-none ring-1 ring-primary"
            />
          ) : (
            <p
              className={cn(
                "break-words text-sm leading-5 text-foreground [overflow-wrap:anywhere] line-clamp-4",
                task.completed && "text-muted-foreground line-through"
              )}
              onDoubleClick={(e) => {
                e.stopPropagation();
                setDraft(task.title);
                setEditing(true);
              }}
              title="Double-click to rename"
            >
              {task.title}
            </p>
          )}
          {task.description && (
            <p className="mt-1 line-clamp-2 break-words text-xs leading-4 text-muted-foreground [overflow-wrap:anywhere]">
              {task.description}
            </p>
          )}
          {(task.dueDate || task.startDate || task.subtasks.length > 0 || task.priority !== "none" || task.notes) && (
            <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
              <DueChip task={task} />
              <StartChip task={task} />
              <PriorityFlag priority={task.priority} />
              <SubtaskProgress task={task} />
              {task.notes && (
                <NotebookPen className="size-3.5 text-muted-foreground" aria-label="Has notes" />
              )}
            </div>
          )}
          {tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {tags.map((t) => (
                <TagChip key={t.id} tag={t} />
              ))}
            </div>
          )}
        </div>
        {!overlay && (
          <TaskMenu
            task={task}
            className="-mr-1.5 -mt-1 opacity-0 focus-visible:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100 max-md:opacity-100"
          />
        )}
      </div>
    </div>
  );
});

export function SortableTaskCard({ task, tags }: { task: Task; tags: Tag[] }) {
  const ui = useUI();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: "task", columnId: task.columnId },
  });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      {...attributes}
      {...listeners}
      aria-roledescription="Draggable task"
      aria-label={task.title}
      onClick={() => ui.openTask(task.id)}
      onKeyDown={(e) => {
        listeners?.onKeyDown?.(e);
        if (e.key === "Enter" && !e.defaultPrevented && e.target === e.currentTarget) ui.openTask(task.id);
      }}
      className="cursor-pointer rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring touch-manipulation"
    >
      <TaskCardBody task={task} tags={tags} dragging={isDragging} />
    </div>
  );
}
