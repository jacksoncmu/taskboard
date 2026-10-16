import * as React from "react";
import { Sparkles, SquareDashed } from "lucide-react";
import { actions } from "@/store/actions";
import { useStore } from "@/store/store";
import { useUI } from "@/store/ui";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/layout/Logo";

export function ConfirmDialog() {
  const ui = useUI();
  const c = ui.confirmState;
  const finish = (ok: boolean) => {
    c?.resolve(ok);
    ui.closeConfirm();
  };
  return (
    <AlertDialog open={!!c} onOpenChange={(o) => !o && finish(false)}>
      {c && (
        <AlertDialogContent>
          <AlertDialogTitle>{c.title}</AlertDialogTitle>
          <AlertDialogDescription>{c.description}</AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => finish(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction destructive={c.destructive} onClick={() => finish(true)}>
              {c.actionLabel ?? "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      )}
    </AlertDialog>
  );
}

export function NewBoardDialog() {
  const ui = useUI();
  const [name, setName] = React.useState("");
  const close = () => {
    ui.setNewBoardOpen(false);
    setName("");
  };
  return (
    <Dialog open={ui.newBoardOpen} onOpenChange={(o) => (o ? ui.setNewBoardOpen(true) : close())}>
      <DialogContent className="max-w-md">
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            const id = actions.addBoard(name);
            ui.openBoard(id);
            ui.setView("board");
            close();
          }}
        >
          <DialogHeader>
            <DialogTitle>New board</DialogTitle>
            <DialogDescription>Starts with To Do, In Progress and Done lists — rename or add lists anytime.</DialogDescription>
          </DialogHeader>
          <Input autoFocus placeholder="Board name" aria-label="Board name" value={name} onChange={(e) => setName(e.target.value)} />
          <DialogFooter>
            <Button variant="text" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim()}>
              Create board
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const SHORTCUTS: [string[], string][] = [
  [["C"], "Create a task"],
  [["/"], "Search"],
  [["B"], "New board"],
  [["1"], "Board view"],
  [["2"], "List view"],
  [["3"], "Calendar view"],
  [["T"], "Go to Today"],
  [["Enter"], "Open focused task / save field"],
  [["Ctrl", "Enter"], "Save multi-line field"],
  [["Space"], "Pick up / drop focused card (then arrow keys)"],
  [["Double-click"], "Rename a card inline"],
  [["Esc"], "Close dialog or panel"],
  [["?"], "Show this help"],
];

export function ShortcutsDialog() {
  const ui = useUI();
  return (
    <Dialog open={ui.shortcutsOpen} onOpenChange={ui.setShortcutsOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription className="sr-only">List of keyboard shortcuts</DialogDescription>
        </DialogHeader>
        <ul className="divide-y">
          {SHORTCUTS.map(([keys, label]) => (
            <li key={label} className="flex items-center justify-between py-2 text-sm">
              <span>{label}</span>
              <span className="flex gap-1">
                {keys.map((k) => (
                  <kbd key={k} className="rounded-md border border-border-strong bg-surface-2 px-2 py-0.5 text-xs">
                    {k}
                  </kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

/** First-run choice: start with a small demo board or an empty board. */
export function OnboardingDialog() {
  const { data, firstRun, status } = useStore();
  const ui = useUI();
  const open = status === "ready" && firstRun && !data.settings.onboarded;
  return (
    <Dialog open={open}>
      <DialogContent hideClose className="max-w-lg" onEscapeKeyDown={(e) => e.preventDefault()} onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader className="items-start">
          <Logo />
          <DialogTitle className="pt-4">Welcome to Taskboard</DialogTitle>
          <DialogDescription className="leading-relaxed">
            A private, offline-first task board. Everything you create stays in this browser — no account, no servers.
            Remember to export backups from Settings.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            autoFocus
            onClick={() => {
              actions.loadDemo();
              ui.setView("board");
            }}
            className="rounded-2xl border border-border-strong p-4 text-left transition-colors hover:border-primary hover:bg-accent"
          >
            <Sparkles className="size-6 text-primary" />
            <p className="mt-2 font-medium">Start with a demo</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              A small sample board showing labels, subtasks and due dates. Delete it anytime.
            </p>
          </button>
          <button
            onClick={() => {
              const id = actions.addBoard("My tasks");
              actions.updateSettings({ onboarded: true, lastBoardId: id });
              ui.setView("board");
            }}
            className="rounded-2xl border border-border-strong p-4 text-left transition-colors hover:border-primary hover:bg-accent"
          >
            <SquareDashed className="size-6 text-primary" />
            <p className="mt-2 font-medium">Start empty</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              One empty board with To Do, In Progress and Done lists.
            </p>
          </button>
        </div>
        <button
          className="justify-self-start text-sm font-medium text-primary hover:underline"
          onClick={() => {
            actions.updateSettings({ onboarded: true });
            ui.setImportOpen(true);
          }}
        >
          Restore from a backup instead
        </button>
      </DialogContent>
    </Dialog>
  );
}
