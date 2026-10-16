import * as React from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import type { ID, Task } from "@/models/types";
import { PRIORITY_BY_VALUE } from "@/models/constants";
import { actions } from "@/store/actions";
import { useAppData } from "@/store/store";
import { useCurrentBoardId, useUI } from "@/store/ui";
import { columnsOf } from "@/store/operations";
import { filterTasks, sortTasks } from "@/lib/taskQuery";
import { formatTime, isOverdue, toDateKey, todayKey, parseDateKey } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tooltip } from "@/components/ui/misc";
import { TaskRow } from "@/components/task/TaskRow";
import { ScopeToggle } from "./ScopeToggle";

const MAX_CHIPS = 3;

export function CalendarView({ boardId }: { boardId: ID | null }) {
  const data = useAppData();
  const ui = useUI();
  const [month, setMonth] = React.useState(() => startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = React.useState<string | null>(null);
  const scopeAll = ui.scope === "all" || !boardId;

  const days = React.useMemo(
    () => eachDayOfInterval({ start: startOfWeek(startOfMonth(month)), end: endOfWeek(endOfMonth(month)) }),
    [month]
  );

  const byDay = React.useMemo(() => {
    const base = Object.values(data.tasks).filter(
      (t) => !t.archived && t.dueDate && (scopeAll || t.boardId === boardId)
    );
    const map = new Map<string, Task[]>();
    for (const t of sortTasks(filterTasks(base, data, ui.search, ui.filters), "dueDate", data)) {
      const list = map.get(t.dueDate!) ?? [];
      list.push(t);
      map.set(t.dueDate!, list);
    }
    return map;
  }, [data, scopeAll, boardId, ui.search, ui.filters]);

  const today = todayKey();
  const weekdays = days.slice(0, 7).map((d) => format(d, "EEE"));

  return (
    <div className="flex h-full min-h-0 flex-col px-4 pb-4 sm:px-6">
      <div className="flex flex-wrap items-center gap-2 py-3">
        <Button variant="outline" size="sm" onClick={() => setMonth(startOfMonth(new Date()))}>
          Today
        </Button>
        <Tooltip content="Previous month">
          <Button variant="ghost" size="icon-sm" onClick={() => setMonth((m) => addMonths(m, -1))} aria-label="Previous month">
            <ChevronLeft />
          </Button>
        </Tooltip>
        <Tooltip content="Next month">
          <Button variant="ghost" size="icon-sm" onClick={() => setMonth((m) => addMonths(m, 1))} aria-label="Next month">
            <ChevronRight />
          </Button>
        </Tooltip>
        <h2 className="text-xl font-normal">{format(month, "MMMM yyyy")}</h2>
        <div className="ml-auto">{boardId && <ScopeToggle />}</div>
      </div>

      <div className="grid grid-cols-7 border-b text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {weekdays.map((d) => (
          <div key={d} className="py-1.5">
            {d}
          </div>
        ))}
      </div>
      <div
        className="grid min-h-0 flex-1 grid-cols-7 overflow-y-auto border-l scrollbar-thin"
        style={{ gridAutoRows: "minmax(96px, 1fr)" }}
      >
        {days.map((d) => {
          const key = toDateKey(d);
          const tasks = byDay.get(key) ?? [];
          const inMonth = isSameMonth(d, month);
          const isToday = key === today;
          return (
            <div
              key={key}
              role="button"
              tabIndex={0}
              aria-label={`${format(d, "EEEE, MMMM d")}: ${tasks.length} tasks`}
              onClick={() => setSelectedDay(key)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.target === e.currentTarget) setSelectedDay(key);
              }}
              className={cn(
                "group flex min-w-0 cursor-pointer flex-col gap-0.5 border-b border-r p-1 transition-colors hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                !inMonth && "bg-surface-2/60"
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full text-xs",
                    isToday ? "bg-primary font-medium text-primary-foreground" : inMonth ? "text-foreground" : "text-subtle-foreground"
                  )}
                >
                  {format(d, "d")}
                </span>
                <button
                  className="flex size-6 items-center justify-center rounded-full text-muted-foreground opacity-0 hover:bg-hover focus-visible:opacity-100 group-hover:opacity-100 max-md:hidden"
                  aria-label={`Add task on ${format(d, "MMMM d")}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    ui.openNewTask({ boardId: boardId ?? undefined, dueDate: key });
                  }}
                >
                  <Plus className="size-4" />
                </button>
              </div>
              {tasks.slice(0, MAX_CHIPS).map((t) => (
                <button
                  key={t.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    ui.openTask(t.id);
                  }}
                  className={cn(
                    "flex w-full min-w-0 items-center gap-1 truncate rounded-md px-1.5 py-0.5 text-left text-[11px] leading-4 transition-colors",
                    t.completed
                      ? "text-muted-foreground line-through hover:bg-surface-3"
                      : isOverdue(t)
                        ? "bg-destructive-container text-overdue hover:brightness-95"
                        : "bg-primary-container text-on-primary-container hover:brightness-95"
                  )}
                  title={t.title}
                >
                  {t.priority !== "none" && (
                    <span
                      className="size-1.5 shrink-0 rounded-full"
                      style={{ background: PRIORITY_BY_VALUE[t.priority].color }}
                    />
                  )}
                  {t.dueTime && <span className="shrink-0 opacity-80 max-sm:hidden">{formatTime(t.dueTime)}</span>}
                  <span className="truncate">{t.title}</span>
                </button>
              ))}
              {tasks.length > MAX_CHIPS && (
                <span className="px-1.5 text-[11px] font-medium text-muted-foreground">
                  +{tasks.length - MAX_CHIPS} more
                </span>
              )}
            </div>
          );
        })}
      </div>

      <DayDialog
        day={selectedDay}
        tasks={selectedDay ? (byDay.get(selectedDay) ?? []) : []}
        boardId={boardId}
        onClose={() => setSelectedDay(null)}
      />
    </div>
  );
}

function DayDialog({
  day,
  tasks,
  boardId,
  onClose,
}: {
  day: string | null;
  tasks: Task[];
  boardId: ID | null;
  onClose: () => void;
}) {
  const data = useAppData();
  const currentBoardId = useCurrentBoardId();
  const [title, setTitle] = React.useState("");
  const targetBoard = boardId ?? currentBoardId;

  const add = () => {
    if (!day || !title.trim() || !targetBoard) return;
    const cols = columnsOf(data, targetBoard);
    const col = cols.find((c) => !c.isDoneColumn) ?? cols[0];
    if (!col) return;
    actions.addTask({ boardId: targetBoard, columnId: col.id, title, dueDate: day });
    setTitle("");
  };

  return (
    <Dialog open={!!day} onOpenChange={(o) => !o && onClose()}>
      {day && (
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{format(parseDateKey(day), "EEEE, MMMM d")}</DialogTitle>
            <DialogDescription>
              {tasks.length ? `${tasks.length} task${tasks.length === 1 ? "" : "s"} due` : "Nothing due on this day."}
            </DialogDescription>
          </DialogHeader>
          {tasks.length > 0 && (
            <div className="-mx-3 max-h-80 overflow-y-auto scrollbar-thin">
              {tasks.map((t) => (
                <TaskRow key={t.id} task={t} />
              ))}
            </div>
          )}
          {targetBoard ? (
            <form
              className="flex items-center gap-2 rounded-xl border border-border-strong px-3 focus-within:border-primary"
              onSubmit={(e) => {
                e.preventDefault();
                add();
              }}
            >
              <Plus className="size-4 text-primary" />
              <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={`Add a task to ${data.boards[targetBoard]?.name ?? "board"}`}
                aria-label="New task title"
                className="h-10 flex-1 bg-transparent text-sm outline-none"
              />
              <Button type="submit" size="sm" disabled={!title.trim()}>
                Add
              </Button>
            </form>
          ) : (
            <p className="text-sm text-muted-foreground">Create a board to add tasks.</p>
          )}
        </DialogContent>
      )}
    </Dialog>
  );
}
