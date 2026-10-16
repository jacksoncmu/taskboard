/**
 * IndexedDB persistence via `idb`. Entities live in one object store per kind; settings and the
 * schema version live in the `meta` store. All writes for one state change happen in a single
 * transaction, so they either all land or none do.
 */
import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { SCHEMA_VERSION } from "@/models/constants";
import type { AppData, Board, Column, EntityKind, Tag, Task } from "@/models/types";
import { migrate, normalizeData } from "./schema";

const DB_NAME = "taskboard";
/** IndexedDB structural version (object stores / indexes). Independent from SCHEMA_VERSION. */
const DB_VERSION = 1;

interface TaskboardDB extends DBSchema {
  boards: { key: string; value: Board };
  columns: { key: string; value: Column };
  tasks: { key: string; value: Task };
  tags: { key: string; value: Tag };
  meta: { key: string; value: unknown };
}

export type Database = IDBPDatabase<TaskboardDB>;

const ENTITY_STORES: EntityKind[] = ["boards", "columns", "tasks", "tags"];
const ALL_STORES = [...ENTITY_STORES, "meta"] as const;

export async function openDatabase(): Promise<Database> {
  if (typeof indexedDB === "undefined") throw new Error("IndexedDB is not available in this browser.");
  return openDB<TaskboardDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        for (const name of ENTITY_STORES) db.createObjectStore(name, { keyPath: "id" });
        db.createObjectStore("meta");
      }
    },
    blocked() {
      console.warn("Taskboard database upgrade blocked by another open tab.");
    },
  });
}

/** Loads everything, running data migrations when the stored schema is older. */
export async function loadAll(db: Database): Promise<{ data: AppData; isEmpty: boolean }> {
  const tx = db.transaction(ALL_STORES, "readonly");
  const [boards, columns, tasks, tags, settings, version] = await Promise.all([
    tx.objectStore("boards").getAll(),
    tx.objectStore("columns").getAll(),
    tx.objectStore("tasks").getAll(),
    tx.objectStore("tags").getAll(),
    tx.objectStore("meta").get("settings"),
    tx.objectStore("meta").get("schemaVersion"),
  ]);
  await tx.done;
  const isEmpty = boards.length === 0 && settings === undefined;
  const storedVersion = typeof version === "number" ? version : SCHEMA_VERSION;
  const raw = migrate({ boards, columns, tasks, tags, settings }, storedVersion);
  const data = normalizeData(raw);
  if (storedVersion !== SCHEMA_VERSION) await replaceAll(db, data);
  return { data, isEmpty };
}

/** Writes the difference between two states (by object identity) in one transaction. */
export async function persistDiff(db: Database, prev: AppData, next: AppData): Promise<void> {
  const tx = db.transaction(ALL_STORES, "readwrite");
  const ops: Promise<unknown>[] = [];
  for (const kind of ENTITY_STORES) {
    const a = prev[kind] as Record<string, unknown>;
    const b = next[kind] as Record<string, unknown>;
    if (a === b) continue;
    const store = tx.objectStore(kind);
    for (const id in b) if (a[id] !== b[id]) ops.push(store.put(b[id] as never));
    for (const id in a) if (!(id in b)) ops.push(store.delete(id));
  }
  if (prev.settings !== next.settings) ops.push(tx.objectStore("meta").put(next.settings, "settings"));
  ops.push(tx.objectStore("meta").put(SCHEMA_VERSION, "schemaVersion"));
  await Promise.all([...ops, tx.done]);
}

/** Atomically replaces all stored data. */
export async function replaceAll(db: Database, data: AppData): Promise<void> {
  const tx = db.transaction(ALL_STORES, "readwrite");
  const ops: Promise<unknown>[] = [];
  for (const kind of ENTITY_STORES) {
    const store = tx.objectStore(kind);
    ops.push(store.clear());
    for (const item of Object.values(data[kind])) ops.push(store.put(item as never));
  }
  ops.push(tx.objectStore("meta").put(data.settings, "settings"));
  ops.push(tx.objectStore("meta").put(SCHEMA_VERSION, "schemaVersion"));
  await Promise.all([...ops, tx.done]);
}
