import * as React from "react";
import { ChevronDown, ListTodo, Plus } from "lucide-react";
import type { ID, ListGroupBy, ListSortBy, Task } from "@/models/types";
import { actions } from "@/store/actions";
import { useAppData } from "@/store/store";
import { useUI } from "@/store/ui";
import { activeFilterCount, filterTasks, groupTasks, sortTasks } from "@/lib/taskQuery";
import { NativeSelect } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TaskRow } from "@/components/task/TaskRow";
import { EmptyState } from "@/components/layout/EmptyState";
import { ScopeToggle } from "./ScopeToggle";
import { cn, pluralize } from "@/lib/utils";

const GROUP_LABELS: Record<ListGroupBy, string> = {
  none: "No grouping",
  board: "Board",
  status: "Status",
  dueDate: "Due date",
  priority: "Priority",
};

const SORT_LABELS: Record<ListSortBy, string> = {
  manual: "Manual order",
  dueDate: "Due date",
  priority: "Priority",
  createdAt: "Date created",
  title: "Title",
};

export function ListView({ boardId }: { boardId: ID | null }) {
  const data = useAppData();
  const ui = useUI();
  const { listGroupBy, listSortBy } = data.settings;
  const scopeAll = ui.scope === "all" || !boardId;
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});

  const groups = React.useMemo(() => {
    const base = Object.values(data.tasks).filter((t) => !t.archived && (scopeAll || t.boardId === boardId));
    const tasks = sortTasks(filterTasks(base, data, ui.search, ui.filters), listSortBy, data);
    return groupTasks(tasks, listGroupBy, data);
  }, [data, scopeAll, boardId, ui.search, ui.filters, listSortBy, listGroupBy]);

  const count = groups.reduce((n, g) => n + g.tasks.length, 0);

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="mx-auto max-w-4xl px-4 pb-16 sm:px-6">
        <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 bg-surface py-3">
          {boardId && <ScopeToggle />}
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            Group by
            <NativeSelect
              value={listGroupBy}
              onChange={(e) => actions.updateSettings({ listGroupBy: e.target.value as ListGroupBy })}
            >
              {(Object.keys(GROUP_LABELS) as ListGroupBy[]).map((g) => (
                <option key={g} value={g}>
                  {GROUP_LABELS[g]}
                </option>
              ))}
            </NativeSelect>
          </label>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            Sort by
            <NativeSelect
              value={listSortBy}
              onChange={(e) => actions.updateSettings({ listSortBy: e.target.value as ListSortBy })}
            >
              {(Object.keys(SORT_LABELS) as ListSortBy[]).map((s) => (
                <option key={s} value={s}>
                  {SORT_LABELS[s]}
                </option>
              ))}
            </NativeSelect>
          </label>
          <span className="ml-auto text-sm text-muted-foreground">{pluralize(count, "task")}</span>
        </div>

        {count === 0 ? (
          <EmptyState
            icon={ListTodo}
            title={ui.search || activeFilterCount(ui.filters) ? "No matching tasks" : "No tasks yet"}
            description="Try a different search or filter, or add a new task."
          >
            <Button onClick={() => ui.openNewTask({ boardId: boardId ?? undefined })}>
              <Plus /> New task
            </Button>
          </EmptyState>
        ) : (
          groups.map((g) => (
            <section key={g.key} className="mb-4">
              {listGroupBy !== "none" && (
                <button
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-hover"
                  onClick={() => setCollapsed((c) => ({ ...c, [g.key]: !c[g.key] }))}
                  aria-expanded={!collapsed[g.key]}
                >
                  <ChevronDown
                    className={cn("size-4 text-muted-foreground transition-transform", collapsed[g.key] && "-rotate-90")}
                  />
                  {g.color && <span className="size-2.5 rounded-full" style={{ background: g.color }} />}
                  <h3 className={cn("text-sm font-medium", g.key === "overdue" && "text-overdue")}>{g.label}</h3>
                  <span className="text-xs text-muted-foreground">{g.tasks.length}</span>
                </button>
              )}
              {!collapsed[g.key] && (
                <div className="divide-y divide-border/60">
                  {g.tasks.map((t: Task) => (
                    <TaskRow key={t.id} task={t} showLocation={scopeAll || listGroupBy !== "status"} />
                  ))}
                </div>
              )}
            </section>
          ))
        )}
      </div>
    </div>
  );
}
