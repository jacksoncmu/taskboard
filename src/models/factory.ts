import { nowIso, uid } from "@/lib/utils";
import type { Board, Column, ID, Subtask, Tag, Task } from "./types";

export function makeBoard(name: string, order: number): Board {
  const now = nowIso();
  return { id: uid(), name, order, createdAt: now, updatedAt: now };
}

export function makeColumn(boardId: ID, name: string, order: number, isDoneColumn = false): Column {
  const now = nowIso();
  return { id: uid(), boardId, name, order, isDoneColumn, createdAt: now, updatedAt: now };
}

export function makeTask(input: Partial<Task> & Pick<Task, "boardId" | "columnId" | "title">): Task {
  const now = nowIso();
  return {
    id: uid(),
    description: "",
    notes: "",
    priority: "none",
    dueDate: null,
    dueTime: null,
    startDate: null,
    tagIds: [],
    subtasks: [],
    completed: false,
    completedAt: null,
    archived: false,
    archivedAt: null,
    order: 0,
    createdAt: now,
    updatedAt: now,
    ...input,
  };
}

export function makeSubtask(title: string): Subtask {
  return { id: uid(), title, completed: false, createdAt: nowIso(), completedAt: null };
}

export function makeTag(name: string, color: string): Tag {
  const now = nowIso();
  return { id: uid(), name, color, createdAt: now, updatedAt: now };
}
