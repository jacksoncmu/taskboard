/**
 * Application actions: thin wrappers over pure operations that apply them to the store and give
 * user feedback (toasts, undo) where appropriate.
 */
import { toast } from "sonner";
import type { AppData, ID, Settings, Tag, Task } from "@/models/types";
import type { ColumnSort } from "@/models/constants";
import { pluralize } from "@/lib/utils";
import { buildDemoData } from "@/lib/demo";
import { store } from "./store";
import * as ops from "./operations";

const u = store.update;

function withUndo(message: string, snap: ops.Snapshot) {
  toast(message, {
    action: {
      label: "Undo",
      onClick: () => {
        u((d) => ops.restoreSnapshot(d, snap));
        toast.success("Restored");
      },
    },
    duration: 7000,
  });
}

export const actions = {
  // boards
  addBoard(name: string): ID {
    let id = "";
    u((d) => {
      const [next, newId] = ops.addBoard(d, name);
      id = newId;
      return ops.updateSettings(next, { lastBoardId: newId });
    });
    return id;
  },
  renameBoard: (id: ID, name: string) => u((d) => ops.renameBoard(d, id, name)),
  reorderBoards: (ids: ID[]) => u((d) => ops.reorderBoards(d, ids)),
  deleteBoard(id: ID) {
    const data = store.getState().data;
    const board = data.boards[id];
    if (!board) return;
    const snap = ops.snapshotForBoard(data, id);
    u((d) => {
      let next = ops.deleteBoard(d, id);
      if (next.settings.lastBoardId === id) {
        next = ops.updateSettings(next, { lastBoardId: ops.boardsSorted(next)[0]?.id ?? null });
      }
      return next;
    });
    withUndo(`Deleted board "${board.name}"`, snap);
  },

  // columns
  addColumn: (boardId: ID, name: string): ID => {
    let id = "";
    u((d) => {
      const [next, newId] = ops.addColumn(d, boardId, name);
      id = newId;
      return next;
    });
    return id;
  },
  renameColumn: (id: ID, name: string) => u((d) => ops.renameColumn(d, id, name)),
  reorderColumns: (boardId: ID, ids: ID[]) => u((d) => ops.reorderColumns(d, boardId, ids)),
  setDoneColumn: (id: ID, isDone: boolean) => u((d) => ops.setDoneColumn(d, id, isDone)),
  setColumnColor: (id: ID, color: string | null) => u((d) => ops.setColumnColor(d, id, color)),
  sortColumn: (id: ID, by: ColumnSort) => u((d) => ops.sortColumn(d, id, by)),
  duplicateColumn(id: ID) {
    u((d) => ops.duplicateColumn(d, id)[0]);
    toast.success("List duplicated");
  },
  deleteCompletedInColumn(id: ID) {
    const ids = Object.values(store.getState().data.tasks)
      .filter((t) => t.columnId === id && t.completed)
      .map((t) => t.id);
    if (ids.length) actions.deleteTasks(ids);
    else toast("No completed tasks in this list");
  },
  deleteColumn(id: ID) {
    const data = store.getState().data;
    const col = data.columns[id];
    if (!col) return;
    const snap = ops.snapshotForColumn(data, id);
    u((d) => ops.deleteColumn(d, id));
    withUndo(`Deleted list "${col.name}"${snap.tasks.length ? ` and ${pluralize(snap.tasks.length, "task")}` : ""}`, snap);
  },

  // tasks
  addTask(input: ops.NewTaskInput, position: "start" | "end" = "end"): ID {
    let id = "";
    u((d) => {
      const [next, newId] = ops.addTask(d, input, position);
      id = newId;
      return next;
    });
    return id;
  },
  updateTask: (id: ID, patch: Partial<Omit<Task, "id" | "createdAt">>) => u((d) => ops.updateTask(d, id, patch)),
  moveTask: (id: ID, columnId: ID, beforeId: ID | null) => u((d) => ops.moveTask(d, id, columnId, beforeId)),
  moveTaskToBoard(id: ID, boardId: ID) {
    u((d) => ops.moveTaskToBoard(d, id, boardId));
    const board = store.getState().data.boards[boardId];
    if (board) toast.success(`Moved to "${board.name}"`);
  },
  setCompleted(id: ID, completed: boolean) {
    u((d) => ops.setTaskCompleted(d, id, completed));
  },
  toggleCompleted(id: ID) {
    const t = store.getState().data.tasks[id];
    if (t) actions.setCompleted(id, !t.completed);
  },
  duplicateTask(id: ID): ID | null {
    let newId: ID | null = null;
    u((d) => {
      const [next, copyId] = ops.duplicateTask(d, id);
      newId = copyId;
      return next;
    });
    if (newId) toast.success("Task duplicated");
    return newId;
  },
  archiveTask(id: ID, archived = true) {
    u((d) => ops.setTaskArchived(d, id, archived));
    if (archived) {
      toast("Task archived", {
        action: { label: "Undo", onClick: () => u((d) => ops.setTaskArchived(d, id, false)) },
      });
    } else {
      toast.success("Task restored from archive");
    }
  },
  deleteTasks(ids: ID[]) {
    const snap = ops.snapshotForTasks(store.getState().data, ids);
    if (!snap.tasks.length) return;
    u((d) => ops.deleteTasks(d, ids));
    withUndo(snap.tasks.length === 1 ? "Task deleted" : `${snap.tasks.length} tasks deleted`, snap);
  },

  // subtasks
  addSubtask: (taskId: ID, title: string) => u((d) => ops.addSubtask(d, taskId, title)),
  updateSubtask: (taskId: ID, subId: ID, patch: Partial<{ title: string; completed: boolean }>) =>
    u((d) => ops.updateSubtask(d, taskId, subId, patch)),
  deleteSubtask: (taskId: ID, subId: ID) => u((d) => ops.deleteSubtask(d, taskId, subId)),
  reorderSubtasks: (taskId: ID, ids: ID[]) => u((d) => ops.reorderSubtasks(d, taskId, ids)),

  // tags
  addTag(name: string, color: string): ID {
    let id = "";
    u((d) => {
      const [next, newId] = ops.addTag(d, name, color);
      id = newId;
      return next;
    });
    return id;
  },
  updateTag: (id: ID, patch: Partial<Pick<Tag, "name" | "color">>) => u((d) => ops.updateTag(d, id, patch)),
  deleteTag(id: ID) {
    const tag = store.getState().data.tags[id];
    u((d) => ops.deleteTag(d, id));
    if (tag) toast.success(`Deleted label "${tag.name}"`);
  },

  // settings
  updateSettings: (patch: Partial<Settings>) => u((d) => ops.updateSettings(d, patch)),

  // whole-data operations
  async replaceAll(data: AppData) {
    await store.replace(data);
  },
  loadDemo() {
    u((d) => {
      const demo = buildDemoData(ops.boardsSorted(d).length);
      return {
        ...d,
        boards: { ...d.boards, ...demo.boards },
        columns: { ...d.columns, ...demo.columns },
        tasks: { ...d.tasks, ...demo.tasks },
        tags: { ...d.tags, ...demo.tags },
        settings: { ...d.settings, onboarded: true, lastBoardId: Object.keys(demo.boards)[0] },
      };
    });
  },
};
