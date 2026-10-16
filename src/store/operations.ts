/**
 * Pure, immutable operations on AppData. Each returns a new AppData; unchanged entities keep
 * their object identity so the persistence layer can diff cheaply by reference.
 */
import { DEFAULT_COLUMNS } from "@/models/constants";
import { makeBoard, makeColumn, makeTag, makeTask, makeSubtask } from "@/models/factory";
import type { AppData, Board, Column, ID, Settings, Tag, Task } from "@/models/types";
import { byOrder, nowIso, uid } from "@/lib/utils";

// ---------- selectors ----------

export function boardsSorted(data: AppData): Board[] {
  return Object.values(data.boards).sort(byOrder);
}

export function columnsOf(data: AppData, boardId: ID): Column[] {
  return Object.values(data.columns)
    .filter((c) => c.boardId === boardId)
    .sort(byOrder);
}

export function tasksOfColumn(data: AppData, columnId: ID, includeArchived = false): Task[] {
  return Object.values(data.tasks)
    .filter((t) => t.columnId === columnId && (includeArchived || !t.archived))
    .sort(byOrder);
}

export function doneColumnOf(data: AppData, boardId: ID): Column | undefined {
  return columnsOf(data, boardId).find((c) => c.isDoneColumn);
}

function firstOpenColumnOf(data: AppData, boardId: ID): Column | undefined {
  const cols = columnsOf(data, boardId);
  return cols.find((c) => !c.isDoneColumn) ?? cols[0];
}

function maxOrder(items: { order: number }[]): number {
  return items.reduce((m, i) => Math.max(m, i.order), -1);
}

// ---------- boards ----------

export function addBoard(data: AppData, name: string, withDefaultColumns = true): [AppData, ID] {
  const board = makeBoard(name.trim() || "Untitled board", maxOrder(Object.values(data.boards)) + 1);
  const columns = { ...data.columns };
  if (withDefaultColumns) {
    DEFAULT_COLUMNS.forEach((colName, i) => {
      const col = makeColumn(board.id, colName, i, colName === "Done");
      columns[col.id] = col;
    });
  }
  return [{ ...data, boards: { ...data.boards, [board.id]: board }, columns }, board.id];
}

export function renameBoard(data: AppData, id: ID, name: string): AppData {
  const board = data.boards[id];
  const trimmed = name.trim();
  if (!board || !trimmed || board.name === trimmed) return data;
  return { ...data, boards: { ...data.boards, [id]: { ...board, name: trimmed, updatedAt: nowIso() } } };
}

export function deleteBoard(data: AppData, id: ID): AppData {
  if (!data.boards[id]) return data;
  const boards = { ...data.boards };
  delete boards[id];
  const columns = Object.fromEntries(Object.entries(data.columns).filter(([, c]) => c.boardId !== id));
  const tasks = Object.fromEntries(Object.entries(data.tasks).filter(([, t]) => t.boardId !== id));
  return { ...data, boards, columns, tasks };
}

export function reorderBoards(data: AppData, orderedIds: ID[]): AppData {
  const boards = { ...data.boards };
  let changed = false;
  orderedIds.forEach((id, i) => {
    const b = boards[id];
    if (b && b.order !== i) {
      boards[id] = { ...b, order: i, updatedAt: nowIso() };
      changed = true;
    }
  });
  return changed ? { ...data, boards } : data;
}

// ---------- columns ----------

export function addColumn(data: AppData, boardId: ID, name: string): [AppData, ID] {
  const col = makeColumn(boardId, name.trim() || "Untitled", maxOrder(columnsOf(data, boardId)) + 1);
  return [{ ...data, columns: { ...data.columns, [col.id]: col } }, col.id];
}

export function renameColumn(data: AppData, id: ID, name: string): AppData {
  const col = data.columns[id];
  const trimmed = name.trim();
  if (!col || !trimmed || col.name === trimmed) return data;
  return { ...data, columns: { ...data.columns, [id]: { ...col, name: trimmed, updatedAt: nowIso() } } };
}

export function deleteColumn(data: AppData, id: ID): AppData {
  if (!data.columns[id]) return data;
  const columns = { ...data.columns };
  delete columns[id];
  const tasks = Object.fromEntries(Object.entries(data.tasks).filter(([, t]) => t.columnId !== id));
  return { ...data, columns, tasks };
}

export function reorderColumns(data: AppData, boardId: ID, orderedIds: ID[]): AppData {
  const columns = { ...data.columns };
  let changed = false;
  orderedIds.forEach((id, i) => {
    const c = columns[id];
    if (c && c.boardId === boardId && c.order !== i) {
      columns[id] = { ...c, order: i, updatedAt: nowIso() };
      changed = true;
    }
  });
  return changed ? { ...data, columns } : data;
}

/** Marks a column as the board's completion column (at most one per board). */
export function setDoneColumn(data: AppData, id: ID, isDone: boolean): AppData {
  const target = data.columns[id];
  if (!target) return data;
  const now = nowIso();
  const columns = { ...data.columns };
  for (const c of columnsOf(data, target.boardId)) {
    const next = c.id === id ? isDone : isDone ? false : c.isDoneColumn;
    if (next !== c.isDoneColumn) columns[c.id] = { ...c, isDoneColumn: next, updatedAt: now };
  }
  let tasks = data.tasks;
  if (isDone) {
    tasks = { ...data.tasks };
    for (const t of Object.values(data.tasks)) {
      if (t.columnId === id && !t.completed) tasks[t.id] = { ...t, completed: true, completedAt: now, updatedAt: now };
    }
  }
  return { ...data, columns, tasks };
}

// ---------- tasks ----------

export type NewTaskInput = Partial<Omit<Task, "id" | "createdAt" | "updatedAt" | "order">> &
  Pick<Task, "boardId" | "columnId" | "title">;

export function addTask(data: AppData, input: NewTaskInput, position: "start" | "end" = "end"): [AppData, ID] {
  const colTasks = tasksOfColumn(data, input.columnId, true);
  const order =
    position === "end" ? maxOrder(colTasks) + 1 : colTasks.length ? Math.min(...colTasks.map((t) => t.order)) - 1 : 0;
  const col = data.columns[input.columnId];
  const completed = input.completed ?? !!col?.isDoneColumn;
  const task = makeTask({
    ...input,
    title: input.title.trim() || "Untitled task",
    order,
    completed,
    completedAt: completed ? (input.completedAt ?? nowIso()) : null,
  });
  return [{ ...data, tasks: { ...data.tasks, [task.id]: task } }, task.id];
}

export function updateTask(data: AppData, id: ID, patch: Partial<Omit<Task, "id" | "createdAt">>): AppData {
  const task = data.tasks[id];
  if (!task) return data;
  const next: Task = { ...task, ...patch, updatedAt: nowIso() };
  if (patch.title !== undefined) next.title = patch.title.trim() || task.title;
  return { ...data, tasks: { ...data.tasks, [id]: next } };
}

export function deleteTasks(data: AppData, ids: ID[]): AppData {
  const tasks = { ...data.tasks };
  let changed = false;
  for (const id of ids) {
    if (tasks[id]) {
      delete tasks[id];
      changed = true;
    }
  }
  return changed ? { ...data, tasks } : data;
}

export function duplicateTask(data: AppData, id: ID): [AppData, ID | null] {
  const src = data.tasks[id];
  if (!src) return [data, null];
  const now = nowIso();
  // Insert right after the source task.
  const siblings = tasksOfColumn(data, src.columnId, true).filter((t) => t.id !== id);
  const idx = siblings.findIndex((t) => t.order > src.order);
  const copy: Task = {
    ...src,
    id: uid(),
    title: `${src.title} (copy)`,
    tagIds: [...src.tagIds],
    subtasks: src.subtasks.map((s) => ({ ...s, id: uid() })),
    archived: false,
    archivedAt: null,
    createdAt: now,
    updatedAt: now,
  };
  const before = idx === -1 ? null : siblings[idx].id;
  const withCopy = { ...data, tasks: { ...data.tasks, [copy.id]: copy } };
  return [moveTask(withCopy, copy.id, src.columnId, before), copy.id];
}

/**
 * Moves a task to `toColumnId`, placing it before `beforeId` (or at the end when null).
 * Syncs completion state with the destination column's "done" flag.
 */
export function moveTask(data: AppData, id: ID, toColumnId: ID, beforeId: ID | null): AppData {
  const task = data.tasks[id];
  const toCol = data.columns[toColumnId];
  if (!task || !toCol) return data;
  const now = nowIso();
  const tasks = { ...data.tasks };

  const siblings = tasksOfColumn(data, toColumnId, true).filter((t) => t.id !== id);
  let index = beforeId ? siblings.findIndex((t) => t.id === beforeId) : -1;
  if (index === -1) index = siblings.length;

  const moved: Task = { ...task, columnId: toColumnId, boardId: toCol.boardId };
  const fromCol = data.columns[task.columnId];
  if (toCol.isDoneColumn && !task.completed) {
    moved.completed = true;
    moved.completedAt = now;
  } else if (!toCol.isDoneColumn && fromCol?.isDoneColumn && task.completed && toCol.id !== fromCol.id) {
    moved.completed = false;
    moved.completedAt = null;
  }
  const ordered = [...siblings.slice(0, index), moved, ...siblings.slice(index)];
  ordered.forEach((t, i) => {
    if (t.id === id) {
      tasks[id] = { ...moved, order: i, updatedAt: now };
    } else if (t.order !== i) {
      tasks[t.id] = { ...t, order: i };
    }
  });
  return { ...data, tasks };
}

export function moveTaskToBoard(data: AppData, id: ID, boardId: ID): AppData {
  const task = data.tasks[id];
  if (!task || task.boardId === boardId) return data;
  const target = task.completed
    ? (doneColumnOf(data, boardId) ?? firstOpenColumnOf(data, boardId))
    : firstOpenColumnOf(data, boardId);
  if (!target) return data;
  return moveTask(data, id, target.id, null);
}

/** Completes / reopens a task, moving it to or out of the board's completion column. */
export function setTaskCompleted(data: AppData, id: ID, completed: boolean): AppData {
  const task = data.tasks[id];
  if (!task || task.completed === completed) return data;
  const now = nowIso();
  const col = data.columns[task.columnId];
  if (completed) {
    const done = doneColumnOf(data, task.boardId);
    let next = data;
    if (done && done.id !== task.columnId) {
      const first = tasksOfColumn(data, done.id, true)[0];
      next = moveTask(data, id, done.id, first?.id ?? null);
    }
    const t = next.tasks[id];
    return { ...next, tasks: { ...next.tasks, [id]: { ...t, completed: true, completedAt: t.completedAt ?? now, updatedAt: now } } };
  }
  let next = data;
  if (col?.isDoneColumn) {
    const open = firstOpenColumnOf(data, task.boardId);
    if (open && open.id !== col.id) next = moveTask(data, id, open.id, null);
  }
  const t = next.tasks[id];
  return { ...next, tasks: { ...next.tasks, [id]: { ...t, completed: false, completedAt: null, updatedAt: now } } };
}

export function setTaskArchived(data: AppData, id: ID, archived: boolean): AppData {
  const task = data.tasks[id];
  if (!task || task.archived === archived) return data;
  return updateTask(data, id, { archived, archivedAt: archived ? nowIso() : null });
}

// ---------- subtasks ----------

export function addSubtask(data: AppData, taskId: ID, title: string): AppData {
  const task = data.tasks[taskId];
  if (!task || !title.trim()) return data;
  return updateTask(data, taskId, { subtasks: [...task.subtasks, makeSubtask(title.trim())] });
}

export function updateSubtask(
  data: AppData,
  taskId: ID,
  subId: ID,
  patch: Partial<{ title: string; completed: boolean }>
): AppData {
  const task = data.tasks[taskId];
  if (!task) return data;
  const subtasks = task.subtasks.map((s) => {
    if (s.id !== subId) return s;
    const next = { ...s, ...patch };
    if (patch.title !== undefined) next.title = patch.title.trim() || s.title;
    if (patch.completed !== undefined && patch.completed !== s.completed) {
      next.completedAt = patch.completed ? nowIso() : null;
    }
    return next;
  });
  return updateTask(data, taskId, { subtasks });
}

export function deleteSubtask(data: AppData, taskId: ID, subId: ID): AppData {
  const task = data.tasks[taskId];
  if (!task) return data;
  return updateTask(data, taskId, { subtasks: task.subtasks.filter((s) => s.id !== subId) });
}

export function reorderSubtasks(data: AppData, taskId: ID, orderedIds: ID[]): AppData {
  const task = data.tasks[taskId];
  if (!task) return data;
  const byId = new Map(task.subtasks.map((s) => [s.id, s]));
  const subtasks = orderedIds.map((id) => byId.get(id)).filter((s): s is NonNullable<typeof s> => !!s);
  return updateTask(data, taskId, { subtasks });
}

// ---------- tags ----------

export function addTag(data: AppData, name: string, color: string): [AppData, ID] {
  const existing = Object.values(data.tags).find((t) => t.name.toLowerCase() === name.trim().toLowerCase());
  if (existing) return [data, existing.id];
  const tag = makeTag(name.trim(), color);
  return [{ ...data, tags: { ...data.tags, [tag.id]: tag } }, tag.id];
}

export function updateTag(data: AppData, id: ID, patch: Partial<Pick<Tag, "name" | "color">>): AppData {
  const tag = data.tags[id];
  if (!tag) return data;
  const name = patch.name?.trim();
  return {
    ...data,
    tags: { ...data.tags, [id]: { ...tag, ...patch, name: name || tag.name, updatedAt: nowIso() } },
  };
}

export function deleteTag(data: AppData, id: ID): AppData {
  if (!data.tags[id]) return data;
  const tags = { ...data.tags };
  delete tags[id];
  const tasks = { ...data.tasks };
  const now = nowIso();
  for (const t of Object.values(data.tasks)) {
    if (t.tagIds.includes(id)) tasks[t.id] = { ...t, tagIds: t.tagIds.filter((x) => x !== id), updatedAt: now };
  }
  return { ...data, tags, tasks };
}

// ---------- settings ----------

export function updateSettings(data: AppData, patch: Partial<Settings>): AppData {
  return { ...data, settings: { ...data.settings, ...patch } };
}

// ---------- undo support ----------

export interface Snapshot {
  boards: Board[];
  columns: Column[];
  tasks: Task[];
}

/** Captures the entities that `deleteBoard` / `deleteColumn` / `deleteTasks` would remove. */
export function snapshotForBoard(data: AppData, boardId: ID): Snapshot {
  return {
    boards: data.boards[boardId] ? [data.boards[boardId]] : [],
    columns: Object.values(data.columns).filter((c) => c.boardId === boardId),
    tasks: Object.values(data.tasks).filter((t) => t.boardId === boardId),
  };
}

export function snapshotForColumn(data: AppData, columnId: ID): Snapshot {
  return {
    boards: [],
    columns: data.columns[columnId] ? [data.columns[columnId]] : [],
    tasks: Object.values(data.tasks).filter((t) => t.columnId === columnId),
  };
}

export function snapshotForTasks(data: AppData, ids: ID[]): Snapshot {
  return { boards: [], columns: [], tasks: ids.map((id) => data.tasks[id]).filter(Boolean) };
}

/** Restores previously deleted entities; tasks whose column no longer exists are skipped. */
export function restoreSnapshot(data: AppData, snap: Snapshot): AppData {
  const boards = { ...data.boards };
  const columns = { ...data.columns };
  const tasks = { ...data.tasks };
  for (const b of snap.boards) boards[b.id] = b;
  for (const c of snap.columns) if (boards[c.boardId]) columns[c.id] = c;
  for (const t of snap.tasks) {
    const col = columns[t.columnId];
    if (col) tasks[t.id] = { ...t, boardId: col.boardId, tagIds: t.tagIds.filter((id) => data.tags[id]) };
  }
  return { ...data, boards, columns, tasks };
}
