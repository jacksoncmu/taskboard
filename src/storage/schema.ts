/**
 * Schema validation, normalization and migrations shared by IndexedDB loading and backup import.
 */
import { DEFAULT_SETTINGS, PRIORITIES, SCHEMA_VERSION } from "@/models/constants";
import type { AppData, Board, Column, Priority, Settings, Subtask, Tag, Task } from "@/models/types";
import { isValidDateKey, isValidTime } from "@/lib/dates";
import { nowIso } from "@/lib/utils";

export class SchemaError extends Error {}

/** Raw entity arrays as they appear in storage or in a backup's `data` field. */
export interface RawCollections {
  boards: unknown[];
  columns: unknown[];
  tasks: unknown[];
  tags: unknown[];
  settings: unknown;
}

/**
 * Migrations keyed by the version they upgrade *from*. Each receives the collections of version N
 * and returns collections of version N + 1. Add an entry here whenever SCHEMA_VERSION is bumped.
 */
export const MIGRATIONS: Record<number, (raw: RawCollections) => RawCollections> = {};

export function migrate(raw: RawCollections, fromVersion: number): RawCollections {
  if (!Number.isInteger(fromVersion) || fromVersion < 1) {
    throw new SchemaError(`Unknown schema version "${fromVersion}".`);
  }
  if (fromVersion > SCHEMA_VERSION) {
    throw new SchemaError(
      `This file was created by a newer version of Taskboard (schema v${fromVersion}). Please update the app first.`
    );
  }
  let out = raw;
  for (let v = fromVersion; v < SCHEMA_VERSION; v++) {
    const step = MIGRATIONS[v];
    if (!step) throw new SchemaError(`No migration available from schema v${v}.`);
    out = step(out);
  }
  return out;
}

// ---------- field coercion helpers ----------

type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown, fallback = ""): string => (typeof v === "string" ? v : fallback);
const num = (v: unknown, fallback: number): number => (typeof v === "number" && Number.isFinite(v) ? v : fallback);
const bool = (v: unknown, fallback = false): boolean => (typeof v === "boolean" ? v : fallback);
const iso = (v: unknown, fallback: string | null): string | null =>
  typeof v === "string" && !Number.isNaN(Date.parse(v)) ? v : fallback;
const isoReq = (v: unknown, fallback: string): string => iso(v, fallback) ?? fallback;

function requireId(o: Obj, kind: string, index: number): string {
  if (typeof o.id !== "string" || !o.id) throw new SchemaError(`${kind} #${index + 1} is missing an id.`);
  return o.id;
}

function requireObj(v: unknown, kind: string, index: number): Obj {
  if (!isObj(v)) throw new SchemaError(`${kind} #${index + 1} is not an object.`);
  return v;
}

const PRIORITY_VALUES = new Set<string>(PRIORITIES.map((p) => p.value));
const HEX = /^#[0-9a-fA-F]{6}$/;

// ---------- normalization ----------

function normalizeBoard(v: unknown, i: number, now: string): Board {
  const o = requireObj(v, "Board", i);
  return {
    id: requireId(o, "Board", i),
    name: str(o.name, "Untitled board") || "Untitled board",
    order: num(o.order, i),
    createdAt: isoReq(o.createdAt, now),
    updatedAt: isoReq(o.updatedAt, now),
  };
}

function normalizeColumn(v: unknown, i: number, now: string): Column {
  const o = requireObj(v, "Column", i);
  if (typeof o.boardId !== "string") throw new SchemaError(`Column #${i + 1} has no board.`);
  return {
    id: requireId(o, "Column", i),
    boardId: o.boardId,
    name: str(o.name, "Untitled") || "Untitled",
    order: num(o.order, i),
    isDoneColumn: bool(o.isDoneColumn),
    createdAt: isoReq(o.createdAt, now),
    updatedAt: isoReq(o.updatedAt, now),
  };
}

function normalizeSubtask(v: unknown, now: string): Subtask | null {
  if (!isObj(v) || typeof v.id !== "string") return null;
  const completed = bool(v.completed);
  return {
    id: v.id,
    title: str(v.title, "Untitled") || "Untitled",
    completed,
    createdAt: isoReq(v.createdAt, now),
    completedAt: completed ? iso(v.completedAt, null) : null,
  };
}

function normalizeTask(v: unknown, i: number, now: string): Task {
  const o = requireObj(v, "Task", i);
  if (typeof o.columnId !== "string") throw new SchemaError(`Task #${i + 1} has no column.`);
  const completed = bool(o.completed);
  const archived = bool(o.archived);
  const subtasks = Array.isArray(o.subtasks)
    ? o.subtasks.map((s) => normalizeSubtask(s, now)).filter((s): s is Subtask => !!s)
    : [];
  return {
    id: requireId(o, "Task", i),
    boardId: str(o.boardId),
    columnId: o.columnId,
    title: str(o.title, "Untitled task") || "Untitled task",
    description: str(o.description),
    notes: str(o.notes),
    priority: (PRIORITY_VALUES.has(o.priority as string) ? o.priority : "none") as Priority,
    dueDate: isValidDateKey(o.dueDate) ? o.dueDate : null,
    dueTime: isValidDateKey(o.dueDate) && isValidTime(o.dueTime) ? o.dueTime : null,
    startDate: isValidDateKey(o.startDate) ? o.startDate : null,
    tagIds: Array.isArray(o.tagIds) ? o.tagIds.filter((t): t is string => typeof t === "string") : [],
    subtasks,
    completed,
    completedAt: completed ? iso(o.completedAt, now) : null,
    archived,
    archivedAt: archived ? iso(o.archivedAt, now) : null,
    order: num(o.order, i),
    createdAt: isoReq(o.createdAt, now),
    updatedAt: isoReq(o.updatedAt, now),
  };
}

function normalizeTag(v: unknown, i: number, now: string): Tag {
  const o = requireObj(v, "Tag", i);
  return {
    id: requireId(o, "Tag", i),
    name: str(o.name, "Tag") || "Tag",
    color: typeof o.color === "string" && HEX.test(o.color) ? o.color : "#616161",
    createdAt: isoReq(o.createdAt, now),
    updatedAt: isoReq(o.updatedAt, now),
  };
}

export function normalizeSettings(v: unknown): Settings {
  const o = isObj(v) ? v : {};
  const d = DEFAULT_SETTINGS;
  const oneOf = <T extends string>(val: unknown, allowed: readonly T[], fb: T): T =>
    allowed.includes(val as T) ? (val as T) : fb;
  return {
    theme: oneOf(o.theme, ["light", "dark", "system"], d.theme),
    lastBoardId: typeof o.lastBoardId === "string" ? o.lastBoardId : null,
    lastView: oneOf(o.lastView, ["board", "list", "calendar"], d.lastView),
    listGroupBy: oneOf(o.listGroupBy, ["none", "board", "status", "dueDate", "priority"], d.listGroupBy),
    listSortBy: oneOf(o.listSortBy, ["manual", "dueDate", "priority", "createdAt", "title"], d.listSortBy),
    showCompletedOnBoard: bool(o.showCompletedOnBoard, d.showCompletedOnBoard),
    sidebarOpen: bool(o.sidebarOpen, d.sidebarOpen),
    onboarded: bool(o.onboarded, d.onboarded),
    lastExportAt: iso(o.lastExportAt, null),
  };
}

function toRecord<T extends { id: string }>(items: T[], kind: string): Record<string, T> {
  const out: Record<string, T> = {};
  for (const item of items) {
    if (out[item.id]) throw new SchemaError(`Duplicate ${kind} id "${item.id}".`);
    out[item.id] = item;
  }
  return out;
}

/**
 * Validates and normalizes raw collections into AppData. Throws SchemaError on structural problems.
 * Repairs referential integrity: drops columns without a board, re-homes tasks whose column is
 * missing, removes dangling tag references.
 */
export function normalizeData(raw: RawCollections): AppData {
  for (const key of ["boards", "columns", "tasks", "tags"] as const) {
    if (!Array.isArray(raw[key])) throw new SchemaError(`"${key}" must be a list.`);
  }
  const now = nowIso();
  const boards = toRecord(raw.boards.map((b, i) => normalizeBoard(b, i, now)), "board");
  const columns = toRecord(
    raw.columns.map((c, i) => normalizeColumn(c, i, now)).filter((c) => boards[c.boardId]),
    "column"
  );
  const tags = toRecord(raw.tags.map((t, i) => normalizeTag(t, i, now)), "tag");
  const tasks: Record<string, Task> = {};
  raw.tasks.forEach((t, i) => {
    const task = normalizeTask(t, i, now);
    if (tasks[task.id]) throw new SchemaError(`Duplicate task id "${task.id}".`);
    const col = columns[task.columnId];
    if (!col) return; // orphaned task: its column is gone
    task.boardId = col.boardId;
    task.tagIds = [...new Set(task.tagIds.filter((id) => tags[id]))];
    tasks[task.id] = task;
  });
  return { boards, columns, tasks, tags, settings: normalizeSettings(raw.settings) };
}

export function emptyData(): AppData {
  return { boards: {}, columns: {}, tasks: {}, tags: {}, settings: { ...DEFAULT_SETTINGS } };
}
