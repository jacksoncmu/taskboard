import * as React from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MeasuringStrategy,
  PointerSensor,
  TouchSensor,
  closestCenter,
  closestCorners,
  pointerWithin,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, horizontalListSortingStrategy, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { Columns3, SearchX } from "lucide-react";
import type { ID, Task } from "@/models/types";
import { actions } from "@/store/actions";
import { useAppData } from "@/store/store";
import { useUI } from "@/store/ui";
import { columnsOf } from "@/store/operations";
import { activeFilterCount, filterTasks } from "@/lib/taskQuery";
import { byOrder } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/layout/EmptyState";
import { AddColumn, BoardColumn } from "./Column";
import { TaskCardBody } from "./TaskCard";

type Items = Record<ID, ID[]>;

const COL = "col:";
const isColId = (id: unknown) => typeof id === "string" && id.startsWith(COL);

export function BoardView({ boardId }: { boardId: ID }) {
  const data = useAppData();
  const ui = useUI();
  const columns = columnsOf(data, boardId);
  const query = ui.search;
  const filtered = !!query.trim() || activeFilterCount(ui.filters) > 0 || !data.settings.showCompletedOnBoard;

  // Visible tasks per column, in manual order.
  const { baseItems, totals } = React.useMemo(() => {
    const byCol: Record<ID, Task[]> = {};
    const totals: Record<ID, number> = {};
    for (const c of columns) {
      byCol[c.id] = [];
      totals[c.id] = 0;
    }
    for (const t of Object.values(data.tasks)) {
      if (t.boardId !== boardId || t.archived || !byCol[t.columnId]) continue;
      totals[t.columnId]++;
      byCol[t.columnId].push(t);
    }
    const baseItems: Items = {};
    for (const c of columns) {
      let list = byCol[c.id].sort(byOrder);
      if (!data.settings.showCompletedOnBoard) list = list.filter((t) => !t.completed);
      list = filterTasks(list, data, query, ui.filters);
      baseItems[c.id] = list.map((t) => t.id);
    }
    return { baseItems, totals };
  }, [data.tasks, data.columns, data.tags, data.settings.showCompletedOnBoard, boardId, query, ui.filters]);

  const [dragItems, setDragItems] = React.useState<Items | null>(null);
  const [active, setActive] = React.useState<{ id: ID; type: "task" | "column" } | null>(null);
  const items = dragItems ?? baseItems;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      keyboardCodes: { start: ["Space"], cancel: ["Escape"], end: ["Space", "Enter"] },
    })
  );

  const findContainer = (id: ID): ID | undefined => {
    if (isColId(id)) return id.slice(COL.length);
    return Object.keys(items).find((c) => items[c].includes(id));
  };

  const collision: CollisionDetection = React.useCallback(
    (args) => {
      if (active?.type === "column") {
        return closestCenter({
          ...args,
          droppableContainers: args.droppableContainers.filter((c) => isColId(c.id)),
        });
      }
      const pointer = pointerWithin(args);
      if (pointer.length) {
        // Prefer a task under the pointer over its column.
        const task = pointer.find((c) => !isColId(c.id));
        if (task) return [task];
        const colHit = pointer[0];
        const colId = String(colHit.id).slice(COL.length);
        const inCol = args.droppableContainers.filter((c) => (items[colId] ?? []).includes(String(c.id)));
        if (inCol.length) {
          const nearest = closestCorners({ ...args, droppableContainers: inCol });
          if (nearest.length) return nearest;
        }
        return [colHit];
      }
      return closestCorners(args);
    },
    [active?.type, items]
  );

  const onDragStart = ({ active: a }: DragStartEvent) => {
    const type = a.data.current?.type === "column" ? "column" : "task";
    setActive({ id: String(a.id), type });
    if (type === "task") setDragItems(baseItems);
  };

  const onDragOver = ({ active: a, over }: DragOverEvent) => {
    if (!over || active?.type !== "task") return;
    const activeId = String(a.id);
    const overId = String(over.id);
    const from = findContainer(activeId);
    const to = findContainer(overId);
    if (!from || !to || from === to) return;
    setDragItems((prev) => {
      const cur = prev ?? baseItems;
      const fromList = cur[from].filter((id) => id !== activeId);
      const toList = [...cur[to]];
      let index = isColId(overId) ? toList.length : toList.indexOf(overId);
      if (index < 0) index = toList.length;
      // Drop below the hovered card when the pointer is past its middle.
      const translated = a.rect.current.translated;
      if (!isColId(overId) && translated && translated.top > over.rect.top + over.rect.height / 2) index += 1;
      toList.splice(index, 0, activeId);
      return { ...cur, [from]: fromList, [to]: toList };
    });
  };

  const onDragEnd = ({ active: a, over }: DragEndEvent) => {
    const kind = active?.type;
    setActive(null);
    if (!over) {
      setDragItems(null);
      return;
    }
    if (kind === "column") {
      const ids = columns.map((c) => c.id);
      const from = ids.indexOf(String(a.id).slice(COL.length));
      const to = ids.indexOf(String(over.id).slice(COL.length));
      if (from !== -1 && to !== -1 && from !== to) actions.reorderColumns(boardId, arrayMove(ids, from, to));
      return;
    }
    const activeId = String(a.id);
    const overId = String(over.id);
    const container = findContainer(activeId);
    if (!container) {
      setDragItems(null);
      return;
    }
    let list = items[container];
    if (!isColId(overId) && list.includes(overId)) {
      const oldIndex = list.indexOf(activeId);
      const newIndex = list.indexOf(overId);
      if (oldIndex !== newIndex) list = arrayMove(list, oldIndex, newIndex);
    }
    const index = list.indexOf(activeId);
    const beforeId = list[index + 1] ?? null;
    const task = data.tasks[activeId];
    const unchanged =
      task && task.columnId === container && baseItems[container][baseItems[container].indexOf(activeId) + 1] === (beforeId ?? undefined);
    if (!unchanged) actions.moveTask(activeId, container, beforeId);
    setDragItems(null);
  };

  const moveColumn = (index: number, dir: -1 | 1) => {
    const ids = columns.map((c) => c.id);
    const to = index + dir;
    if (to < 0 || to >= ids.length) return;
    actions.reorderColumns(boardId, arrayMove(ids, index, to));
  };

  const tagsById = data.tags;
  const visibleCount = Object.values(items).reduce((n, l) => n + l.length, 0);
  const totalCount = Object.values(totals).reduce((n, c) => n + c, 0);

  if (columns.length === 0) {
    return (
      <EmptyState
        icon={Columns3}
        title="This board has no lists yet"
        description="Lists are the columns of your board — for example To Do, In Progress and Done."
      >
        <AddColumn boardId={boardId} />
      </EmptyState>
    );
  }

  const activeTask = active?.type === "task" ? data.tasks[active.id] : null;
  const activeColumn = active?.type === "column" ? data.columns[active.id.slice(COL.length)] : null;
  const otherMatches =
    query.trim() && visibleCount === 0
      ? filterTasks(
          Object.values(data.tasks).filter((t) => t.boardId !== boardId && !t.archived),
          data,
          query,
          ui.filters
        ).length
      : 0;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {filtered && visibleCount === 0 && totalCount > 0 && (
        <div className="mx-4 mb-2 flex flex-wrap items-center gap-3 rounded-xl bg-surface-2 px-4 py-2.5 text-sm text-muted-foreground sm:mx-6">
          <SearchX className="size-4" />
          <span>No tasks on this board match your search or filters.</span>
          {otherMatches > 0 && (
            <Button
              variant="text"
              size="sm"
              onClick={() => {
                ui.setScope("all");
                ui.setView("list");
              }}
            >
              Show {otherMatches} on other boards
            </Button>
          )}
          <Button
            variant="text"
            size="sm"
            onClick={() => {
              ui.setSearch("");
              ui.clearFilters();
            }}
          >
            Clear search & filters
          </Button>
        </div>
      )}
      <DndContext
        sensors={sensors}
        collisionDetection={collision}
        measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={() => {
          setActive(null);
          setDragItems(null);
        }}
        accessibility={{
          screenReaderInstructions: {
            draggable:
              "To pick up a task or list, press space. Use the arrow keys to move it, then press space again to drop, or escape to cancel.",
          },
        }}
      >
        <div className="flex min-h-0 flex-1 snap-x items-start gap-3 overflow-x-auto px-4 pb-4 scrollbar-thin sm:px-6">
          <SortableContext items={columns.map((c) => COL + c.id)} strategy={horizontalListSortingStrategy}>
            {columns.map((c, i) => (
              <BoardColumn
                key={c.id}
                column={c}
                index={i}
                columnCount={columns.length}
                tasks={(items[c.id] ?? []).map((id) => data.tasks[id]).filter(Boolean)}
                totalCount={totals[c.id] ?? 0}
                tagsById={tagsById}
                onMove={(dir) => moveColumn(i, dir)}
                filtered={filtered}
              />
            ))}
          </SortableContext>
          <div className="shrink-0">
            <AddColumn boardId={boardId} />
          </div>
        </div>
        <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.2, 0, 0, 1)" }}>
          {activeTask ? (
            <div className="w-[85vw] sm:w-[284px]">
              <TaskCardBody
                task={activeTask}
                tags={activeTask.tagIds.map((id) => tagsById[id]).filter(Boolean)}
                overlay
              />
            </div>
          ) : activeColumn ? (
            <div className="w-[85vw] rotate-1 rounded-2xl bg-surface-2 p-3 shadow-g3 sm:w-[300px]">
              <p className="text-sm font-medium">{activeColumn.name}</p>
              <p className="text-xs text-muted-foreground">{totals[activeColumn.id] ?? 0} tasks</p>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
