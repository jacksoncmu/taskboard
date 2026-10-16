import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  AlignLeft,
  Calendar,
  CircleDot,
  Clock,
  Flag,
  Hourglass,
  ListChecks,
  NotebookPen,
  Plus,
  Tag as TagIcon,
  Trash2,
  X,
} from "lucide-react";
import { PRIORITIES } from "@/models/constants";
import type { Task } from "@/models/types";
import { actions } from "@/store/actions";
import { useAppData } from "@/store/store";
import { useUI } from "@/store/ui";
import { boardsSorted, columnsOf } from "@/store/operations";
import { Dialog, SheetContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { Checkbox, TaskCheckbox, Tooltip } from "@/components/ui/misc";
import { formatTimestamp, isOverdue } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { CommitTextarea } from "./CommitField";
import { TagChip } from "./TaskBits";
import { TagPicker } from "./TagPicker";
import { TaskMenu } from "./TaskMenu";

function Row({ icon: Icon, label, children }: { icon: React.ElementType; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4 py-2">
      <Tooltip content={label} side="left">
        <Icon className="mt-2 size-5 shrink-0 text-muted-foreground" aria-hidden />
      </Tooltip>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function TaskDetailPanel() {
  const ui = useUI();
  const data = useAppData();
  const task = ui.openTaskId ? data.tasks[ui.openTaskId] : null;
  return (
    <Dialog open={!!task} onOpenChange={(o) => !o && ui.openTask(null)}>
      {task && (
        <SheetContent aria-describedby={undefined}>
          <TaskDetailBody key={task.id} task={task} onClose={() => ui.openTask(null)} />
        </SheetContent>
      )}
    </Dialog>
  );
}

function TaskDetailBody({ task, onClose }: { task: Task; onClose: () => void }) {
  const data = useAppData();
  const boards = boardsSorted(data);
  const columns = columnsOf(data, task.boardId);
  const tags = task.tagIds.map((id) => data.tags[id]).filter(Boolean);
  const [newSub, setNewSub] = React.useState("");
  const overdue = isOverdue(task);
  const update = (patch: Partial<Task>) => actions.updateTask(task.id, patch);
  const subDone = task.subtasks.filter((s) => s.completed).length;

  return (
    <>
      {/* header */}
      <div className="flex items-center gap-1 px-4 pt-3">
        <span className="ml-2 truncate text-sm text-muted-foreground">
          {data.boards[task.boardId]?.name} · {data.columns[task.columnId]?.name}
          {task.archived && " · Archived"}
        </span>
        <div className="ml-auto flex items-center">
          <TaskMenu task={task} inDetail onDeleted={onClose} />
          <DialogPrimitive.Close asChild>
            <Button variant="ghost" size="icon" aria-label="Close details">
              <X />
            </Button>
          </DialogPrimitive.Close>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6 scrollbar-thin">
        <div className="flex items-start gap-3 pb-2 pt-2">
          <TaskCheckbox
            className="mt-2 size-6"
            checked={task.completed}
            onCheckedChange={(c) => actions.setCompleted(task.id, c === true)}
            aria-label={task.completed ? "Mark incomplete" : "Mark complete"}
          />
          <DialogPrimitive.Title asChild>
            <div className="min-w-0 flex-1">
              <CommitTextarea
                value={task.title}
                onCommit={(title) => update({ title })}
                multiline={false}
                allowEmpty={false}
                ariaLabel="Task title"
                placeholder="Title"
                onEnter={onClose}
                className={cn(
                  "rounded-lg px-1 py-1 text-[22px] leading-snug focus:bg-surface-2",
                  task.completed && "text-muted-foreground line-through"
                )}
              />
            </div>
          </DialogPrimitive.Title>
        </div>

        <Row icon={AlignLeft} label="Description">
          <CommitTextarea
            value={task.description}
            onCommit={(description) => update({ description })}
            placeholder="Add details"
            ariaLabel="Description"
            className="min-h-10 rounded-lg px-2 py-2 text-sm leading-relaxed hover:bg-surface-2 focus:bg-surface-2"
          />
        </Row>

        <Row icon={CircleDot} label="Status">
          <div className="flex flex-wrap gap-2">
            <NativeSelect
              aria-label="Board"
              value={task.boardId}
              onChange={(e) => actions.moveTaskToBoard(task.id, e.target.value)}
              className="max-w-[12rem]"
            >
              {boards.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </NativeSelect>
            <NativeSelect
              aria-label="List"
              value={task.columnId}
              onChange={(e) => actions.moveTask(task.id, e.target.value, null)}
              className="max-w-[12rem]"
            >
              {columns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </NativeSelect>
          </div>
        </Row>

        <Row icon={Flag} label="Priority">
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Priority">
            {[...PRIORITIES].reverse().map((p) => {
              const active = task.priority === p.value;
              return (
                <button
                  key={p.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => update({ priority: p.value })}
                  className={cn(
                    "inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-[13px] transition-colors",
                    active ? "border-transparent font-medium" : "border-border-strong text-muted-foreground hover:bg-hover"
                  )}
                  style={
                    active
                      ? { background: `color-mix(in srgb, ${p.color} 18%, transparent)`, color: "var(--foreground)" }
                      : undefined
                  }
                >
                  <Flag className="size-3.5" style={{ color: p.color }} fill={p.value === "none" ? "none" : p.color} />
                  {p.label}
                </button>
              );
            })}
          </div>
        </Row>

        <Row icon={Calendar} label="Due date">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="date"
              aria-label="Due date"
              value={task.dueDate ?? ""}
              onChange={(e) => update({ dueDate: e.target.value || null, dueTime: e.target.value ? task.dueTime : null })}
              className={cn("h-9 w-auto", overdue && "border-overdue text-overdue")}
            />
            <div className="flex items-center gap-1">
              <Clock className="size-4 text-muted-foreground" />
              <Input
                type="time"
                aria-label="Due time"
                disabled={!task.dueDate}
                value={task.dueTime ?? ""}
                onChange={(e) => update({ dueTime: e.target.value || null })}
                className="h-9 w-auto"
              />
            </div>
            {task.dueDate && (
              <Button variant="text" size="sm" onClick={() => update({ dueDate: null, dueTime: null })}>
                Clear
              </Button>
            )}
            {overdue && <span className="text-xs font-medium text-overdue">Overdue</span>}
          </div>
        </Row>

        <Row icon={Hourglass} label="Start date">
          <div className="flex items-center gap-2">
            <Input
              type="date"
              aria-label="Start date"
              value={task.startDate ?? ""}
              onChange={(e) => update({ startDate: e.target.value || null })}
              className="h-9 w-auto"
            />
            {task.startDate && (
              <Button variant="text" size="sm" onClick={() => update({ startDate: null })}>
                Clear
              </Button>
            )}
          </div>
        </Row>

        <Row icon={TagIcon} label="Labels">
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {tags.map((t) => (
              <TagChip
                key={t.id}
                tag={t}
                className="py-1"
                onRemove={() => update({ tagIds: task.tagIds.filter((x) => x !== t.id) })}
              />
            ))}
            <TagPicker selected={task.tagIds} onChange={(tagIds) => update({ tagIds })} />
          </div>
        </Row>

        <Row icon={ListChecks} label="Subtasks">
          <div className="pt-1.5">
            {task.subtasks.length > 0 && (
              <div className="mb-2 flex items-center gap-3">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3">
                  <div
                    className="h-full rounded-full bg-primary transition-[width] duration-300"
                    style={{ width: `${(subDone / task.subtasks.length) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">
                  {subDone}/{task.subtasks.length}
                </span>
              </div>
            )}
            <ul className="space-y-0.5">
              {task.subtasks.map((s) => (
                <li key={s.id} className="group flex items-center gap-2 rounded-lg px-1 hover:bg-surface-2">
                  <Checkbox
                    checked={s.completed}
                    onCheckedChange={(c) => actions.updateSubtask(task.id, s.id, { completed: c === true })}
                    aria-label={`Complete subtask ${s.title}`}
                  />
                  <CommitTextarea
                    value={s.title}
                    multiline={false}
                    allowEmpty={false}
                    ariaLabel="Subtask title"
                    onCommit={(title) => actions.updateSubtask(task.id, s.id, { title })}
                    className={cn("py-1.5 text-sm", s.completed && "text-muted-foreground line-through")}
                  />
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="opacity-0 focus-visible:opacity-100 group-hover:opacity-100"
                    onClick={() => actions.deleteSubtask(task.id, s.id)}
                    aria-label={`Delete subtask ${s.title}`}
                  >
                    <X />
                  </Button>
                </li>
              ))}
            </ul>
            <form
              className="mt-1 flex items-center gap-2 px-1"
              onSubmit={(e) => {
                e.preventDefault();
                if (!newSub.trim()) return;
                actions.addSubtask(task.id, newSub);
                setNewSub("");
              }}
            >
              <Plus className="size-[18px] text-primary" />
              <input
                value={newSub}
                onChange={(e) => setNewSub(e.target.value)}
                placeholder="Add subtask"
                aria-label="New subtask"
                className="h-9 flex-1 bg-transparent text-sm outline-none placeholder:text-primary focus:placeholder:text-subtle-foreground"
              />
            </form>
          </div>
        </Row>

        <Row icon={NotebookPen} label="Notes">
          <CommitTextarea
            value={task.notes}
            onCommit={(notes) => update({ notes })}
            placeholder="Add notes"
            ariaLabel="Notes"
            className="min-h-10 rounded-lg px-2 py-2 text-sm leading-relaxed hover:bg-surface-2 focus:bg-surface-2"
          />
        </Row>

        <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 border-t pt-4 text-xs text-muted-foreground">
          <dt>Created</dt>
          <dd>{formatTimestamp(task.createdAt)}</dd>
          <dt>Updated</dt>
          <dd>{formatTimestamp(task.updatedAt)}</dd>
          {task.completedAt && (
            <>
              <dt>Completed</dt>
              <dd>{formatTimestamp(task.completedAt)}</dd>
            </>
          )}
          {task.archivedAt && (
            <>
              <dt>Archived</dt>
              <dd>{formatTimestamp(task.archivedAt)}</dd>
            </>
          )}
        </dl>
      </div>

      <div className="flex items-center justify-between border-t px-4 py-3">
        <Button
          variant="ghost"
          className="text-destructive"
          onClick={() => {
            actions.deleteTasks([task.id]);
            onClose();
          }}
        >
          <Trash2 /> Delete
        </Button>
        <Button
          variant={task.completed ? "outline" : "filled"}
          onClick={() => actions.setCompleted(task.id, !task.completed)}
        >
          {task.completed ? "Mark incomplete" : "Mark complete"}
        </Button>
      </div>
    </>
  );
}
