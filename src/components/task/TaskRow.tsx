import * as React from "react";
import type { Task } from "@/models/types";
import { actions } from "@/store/actions";
import { useAppData } from "@/store/store";
import { useUI } from "@/store/ui";
import { TaskCheckbox } from "@/components/ui/misc";
import { cn } from "@/lib/utils";
import { DueChip, PriorityFlag, SubtaskProgress, TagChip } from "./TaskBits";
import { TaskMenu } from "./TaskMenu";

/** Compact single-row task used by the list, today, upcoming and completed views. */
export const TaskRow = React.memo(function TaskRow({
  task,
  showLocation = true,
}: {
  task: Task;
  showLocation?: boolean;
}) {
  const data = useAppData();
  const ui = useUI();
  const tags = task.tagIds.map((id) => data.tags[id]).filter(Boolean);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => ui.openTask(task.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && e.target === e.currentTarget) ui.openTask(task.id);
      }}
      className="group flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-hover focus-visible:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <TaskCheckbox
        className="mt-0.5"
        checked={task.completed}
        onCheckedChange={(c) => actions.setCompleted(task.id, c === true)}
        aria-label={task.completed ? `Mark "${task.title}" incomplete` : `Mark "${task.title}" complete`}
      />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "break-words text-sm text-foreground [overflow-wrap:anywhere]",
            task.completed && "text-muted-foreground line-through"
          )}
        >
          {task.title}
        </p>
        {task.description && (
          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{task.description}</p>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 empty:hidden">
          <DueChip task={task} />
          <PriorityFlag priority={task.priority} />
          <SubtaskProgress task={task} />
          {tags.map((t) => (
            <TagChip key={t.id} tag={t} />
          ))}
          {showLocation && (
            <span className="truncate text-xs text-subtle-foreground">
              {data.boards[task.boardId]?.name} · {data.columns[task.columnId]?.name}
            </span>
          )}
        </div>
      </div>
      <TaskMenu
        task={task}
        className="opacity-0 focus-visible:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100 max-md:opacity-100"
      />
    </div>
  );
});
