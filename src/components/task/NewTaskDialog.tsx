import * as React from "react";
import { toast } from "sonner";
import { Flag } from "lucide-react";
import { PRIORITIES } from "@/models/constants";
import type { ID, Priority } from "@/models/types";
import { actions } from "@/store/actions";
import { useAppData } from "@/store/store";
import { useCurrentBoardId, useUI } from "@/store/ui";
import { boardsSorted, columnsOf } from "@/store/operations";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/misc";
import { TagPicker } from "./TagPicker";
import { TagChip } from "./TaskBits";

export function NewTaskDialog() {
  const ui = useUI();
  return (
    <Dialog open={!!ui.newTask} onOpenChange={(o) => !o && ui.closeNewTask()}>
      {ui.newTask && (
        <DialogContent className="max-w-xl">
          <NewTaskForm key={JSON.stringify(ui.newTask)} />
        </DialogContent>
      )}
    </Dialog>
  );
}

function NewTaskForm() {
  const ui = useUI();
  const data = useAppData();
  const currentBoardId = useCurrentBoardId();
  const defaults = ui.newTask ?? {};
  const boards = boardsSorted(data);
  const [boardId, setBoardId] = React.useState<ID>(defaults.boardId ?? currentBoardId ?? boards[0]?.id ?? "");
  const columns = columnsOf(data, boardId);
  const [columnId, setColumnId] = React.useState<ID>(
    defaults.columnId ?? columns.find((c) => !c.isDoneColumn)?.id ?? columns[0]?.id ?? ""
  );
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [dueDate, setDueDate] = React.useState(defaults.dueDate ?? "");
  const [dueTime, setDueTime] = React.useState("");
  const [priority, setPriority] = React.useState<Priority>("none");
  const [tagIds, setTagIds] = React.useState<ID[]>([]);
  const validColumn = columns.some((c) => c.id === columnId) ? columnId : columns[0]?.id;

  if (!boards.length) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>Create a board first</DialogTitle>
          <DialogDescription>Tasks live in boards. Create your first board to start adding tasks.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            onClick={() => {
              ui.closeNewTask();
              ui.setNewBoardOpen(true);
            }}
          >
            New board
          </Button>
        </DialogFooter>
      </>
    );
  }

  const submit = (another = false) => {
    if (!title.trim() || !validColumn) return;
    actions.addTask({
      boardId,
      columnId: validColumn,
      title,
      description,
      dueDate: dueDate || null,
      dueTime: dueDate && dueTime ? dueTime : null,
      priority,
      tagIds,
    });
    toast.success("Task created");
    if (another) {
      setTitle("");
      setDescription("");
    } else ui.closeNewTask();
  };

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <DialogHeader>
        <DialogTitle>New task</DialogTitle>
        <DialogDescription>Press Enter to create, Esc to cancel.</DialogDescription>
      </DialogHeader>
      <Input
        autoFocus
        placeholder="Title"
        aria-label="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="h-12 text-base"
      />
      <Textarea
        placeholder="Description (optional)"
        aria-label="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            submit();
          }
        }}
        rows={3}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="nt-board">Board</Label>
          <NativeSelect
            id="nt-board"
            value={boardId}
            onChange={(e) => {
              setBoardId(e.target.value);
              const cols = columnsOf(data, e.target.value);
              setColumnId(cols.find((c) => !c.isDoneColumn)?.id ?? cols[0]?.id ?? "");
            }}
          >
            {boards.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="nt-col">List</Label>
          <NativeSelect id="nt-col" value={validColumn} onChange={(e) => setColumnId(e.target.value)}>
            {columns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="nt-due">Due date</Label>
          <div className="flex gap-2">
            <Input id="nt-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="h-9" />
            <Input
              type="time"
              aria-label="Due time"
              disabled={!dueDate}
              value={dueTime}
              onChange={(e) => setDueTime(e.target.value)}
              className="h-9 w-32"
            />
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="nt-pri">Priority</Label>
          <NativeSelect id="nt-pri" value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
            {[...PRIORITIES].reverse().map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {priority !== "none" && (
          <Flag className="mr-1 size-4" style={{ color: PRIORITIES.find((p) => p.value === priority)!.color }} />
        )}
        {tagIds.map((id) =>
          data.tags[id] ? (
            <TagChip key={id} tag={data.tags[id]} onRemove={() => setTagIds(tagIds.filter((x) => x !== id))} />
          ) : null
        )}
        <TagPicker selected={tagIds} onChange={setTagIds} />
      </div>
      <DialogFooter>
        <Button variant="text" onClick={() => submit(true)} disabled={!title.trim()}>
          Create &amp; add another
        </Button>
        <Button type="submit" disabled={!title.trim()}>
          Create
        </Button>
      </DialogFooter>
    </form>
  );
}
