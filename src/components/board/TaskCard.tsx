import * as React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { NotebookPen } from "lucide-react";
import type { Tag, Task } from "@/models/types";
import { actions } from "@/store/actions";
import { useUI } from "@/store/ui";
import { TaskCheckbox } from "@/components/ui/misc";
import { DueChip, PriorityFlag, StartChip, SubtaskProgress, TagChip } from "@/components/task/TaskBits";
import { TaskMenu } from "@/components/task/TaskMenu";
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

  const commit = () => {
    setEditing(false);
    if (draft.trim() && draft !== task.title) actions.updateTask(task.id, { title: draft });
    else setDraft(task.title);
  };

  return (
    <div
      className={cn(
        "group relative px-4 py-3 transition-colors duration-150 hover:bg-hover",
        overlay && "cursor-grabbing rounded-xl bg-card shadow-g3",
        dragging && "opacity-40"
      )}
    >
      <div className="flex items-start gap-4">
        <TaskCheckbox
          className="mt-0.5 border-[#5f6368] dark:border-muted-foreground"
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
              className="w-full rounded bg-surface-2 px-1 text-base outline-none ring-1 ring-primary"
            />
          ) : (
            <p
              className={cn(
                "break-words text-base leading-6 text-foreground [overflow-wrap:anywhere] line-clamp-4",
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
            <p className="mt-0.5 line-clamp-2 break-words text-sm leading-5 text-muted-foreground [overflow-wrap:anywhere]">
              {task.description}
            </p>
          )}
          {(task.dueDate || task.startDate || task.subtasks.length > 0 || task.priority !== "none" || task.notes) && (
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
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
            className="-mr-2 -mt-1 opacity-0 focus-visible:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100 max-md:opacity-100"
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
      className="cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring touch-manipulation"
    >
      <TaskCardBody task={task} tags={tags} dragging={isDragging} />
    </div>
  );
}
