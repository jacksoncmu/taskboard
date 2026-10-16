import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import * as ops from "@/store/operations";
import { emptyData } from "@/storage/schema";
import { buildBackup, mergeImport, parseBackup, replaceWithImport, serializeBackup } from "@/storage/backup";
import { loadAll, openDatabase, persistDiff, replaceAll } from "@/storage/db";
import { filterTasks, EMPTY_FILTERS, sortTasks } from "@/lib/taskQuery";
import type { AppData } from "@/models/types";

function seed(): { data: AppData; boardId: string; cols: string[] } {
  let [data, boardId] = ops.addBoard(emptyData(), "Work");
  const cols = ops.columnsOf(data, boardId).map((c) => c.id);
  for (const title of ["A", "B", "C"]) [data] = ops.addTask(data, { boardId, columnId: cols[0], title });
  return { data, boardId, cols };
}

const titles = (d: AppData, col: string) => ops.tasksOfColumn(d, col).map((t) => t.title);

describe("operations", () => {
  it("creates boards with default columns, last one is the completion column", () => {
    const { data, boardId } = seed();
    const cols = ops.columnsOf(data, boardId);
    expect(cols.map((c) => c.name)).toEqual(["To Do", "In Progress", "Done"]);
    expect(cols.map((c) => c.isDoneColumn)).toEqual([false, false, true]);
  });

  it("reorders within a column and moves between columns", () => {
    const { data, cols } = seed();
    const [a, , c] = ops.tasksOfColumn(data, cols[0]);
    let d = ops.moveTask(data, c.id, cols[0], a.id);
    expect(titles(d, cols[0])).toEqual(["C", "A", "B"]);
    d = ops.moveTask(d, a.id, cols[1], null);
    expect(titles(d, cols[0])).toEqual(["C", "B"]);
    expect(titles(d, cols[1])).toEqual(["A"]);
  });

  it("syncs completion with the done column", () => {
    const { data, cols } = seed();
    const a = ops.tasksOfColumn(data, cols[0])[0];
    let d = ops.setTaskCompleted(data, a.id, true);
    expect(d.tasks[a.id].columnId).toBe(cols[2]);
    expect(d.tasks[a.id].completedAt).toBeTruthy();
    d = ops.moveTask(d, a.id, cols[1], null);
    expect(d.tasks[a.id].completed).toBe(false);
    d = ops.moveTask(d, a.id, cols[2], null);
    expect(d.tasks[a.id].completed).toBe(true);
  });

  it("duplicates, deletes and restores", () => {
    const { data, cols } = seed();
    const a = ops.tasksOfColumn(data, cols[0])[0];
    let [d, copyId] = ops.duplicateTask(data, a.id);
    expect(titles(d, cols[0])).toEqual(["A", "A (copy)", "B", "C"]);
    const snap = ops.snapshotForTasks(d, [copyId!]);
    d = ops.deleteTasks(d, [copyId!]);
    expect(d.tasks[copyId!]).toBeUndefined();
    d = ops.restoreSnapshot(d, snap);
    expect(titles(d, cols[0])).toEqual(["A", "A (copy)", "B", "C"]);
  });

  it("moves tasks between boards", () => {
    let { data, cols } = seed();
    const [d2, other] = ops.addBoard(data, "Home");
    data = d2;
    const a = ops.tasksOfColumn(data, cols[0])[0];
    data = ops.moveTaskToBoard(data, a.id, other);
    expect(data.tasks[a.id].boardId).toBe(other);
    expect(data.columns[data.tasks[a.id].columnId].boardId).toBe(other);
  });
});

describe("backup", () => {
  function rich() {
    let { data, boardId, cols } = seed();
    let tagId: string;
    [data, tagId] = ops.addTag(data, "Urgent stuff", "#d50000");
    const a = ops.tasksOfColumn(data, cols[0])[0];
    data = ops.updateTask(data, a.id, { tagIds: [tagId], priority: "high", dueDate: "2026-10-20", dueTime: "09:30" });
    data = ops.addSubtask(data, a.id, "sub 1");
    data = ops.addSubtask(data, a.id, "sub 2");
    data = ops.updateSubtask(data, a.id, data.tasks[a.id].subtasks[0].id, { completed: true });
    data = ops.setTaskCompleted(data, ops.tasksOfColumn(data, cols[0])[1].id, true);
    return { data, boardId, cols };
  }

  it("round-trips all data exactly", () => {
    const { data } = rich();
    const parsed = parseBackup(serializeBackup(buildBackup(data)));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.data.tasks).toEqual(data.tasks);
    expect(parsed.data.columns).toEqual(data.columns);
    expect(parsed.data.boards).toEqual(data.boards);
    expect(parsed.data.tags).toEqual(data.tags);
    expect(parsed.summary).toMatchObject({ boards: 1, tasks: 3, tags: 1, completedTasks: 1 });
  });

  it("rejects invalid files with a clear message", () => {
    expect(parseBackup("not json").ok).toBe(false);
    expect(parseBackup("{}").ok).toBe(false);
    expect(parseBackup(JSON.stringify({ app: "taskboard", schemaVersion: 99, data: {} })).ok).toBe(false);
    const bad = parseBackup(JSON.stringify({ app: "taskboard", schemaVersion: 1, data: { boards: "x" } }));
    expect(bad.ok).toBe(false);
  });

  it("merging the same backup twice does not duplicate", () => {
    const { data } = rich();
    const parsed = parseBackup(serializeBackup(buildBackup(data)));
    if (!parsed.ok) throw new Error();
    const { data: merged, added } = mergeImport(data, parsed.data);
    expect(added).toBe(0);
    expect(Object.keys(merged.tasks)).toHaveLength(3);
  });

  it("merging handles id collisions with different items by re-keying", () => {
    const { data } = rich();
    const parsed = parseBackup(serializeBackup(buildBackup(data)));
    if (!parsed.ok) throw new Error();
    // Simulate a different item that happens to share ids (different createdAt).
    const imported = structuredClone(parsed.data);
    for (const b of Object.values(imported.boards)) b.createdAt = "2000-01-01T00:00:00.000Z";
    for (const c of Object.values(imported.columns)) c.createdAt = "2000-01-01T00:00:00.000Z";
    for (const t of Object.values(imported.tasks)) t.createdAt = "2000-01-01T00:00:00.000Z";
    const { data: merged } = mergeImport(data, imported);
    expect(Object.keys(merged.boards)).toHaveLength(2);
    expect(Object.keys(merged.tasks)).toHaveLength(6);
    expect(Object.keys(merged.tags)).toHaveLength(1); // unified by name
    for (const t of Object.values(merged.tasks)) {
      expect(merged.columns[t.columnId].boardId).toBe(t.boardId);
    }
  });

  it("replace keeps imported content", () => {
    const { data } = rich();
    const parsed = parseBackup(serializeBackup(buildBackup(data)));
    if (!parsed.ok) throw new Error();
    const replaced = replaceWithImport(emptyData(), parsed.data);
    expect(replaced.tasks).toEqual(data.tasks);
  });
});

describe("indexeddb persistence", () => {
  it("persists diffs and reloads identical data", async () => {
    const db = await openDatabase();
    const empty = emptyData();
    await replaceAll(db, empty);
    const { data } = seed();
    await persistDiff(db, empty, data);
    const deleted = ops.deleteTasks(data, [Object.keys(data.tasks)[0]]);
    await persistDiff(db, data, deleted);
    const { data: loaded } = await loadAll(db);
    expect(loaded.tasks).toEqual(deleted.tasks);
    expect(loaded.columns).toEqual(deleted.columns);
    expect(loaded.boards).toEqual(deleted.boards);
    db.close();
  });
});

describe("query", () => {
  it("searches and filters", () => {
    const { data } = seed();
    const all = Object.values(data.tasks);
    expect(filterTasks(all, data, "b", EMPTY_FILTERS).map((t) => t.title)).toEqual(["B"]);
    expect(filterTasks(all, data, "", { ...EMPTY_FILTERS, completion: "completed" })).toHaveLength(0);
    expect(sortTasks(all, "title", data).map((t) => t.title)).toEqual(["A", "B", "C"]);
  });
});
