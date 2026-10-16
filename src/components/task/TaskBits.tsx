import { Calendar, CheckSquare, Flag, Hourglass } from "lucide-react";
import type { Priority, Tag, Task } from "@/models/types";
import { PRIORITY_BY_VALUE } from "@/models/constants";
import { formatDueLabel, isOverdue, daysUntilDue } from "@/lib/dates";
import { cn } from "@/lib/utils";

export function PriorityFlag({ priority, className }: { priority: Priority; className?: string }) {
  if (priority === "none") return null;
  const p = PRIORITY_BY_VALUE[priority];
  return (
    <span
      className={cn("inline-flex items-center gap-1 text-xs font-medium", className)}
      style={{ color: p.color }}
      title={`${p.label} priority`}
    >
      <Flag className="size-3.5" fill="currentColor" />
      {p.label}
    </span>
  );
}

export function PriorityDot({ priority }: { priority: Priority }) {
  const p = PRIORITY_BY_VALUE[priority];
  return <span className="inline-block size-2.5 rounded-full" style={{ background: p.color }} aria-hidden />;
}

export function TagChip({ tag, onRemove, className }: { tag: Tag; onRemove?: () => void; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium text-foreground",
        className
      )}
      style={{ background: `color-mix(in srgb, ${tag.color} 18%, transparent)` }}
    >
      <span className="size-2 shrink-0 rounded-full" style={{ background: tag.color }} />
      <span className="truncate">{tag.name}</span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="-mr-1 rounded px-1 text-muted-foreground hover:bg-hover hover:text-foreground"
          aria-label={`Remove label ${tag.name}`}
        >
          ×
        </button>
      )}
    </span>
  );
}

export function DueChip({ task, className }: { task: Task; className?: string }) {
  if (!task.dueDate) return null;
  const overdue = isOverdue(task);
  const days = daysUntilDue(task);
  const soon = !task.completed && !overdue && days === 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs",
        overdue
          ? "border-transparent bg-destructive-container font-medium text-overdue"
          : soon
            ? "border-transparent bg-primary-container text-on-primary-container"
            : "border-border text-muted-foreground",
        task.completed && "opacity-70",
        className
      )}
      title={overdue ? "Overdue" : "Due date"}
    >
      <Calendar className="size-3" />
      {formatDueLabel(task)}
    </span>
  );
}

export function SubtaskProgress({ task }: { task: Task }) {
  if (!task.subtasks.length) return null;
  const done = task.subtasks.filter((s) => s.completed).length;
  const all = done === task.subtasks.length;
  return (
    <span
      className={cn("inline-flex items-center gap-1 text-xs", all ? "text-success" : "text-muted-foreground")}
      title={`${done} of ${task.subtasks.length} subtasks completed`}
    >
      <CheckSquare className="size-3.5" />
      {done}/{task.subtasks.length}
    </span>
  );
}

export function StartChip({ task }: { task: Task }) {
  if (!task.startDate) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground" title="Start date">
      <Hourglass className="size-3.5" />
      Starts {formatDueLabel({ dueDate: task.startDate, dueTime: null })}
    </span>
  );
}
