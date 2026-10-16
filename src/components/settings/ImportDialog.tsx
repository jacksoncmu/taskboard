import * as React from "react";
import { toast } from "sonner";
import { AlertTriangle, FileJson, Upload } from "lucide-react";
import { useAppData } from "@/store/store";
import { useUI } from "@/store/ui";
import { actions } from "@/store/actions";
import { mergeImport, parseBackup, replaceWithImport, type ParseResult } from "@/storage/backup";
import { formatTimestamp } from "@/lib/dates";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn, pluralize } from "@/lib/utils";

type Mode = "merge" | "replace";

const MAX_BYTES = 50 * 1024 * 1024;

export function ImportDialog() {
  const ui = useUI();
  return (
    <Dialog open={ui.importOpen} onOpenChange={ui.setImportOpen}>
      {ui.importOpen && (
        <DialogContent className="max-w-lg">
          <ImportFlow onDone={() => ui.setImportOpen(false)} />
        </DialogContent>
      )}
    </Dialog>
  );
}

function ImportFlow({ onDone }: { onDone: () => void }) {
  const data = useAppData();
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<ParseResult | null>(null);
  const [mode, setMode] = React.useState<Mode>("merge");
  const [confirmReplace, setConfirmReplace] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [dragOver, setDragOver] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const readFile = async (file: File) => {
    setFileName(file.name);
    setConfirmReplace(false);
    if (file.size > MAX_BYTES) {
      setResult({ ok: false, error: "This file is too large to be a Taskboard backup." });
      return;
    }
    try {
      setResult(parseBackup(await file.text()));
    } catch {
      setResult({ ok: false, error: "The file could not be read." });
    }
  };

  const currentTasks = Object.keys(data.tasks).length;
  const currentBoards = Object.keys(data.boards).length;

  const run = async () => {
    if (!result?.ok) return;
    if (mode === "replace" && !confirmReplace) return;
    setBusy(true);
    try {
      if (mode === "replace") {
        await actions.replaceAll(replaceWithImport(data, result.data));
        toast.success(`Imported ${pluralize(result.summary.tasks, "task")}. Existing data was replaced.`);
      } else {
        const merged = mergeImport(data, result.data);
        await actions.replaceAll(merged.data);
        toast.success(
          merged.added || merged.updated
            ? `Merged backup: ${merged.added} items added, ${merged.updated} updated.`
            : "Everything in this backup is already here — nothing to merge."
        );
      }
      onDone();
    } catch (e) {
      console.error(e);
      toast.error("Import failed. Your existing data was not changed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Import data</DialogTitle>
        <DialogDescription>Restore a Taskboard backup (.json) exported from this or another computer.</DialogDescription>
      </DialogHeader>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files[0];
          if (f) readFile(f);
        }}
        className={cn(
          "flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-4 py-6 text-center transition-colors",
          dragOver ? "border-primary bg-accent" : "border-border-strong"
        )}
      >
        <FileJson className="size-8 text-primary" />
        <p className="text-sm text-muted-foreground">{fileName ?? "Drop a backup file here, or"}</p>
        <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
          <Upload /> {fileName ? "Choose another file" : "Choose file"}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) readFile(f);
            e.target.value = "";
          }}
        />
      </div>

      {result && !result.ok && (
        <div className="flex gap-3 rounded-xl bg-destructive-container p-3 text-sm text-foreground" role="alert">
          <AlertTriangle className="size-5 shrink-0 text-destructive" />
          <div>
            <p className="font-medium">This file can’t be imported</p>
            <p className="text-muted-foreground">{result.error} Your existing data has not been changed.</p>
          </div>
        </div>
      )}

      {result?.ok && (
        <>
          <div className="rounded-xl bg-surface-2 p-4">
            <p className="text-sm font-medium">Backup preview</p>
            <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
              {[
                ["Boards", result.summary.boards],
                ["Tasks", result.summary.tasks],
                ["Labels", result.summary.tags],
              ].map(([label, n]) => (
                <div key={label} className="rounded-lg bg-surface p-2">
                  <dd className="text-2xl">{n}</dd>
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-xs text-muted-foreground">
              {result.summary.columns} lists · {result.summary.completedTasks} completed tasks · exported{" "}
              {formatTimestamp(result.summary.exportedAt)} · schema v{result.summary.schemaVersion}
            </p>
          </div>

          <div className="grid gap-2" role="radiogroup" aria-label="Import mode">
            {(
              [
                [
                  "merge",
                  "Merge with existing data",
                  "Adds boards, tasks and labels from the backup. Items that already exist are updated to the newer version; conflicting IDs are re-assigned safely.",
                ],
                [
                  "replace",
                  "Replace all existing data",
                  `Deletes your current ${pluralize(currentBoards, "board")} and ${pluralize(currentTasks, "task")}, then loads the backup.`,
                ],
              ] as [Mode, string, string][]
            ).map(([value, label, desc]) => (
              <button
                key={value}
                role="radio"
                aria-checked={mode === value}
                onClick={() => {
                  setMode(value);
                  setConfirmReplace(false);
                }}
                className={cn(
                  "flex items-start gap-3 rounded-xl border p-3 text-left transition-colors",
                  mode === value ? "border-primary bg-accent" : "border-border-strong hover:bg-hover"
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2",
                    mode === value ? "border-primary" : "border-muted-foreground"
                  )}
                >
                  {mode === value && <span className="size-2.5 rounded-full bg-primary" />}
                </span>
                <span>
                  <span className="block text-sm font-medium">{label}</span>
                  <span className="block text-xs leading-relaxed text-muted-foreground">{desc}</span>
                </span>
              </button>
            ))}
          </div>

          {mode === "replace" && (
            <label className="flex items-start gap-3 rounded-xl bg-destructive-container p-3 text-sm">
              <input
                type="checkbox"
                checked={confirmReplace}
                onChange={(e) => setConfirmReplace(e.target.checked)}
                className="mt-0.5 size-4 accent-[var(--destructive)]"
              />
              <span>
                I understand that all current data in this browser will be permanently replaced. Consider exporting a
                backup first.
              </span>
            </label>
          )}
        </>
      )}

      <DialogFooter>
        <Button variant="text" onClick={onDone}>
          Cancel
        </Button>
        <Button
          variant={mode === "replace" ? "destructive" : "filled"}
          disabled={!result?.ok || busy || (mode === "replace" && !confirmReplace)}
          onClick={run}
        >
          {busy ? "Importing…" : mode === "replace" ? "Replace data" : "Merge data"}
        </Button>
      </DialogFooter>
    </>
  );
}
