import * as React from "react";
import { parseISO } from "date-fns";
import { Archive, CalendarCheck, CalendarRange, CircleCheckBig, Plus, Trash2 } from "lucide-react";
import type { SmartView, Task } from "@/models/types";
import { actions } from "@/store/actions";
import { useAppData } from "@/store/store";
import { useCurrentBoardId, useUI } from "@/store/ui";
import { addDaysKey, daysUntilDue, formatDayHeading, toDateKey, todayKey } from "@/lib/dates";
import { filterTasks, sortTasks } from "@/lib/taskQuery";
import { pluralize } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { TaskRow } from "@/components/task/TaskRow";
import { EmptyState } from "@/components/layout/EmptyState";

interface Section {
  key: string;
  label: string;
  tone?: "overdue";
  tasks: Task[];
}

function Sections({ sections }: { sections: Section[] }) {
  return (
    <>
      {sections.map((s) => (
        <section key={s.key} className="mb-6">
          <h3
            className={
              "sticky top-0 z-10 flex items-center gap-2 bg-surface px-3 py-2 text-sm font-medium " +
              (s.tone === "overdue" ? "text-overdue" : "text-foreground")
            }
          >
            {s.label}
            <span className="text-xs font-normal text-muted-foreground">{s.tasks.length}</span>
          </h3>
          <div className="divide-y divide-border/60">
            {s.tasks.map((t) => (
              <TaskRow key={t.id} task={t} />
            ))}
          </div>
        </section>
      ))}
    </>
  );
}

export function SmartViewPage({ view }: { view: SmartView }) {
  const data = useAppData();
  const ui = useUI();
  const boardId = useCurrentBoardId();

  const sections = React.useMemo<Section[]>(() => {
    const now = new Date();
    const today = todayKey();
    const visible = (t: Task) => (view === "archived" ? t.archived : !t.archived);
    const all = filterTasks(Object.values(data.tasks).filter(visible), data, ui.search, ui.filters);

    if (view === "today") {
      const open = all.filter((t) => !t.completed && t.dueDate);
      const overdue = sortTasks(open.filter((t) => daysUntilDue(t, now)! < 0), "dueDate", data);
      const dueToday = sortTasks(open.filter((t) => t.dueDate === today), "dueDate", data);
      return [
        { key: "overdue", label: "Overdue", tone: "overdue" as const, tasks: overdue },
        { key: "today", label: formatDayHeading(today, now), tasks: dueToday },
      ].filter((s) => s.tasks.length);
    }

    if (view === "upcoming") {
      const out: Section[] = [];
      for (let i = 1; i <= 7; i++) {
        const key = addDaysKey(today, i);
        const tasks = sortTasks(
          all.filter((t) => !t.completed && t.dueDate === key),
          "dueDate",
          data
        );
        if (tasks.length) out.push({ key, label: formatDayHeading(key, now), tasks });
      }
      return out;
    }

    if (view === "completed") {
      const done = all
        .filter((t) => t.completed)
        .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""));
      const groups = new Map<string, Task[]>();
      for (const t of done) {
        const key = t.completedAt ? toDateKey(parseISO(t.completedAt)) : "unknown";
        groups.set(key, [...(groups.get(key) ?? []), t]);
      }
      return [...groups.entries()].map(([key, tasks]) => ({
        key,
        label: key === "unknown" ? "Earlier" : formatDayHeading(key, now),
        tasks,
      }));
    }

    // archived
    const archived = all.sort((a, b) => (b.archivedAt ?? "").localeCompare(a.archivedAt ?? ""));
    return archived.length ? [{ key: "archived", label: "Archived tasks", tasks: archived }] : [];
  }, [data, view, ui.search, ui.filters]);

  const count = sections.reduce((n, s) => n + s.tasks.length, 0);
  const meta = {
    today: {
      icon: CalendarCheck,
      empty: "Nothing due today",
      desc: "Tasks due today and anything overdue will show up here. Enjoy the calm!",
    },
    upcoming: {
      icon: CalendarRange,
      empty: "Nothing coming up",
      desc: "Tasks due in the next 7 days will appear here, grouped by day.",
    },
    completed: {
      icon: CircleCheckBig,
      empty: "No completed tasks yet",
      desc: "Check off a task and it will be listed here, newest first.",
    },
    archived: {
      icon: Archive,
      empty: "Archive is empty",
      desc: "Archived tasks are hidden from boards but kept here until you restore or delete them.",
    },
  }[view];

  const archivedIds = view === "archived" ? sections.flatMap((s) => s.tasks.map((t) => t.id)) : [];
  const overdueCount = view === "today" ? sections.find((s) => s.key === "overdue")?.tasks.length ?? 0 : 0;

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="mx-auto max-w-3xl px-4 pb-16 sm:px-6">
        {count === 0 ? (
          <EmptyState icon={meta.icon} title={meta.empty} description={meta.desc}>
            {(view === "today" || view === "upcoming") && boardId && (
              <Button
                onClick={() =>
                  ui.openNewTask({ boardId, dueDate: view === "today" ? todayKey() : addDaysKey(todayKey(), 1) })
                }
              >
                <Plus /> New task
              </Button>
            )}
          </EmptyState>
        ) : (
          <>
            <div className="flex items-center gap-3 py-3 text-sm text-muted-foreground">
              <span>{pluralize(count, "task")}</span>
              {overdueCount > 0 && <span className="text-overdue">{overdueCount} overdue</span>}
              {view === "archived" && (
                <Button
                  variant="text"
                  size="sm"
                  className="ml-auto text-destructive"
                  onClick={async () => {
                    const ok = await ui.confirm({
                      title: "Delete all archived tasks?",
                      description: `${pluralize(archivedIds.length, "task")} will be deleted. You can undo right after.`,
                      actionLabel: "Delete all",
                      destructive: true,
                    });
                    if (ok) actions.deleteTasks(archivedIds);
                  }}
                >
                  <Trash2 /> Delete all
                </Button>
              )}
            </div>
            <Sections sections={sections} />
          </>
        )}
      </div>
    </div>
  );
}
