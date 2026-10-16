/** Export / import of the whole app state as a human-readable JSON file. */
import { format } from "date-fns";
import { SCHEMA_VERSION } from "@/models/constants";
import type { AppData, BackupFile, ID } from "@/models/types";
import { byOrder, nowIso, uid } from "@/lib/utils";
import { SchemaError, migrate, normalizeData } from "./schema";

export function buildBackup(data: AppData, exportedAt = nowIso()): BackupFile {
  return {
    app: "taskboard",
    schemaVersion: SCHEMA_VERSION,
    exportedAt,
    data: {
      boards: Object.values(data.boards).sort(byOrder),
      columns: Object.values(data.columns).sort((a, b) => a.boardId.localeCompare(b.boardId) || a.order - b.order),
      tasks: Object.values(data.tasks).sort(
        (a, b) => a.boardId.localeCompare(b.boardId) || a.columnId.localeCompare(b.columnId) || a.order - b.order
      ),
      tags: Object.values(data.tags).sort((a, b) => a.name.localeCompare(b.name)),
      settings: data.settings,
    },
  };
}

export function backupFilename(date = new Date()): string {
  return `taskboard-backup-${format(date, "yyyy-MM-dd")}.json`;
}

export function serializeBackup(backup: BackupFile): string {
  return JSON.stringify(backup, null, 2);
}

/** Triggers a browser download of the backup file. */
export function downloadBackup(data: AppData): string {
  const filename = backupFilename();
  const blob = new Blob([serializeBackup(buildBackup(data))], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return filename;
}

export interface ImportSummary {
  boards: number;
  columns: number;
  tasks: number;
  completedTasks: number;
  tags: number;
  exportedAt: string | null;
  schemaVersion: number;
}

export type ParseResult = { ok: true; data: AppData; summary: ImportSummary } | { ok: false; error: string };

/** Parses and validates a backup file. Never throws; never touches stored data. */
export function parseBackup(text: string): ParseResult {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: "The file is not valid JSON. It may be corrupted or not a Taskboard backup." };
  }
  try {
    if (typeof json !== "object" || json === null || Array.isArray(json)) {
      throw new SchemaError("The file does not contain a Taskboard backup.");
    }
    const file = json as Record<string, unknown>;
    if (file.app !== "taskboard") throw new SchemaError("This file is not a Taskboard backup.");
    if (typeof file.schemaVersion !== "number") throw new SchemaError("The backup is missing its schema version.");
    const payload = file.data;
    if (typeof payload !== "object" || payload === null) throw new SchemaError("The backup has no data section.");
    const p = payload as Record<string, unknown>;
    const raw = migrate(
      {
        boards: p.boards as unknown[],
        columns: p.columns as unknown[],
        tasks: p.tasks as unknown[],
        tags: p.tags as unknown[],
        settings: p.settings,
      },
      file.schemaVersion
    );
    const data = normalizeData(raw);
    const tasks = Object.values(data.tasks);
    return {
      ok: true,
      data,
      summary: {
        boards: Object.keys(data.boards).length,
        columns: Object.keys(data.columns).length,
        tasks: tasks.length,
        completedTasks: tasks.filter((t) => t.completed).length,
        tags: Object.keys(data.tags).length,
        exportedAt: typeof file.exportedAt === "string" ? file.exportedAt : null,
        schemaVersion: file.schemaVersion,
      },
    };
  } catch (e) {
    const message = e instanceof SchemaError ? e.message : "The backup could not be read.";
    return { ok: false, error: message };
  }
}

/** Replace mode: imported data wins entirely, but local UI preferences such as theme are kept. */
export function replaceWithImport(current: AppData, imported: AppData): AppData {
  return {
    ...imported,
    settings: {
      ...imported.settings,
      theme: current.settings.theme,
      sidebarOpen: current.settings.sidebarOpen,
      onboarded: true,
      lastBoardId: imported.settings.lastBoardId && imported.boards[imported.settings.lastBoardId]
        ? imported.settings.lastBoardId
        : (Object.values(imported.boards).sort(byOrder)[0]?.id ?? null),
    },
  };
}

/**
 * Merge mode. Imported items are added alongside existing ones. When an imported item's ID is
 * already used locally, the imported item receives a fresh ID (and every reference to it is
 * rewritten) unless it is the very same item — same ID and same creation time — in which case
 * the more recently updated version is kept. Tags with the same name are unified.
 */
export function mergeImport(current: AppData, imported: AppData): { data: AppData; added: number; updated: number } {
  let added = 0;
  let updated = 0;
  const boardIdMap = new Map<ID, ID>();
  const columnIdMap = new Map<ID, ID>();
  const tagIdMap = new Map<ID, ID>();

  const boards = { ...current.boards };
  const columns = { ...current.columns };
  const tasks = { ...current.tasks };
  const tags = { ...current.tags };

  // Tags: unify by name, otherwise same-id/same-item logic.
  const tagsByName = new Map(Object.values(current.tags).map((t) => [t.name.toLowerCase(), t.id]));
  for (const tag of Object.values(imported.tags)) {
    const byName = tagsByName.get(tag.name.toLowerCase());
    if (byName) {
      tagIdMap.set(tag.id, byName);
      continue;
    }
    const id = tags[tag.id] ? uid() : tag.id;
    tags[id] = { ...tag, id };
    tagIdMap.set(tag.id, id);
    tagsByName.set(tag.name.toLowerCase(), id);
    added++;
  }

  let nextBoardOrder = Object.values(current.boards).reduce((m, b) => Math.max(m, b.order), -1) + 1;
  for (const board of Object.values(imported.boards).sort(byOrder)) {
    const existing = current.boards[board.id];
    if (existing && existing.createdAt === board.createdAt) {
      boardIdMap.set(board.id, board.id);
      if (board.updatedAt > existing.updatedAt) {
        boards[board.id] = { ...board, order: existing.order };
        updated++;
      }
      continue;
    }
    const id = existing ? uid() : board.id;
    boardIdMap.set(board.id, id);
    boards[id] = { ...board, id, order: nextBoardOrder++ };
    added++;
  }

  for (const col of Object.values(imported.columns)) {
    const boardId = boardIdMap.get(col.boardId)!;
    const existing = current.columns[col.id];
    if (existing && existing.createdAt === col.createdAt && existing.boardId === boardId) {
      columnIdMap.set(col.id, col.id);
      if (col.updatedAt > existing.updatedAt) {
        columns[col.id] = { ...col, boardId };
        updated++;
      }
      continue;
    }
    const id = existing ? uid() : col.id;
    columnIdMap.set(col.id, id);
    columns[id] = { ...col, id, boardId };
    added++;
  }

  for (const task of Object.values(imported.tasks)) {
    const columnId = columnIdMap.get(task.columnId)!;
    const boardId = columns[columnId].boardId;
    const tagIds = [...new Set(task.tagIds.map((t) => tagIdMap.get(t)).filter((t): t is ID => !!t))];
    const existing = current.tasks[task.id];
    if (existing && existing.createdAt === task.createdAt) {
      if (task.updatedAt > existing.updatedAt) {
        tasks[task.id] = { ...task, columnId, boardId, tagIds };
        updated++;
      }
      continue;
    }
    const id = existing ? uid() : task.id;
    tasks[id] = { ...task, id, columnId, boardId, tagIds };
    added++;
  }

  const data: AppData = { boards, columns, tasks, tags, settings: { ...current.settings, onboarded: true } };
  if (!data.settings.lastBoardId || !boards[data.settings.lastBoardId]) {
    data.settings.lastBoardId = Object.values(boards).sort(byOrder)[0]?.id ?? null;
  }
  return { data, added, updated };
}
