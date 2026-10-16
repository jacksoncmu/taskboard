/** Search, filtering, sorting and grouping of tasks — shared by every view. */
import { PRIORITY_BY_VALUE, PRIORITIES } from "@/models/constants";
import type { AppData, ID, ListGroupBy, ListSortBy, Priority, Task } from "@/models/types";
import { daysUntilDue, formatDayHeading, isOverdue } from "./dates";

export type DueFilter = "overdue" | "today" | "week" | "noDate" | "hasDate";
export type CompletionFilter = "all" | "incomplete" | "completed";

export interface TaskFilters {
  priorities: Priority[];
  /** Column names, lower-cased, so the filter works across boards. */
  statuses: string[];
  due: DueFilter[];
  tagIds: ID[];
  completion: CompletionFilter;
}

export const EMPTY_FILTERS: TaskFilters = { priorities: [], statuses: [], due: [], tagIds: [], completion: "all" };

export const DUE_FILTER_LABELS: Record<DueFilter, string> = {
  overdue: "Overdue",
  today: "Due today",
  week: "Due in the next 7 days",
  hasDate: "Has a due date",
  noDate: "No due date",
};

export function activeFilterCount(f: TaskFilters): number {
  return (
    f.priorities.length + f.statuses.length + f.due.length + f.tagIds.length + (f.completion === "all" ? 0 : 1)
  );
}

export function matchesSearch(task: Task, query: string, data: AppData): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const terms = q.split(/\s+/);
  const tagNames = task.tagIds.map((id) => data.tags[id]?.name ?? "").join(" ");
  const haystack = [task.title, task.description, task.notes, tagNames, task.subtasks.map((s) => s.title).join(" ")]
    .join("\n")
    .toLowerCase();
  return terms.every((term) => haystack.includes(term.replace(/^#/, "")));
}

function matchesDue(task: Task, due: DueFilter, now: Date): boolean {
  const days = daysUntilDue(task, now);
  switch (due) {
    case "overdue":
      return isOverdue(task, now);
    case "today":
      return days === 0;
    case "week":
      return days !== null && days >= 0 && days <= 7;
    case "hasDate":
      return days !== null;
    case "noDate":
      return days === null;
  }
}

export function matchesFilters(task: Task, f: TaskFilters, data: AppData, now = new Date()): boolean {
  if (f.completion === "completed" && !task.completed) return false;
  if (f.completion === "incomplete" && task.completed) return false;
  if (f.priorities.length && !f.priorities.includes(task.priority)) return false;
  if (f.statuses.length) {
    const name = data.columns[task.columnId]?.name.toLowerCase() ?? "";
    if (!f.statuses.includes(name)) return false;
  }
  if (f.due.length && !f.due.some((d) => matchesDue(task, d, now))) return false;
  if (f.tagIds.length && !f.tagIds.some((id) => task.tagIds.includes(id))) return false;
  return true;
}

export function filterTasks(tasks: Task[], data: AppData, query: string, f: TaskFilters): Task[] {
  const now = new Date();
  return tasks.filter((t) => matchesSearch(t, query, data) && matchesFilters(t, f, data, now));
}

/** Manual order = board order, then column order, then task order. */
function manualKey(t: Task, data: AppData): [number, number, number] {
  return [data.boards[t.boardId]?.order ?? 0, data.columns[t.columnId]?.order ?? 0, t.order];
}

export function sortTasks(tasks: Task[], sortBy: ListSortBy, data: AppData): Task[] {
  const manual = (a: Task, b: Task) => {
    const ka = manualKey(a, data);
    const kb = manualKey(b, data);
    return ka[0] - kb[0] || ka[1] - kb[1] || ka[2] - kb[2];
  };
  const due = (t: Task) => (t.dueDate ? `${t.dueDate} ${t.dueTime ?? "99:99"}` : "9999");
  const cmp: Record<ListSortBy, (a: Task, b: Task) => number> = {
    manual,
    dueDate: (a, b) => due(a).localeCompare(due(b)) || manual(a, b),
    priority: (a, b) => PRIORITY_BY_VALUE[b.priority].rank - PRIORITY_BY_VALUE[a.priority].rank || manual(a, b),
    createdAt: (a, b) => b.createdAt.localeCompare(a.createdAt),
    title: (a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" }),
  };
  return [...tasks].sort(cmp[sortBy]);
}

export interface TaskGroup {
  key: string;
  label: string;
  color?: string;
  tasks: Task[];
}

function dueBucket(t: Task, now: Date): { key: string; label: string; rank: number } {
  if (!t.dueDate) return { key: "none", label: "No due date", rank: 99 };
  if (isOverdue(t, now) && daysUntilDue(t, now)! < 0) return { key: "overdue", label: "Overdue", rank: 0 };
  const days = daysUntilDue(t, now)!;
  if (days < 0) return { key: "past", label: "Past", rank: 1 };
  if (days <= 7) return { key: t.dueDate, label: formatDayHeading(t.dueDate, now), rank: 2 + days };
  return { key: "later", label: "Later", rank: 50 };
}

export function groupTasks(tasks: Task[], groupBy: ListGroupBy, data: AppData): TaskGroup[] {
  if (groupBy === "none") return [{ key: "all", label: "All tasks", tasks }];
  const groups = new Map<string, TaskGroup & { rank: number }>();
  const add = (key: string, label: string, rank: number, t: Task, color?: string) => {
    let g = groups.get(key);
    if (!g) groups.set(key, (g = { key, label, rank, tasks: [], color }));
    g.tasks.push(t);
  };
  const now = new Date();
  for (const t of tasks) {
    if (groupBy === "board") {
      const b = data.boards[t.boardId];
      add(t.boardId, b?.name ?? "Unknown board", b?.order ?? 0, t);
    } else if (groupBy === "status") {
      const c = data.columns[t.columnId];
      const name = c?.name ?? "Unknown";
      add(name.toLowerCase(), name, c?.order ?? 0, t);
    } else if (groupBy === "priority") {
      const p = PRIORITY_BY_VALUE[t.priority];
      add(p.value, p.value === "none" ? "No priority" : p.label, -p.rank, t, p.color);
    } else {
      const b = dueBucket(t, now);
      add(b.key, b.label, b.rank, t);
    }
  }
  return [...groups.values()].sort((a, b) => a.rank - b.rank).map(({ rank: _rank, ...g }) => g);
}

export { PRIORITIES };
