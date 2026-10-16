/** Optional demo content offered to first-time users. Kept separate from application logic. */
import { makeBoard, makeColumn, makeSubtask, makeTag, makeTask } from "@/models/factory";
import type { Board, Column, Priority, Tag, Task } from "@/models/types";
import { addDaysKey, todayKey } from "./dates";
import { nowIso } from "./utils";

export function buildDemoData(boardOrder: number) {
  const board = makeBoard("Getting started", boardOrder);
  const cols = [
    makeColumn(board.id, "To Do", 0),
    makeColumn(board.id, "In Progress", 1),
    makeColumn(board.id, "Done", 2, true),
  ];
  const tags = [makeTag("Personal", "#33b679"), makeTag("Work", "#039be5"), makeTag("Ideas", "#8e24aa")];
  const [todo, doing, done] = cols;
  const [personal, work, ideas] = tags;
  const today = todayKey();

  const spec: {
    col: Column;
    title: string;
    description?: string;
    priority?: Priority;
    due?: number;
    time?: string;
    tags?: Tag[];
    subtasks?: [string, boolean][];
  }[] = [
    {
      col: todo,
      title: "Drag me to another list",
      description: "Grab any card and drop it into a different list — or reorder cards within a list.",
      tags: [ideas],
    },
    {
      col: todo,
      title: "Plan the week",
      description: "Open this task to edit its details, due date, labels and subtasks.",
      priority: "high",
      due: 0,
      time: "17:00",
      tags: [personal],
      subtasks: [
        ["Review calendar", true],
        ["Pick three priorities", false],
        ["Block focus time", false],
      ],
    },
    { col: todo, title: "Renew library books", priority: "urgent", due: -1, tags: [personal] },
    { col: todo, title: "Try the calendar view", description: "Switch views from the toolbar.", due: 3 },
    {
      col: doing,
      title: "Prepare project update",
      priority: "medium",
      due: 2,
      tags: [work],
      subtasks: [
        ["Collect metrics", true],
        ["Draft slides", false],
      ],
    },
    {
      col: doing,
      title: "Export a backup",
      description:
        "Your data lives only in this browser. Use Settings → Export data to save a JSON backup you can import anywhere.",
      priority: "low",
      due: 6,
    },
    { col: done, title: "Open Taskboard for the first time", tags: [ideas] },
  ];

  const tasks: Task[] = spec.map((s, i) => {
    const isDone = s.col.isDoneColumn;
    return makeTask({
      boardId: board.id,
      columnId: s.col.id,
      title: s.title,
      description: s.description ?? "",
      priority: s.priority ?? "none",
      dueDate: s.due === undefined ? null : addDaysKey(today, s.due),
      dueTime: s.time ?? null,
      tagIds: (s.tags ?? []).map((t) => t.id),
      subtasks: (s.subtasks ?? []).map(([title, completed]) => ({
        ...makeSubtask(title),
        completed,
        completedAt: completed ? nowIso() : null,
      })),
      completed: isDone,
      completedAt: isDone ? nowIso() : null,
      order: i,
    });
  });

  const rec = <T extends { id: string }>(items: T[]) => Object.fromEntries(items.map((x) => [x.id, x]));
  return {
    boards: rec<Board>([board]),
    columns: rec<Column>(cols),
    tasks: rec<Task>(tasks),
    tags: rec<Tag>(tags),
  };
}
