import * as React from "react";
import { toast } from "sonner";
import { HardDriveDownload, HardDriveUpload, Info, Monitor, Moon, ShieldCheck, Sun, Trash2 } from "lucide-react";
import type { ThemePreference } from "@/models/types";
import { useAppData, useStore } from "@/store/store";
import { useUI } from "@/store/ui";
import { actions } from "@/store/actions";
import { downloadBackup } from "@/storage/backup";
import { emptyData } from "@/storage/schema";
import { formatTimestamp } from "@/lib/dates";
import { cn, pluralize } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/misc";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/misc";
import { ColorSwatches } from "@/components/task/TagPicker";

type Tab = "general" | "labels" | "data";

export function SettingsDialog() {
  const ui = useUI();
  const [tab, setTab] = React.useState<Tab>("general");
  return (
    <Dialog open={ui.settingsOpen} onOpenChange={ui.setSettingsOpen}>
      <DialogContent className="max-w-2xl gap-0 p-0">
        <DialogHeader className="px-6 pb-2 pt-6">
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription className="sr-only">Appearance, labels and data management</DialogDescription>
        </DialogHeader>
        <div className="flex gap-1 border-b px-4" role="tablist">
          {(
            [
              ["general", "General"],
              ["labels", "Labels"],
              ["data", "Data & backup"],
            ] as [Tab, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              role="tab"
              aria-selected={tab === value}
              onClick={() => setTab(value)}
              className={cn(
                "relative px-4 py-3 text-sm font-medium transition-colors",
                tab === value ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
              {tab === value && <span className="absolute inset-x-2 bottom-0 h-[3px] rounded-t-full bg-primary" />}
            </button>
          ))}
        </div>
        <div className="max-h-[60vh] overflow-y-auto px-6 py-5 scrollbar-thin">
          {tab === "general" && <GeneralTab />}
          {tab === "labels" && <LabelsTab />}
          {tab === "data" && <DataTab />}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SettingRow({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <p className="text-sm font-medium">{title}</p>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function GeneralTab() {
  const data = useAppData();
  const s = data.settings;
  const themes: [ThemePreference, string, React.ElementType][] = [
    ["light", "Light", Sun],
    ["dark", "Dark", Moon],
    ["system", "System", Monitor],
  ];
  return (
    <div className="divide-y">
      <SettingRow title="Theme" description="Saved in this browser.">
        <div className="flex rounded-full border border-border-strong p-0.5" role="radiogroup" aria-label="Theme">
          {themes.map(([value, label, Icon]) => (
            <button
              key={value}
              role="radio"
              aria-checked={s.theme === value}
              onClick={() => actions.updateSettings({ theme: value })}
              className={cn(
                "flex h-8 items-center gap-1.5 rounded-full px-3 text-sm transition-colors",
                s.theme === value ? "bg-primary-container font-medium text-on-primary-container" : "text-muted-foreground hover:bg-hover"
              )}
            >
              <Icon className="size-4" /> {label}
            </button>
          ))}
        </div>
      </SettingRow>
      <SettingRow title="Show completed tasks on boards" description="Hide them to keep boards focused on open work.">
        <Switch
          checked={s.showCompletedOnBoard}
          onCheckedChange={(c) => actions.updateSettings({ showCompletedOnBoard: c })}
          aria-label="Show completed tasks on boards"
        />
      </SettingRow>
      <SettingRow title="Completion list" description="Moving a task into a board's completion list marks it complete.">
        <span className="text-xs text-muted-foreground">Set from each list's ⋮ menu</span>
      </SettingRow>
    </div>
  );
}

function LabelsTab() {
  const data = useAppData();
  const ui = useUI();
  const tags = Object.values(data.tags).sort((a, b) => a.name.localeCompare(b.name));
  const usage = React.useMemo(() => {
    const m: Record<string, number> = {};
    for (const t of Object.values(data.tasks)) for (const id of t.tagIds) m[id] = (m[id] ?? 0) + 1;
    return m;
  }, [data.tasks]);

  if (!tags.length) {
    return <p className="py-6 text-center text-sm text-muted-foreground">No labels yet. Add labels from a task’s details.</p>;
  }
  return (
    <ul className="divide-y">
      {tags.map((t) => (
        <li key={t.id} className="flex items-center gap-3 py-2">
          <Popover>
            <PopoverTrigger asChild>
              <button
                className="size-6 shrink-0 rounded-full ring-offset-2 ring-offset-popover hover:ring-2"
                style={{ background: t.color, ["--tw-ring-color" as string]: t.color }}
                aria-label={`Change color of ${t.name}`}
              />
            </PopoverTrigger>
            <PopoverContent className="w-auto">
              <ColorSwatches value={t.color} onChange={(color) => actions.updateTag(t.id, { color })} />
            </PopoverContent>
          </Popover>
          <input
            defaultValue={t.name}
            aria-label="Label name"
            onBlur={(e) => actions.updateTag(t.id, { name: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            className="h-9 min-w-0 flex-1 rounded-lg bg-transparent px-2 text-sm outline-none hover:bg-hover focus:bg-surface-2 focus:ring-1 focus:ring-primary"
          />
          <span className="text-xs text-muted-foreground">{pluralize(usage[t.id] ?? 0, "task")}</span>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Delete label ${t.name}`}
            onClick={async () => {
              const ok = await ui.confirm({
                title: `Delete label "${t.name}"?`,
                description: `It will be removed from ${pluralize(usage[t.id] ?? 0, "task")}. Tasks themselves are not deleted.`,
                actionLabel: "Delete",
                destructive: true,
              });
              if (ok) actions.deleteTag(t.id);
            }}
          >
            <Trash2 />
          </Button>
        </li>
      ))}
    </ul>
  );
}

function DataTab() {
  const data = useAppData();
  const { memoryOnly } = useStore();
  const ui = useUI();
  const [persisted, setPersisted] = React.useState<boolean | null>(null);
  const [usage, setUsage] = React.useState<string | null>(null);

  React.useEffect(() => {
    navigator.storage?.persisted?.().then(setPersisted).catch(() => setPersisted(null));
    navigator.storage
      ?.estimate?.()
      .then((e) => e.usage !== undefined && setUsage(`${(e.usage / 1024).toFixed(0)} KB used`))
      .catch(() => undefined);
  }, []);

  const exportData = () => {
    const name = downloadBackup(data);
    actions.updateSettings({ lastExportAt: new Date().toISOString() });
    toast.success(`Backup saved as ${name}`);
  };

  const counts = {
    boards: Object.keys(data.boards).length,
    tasks: Object.keys(data.tasks).length,
    tags: Object.keys(data.tags).length,
  };

  return (
    <div className="space-y-5">
      <div className="flex gap-3 rounded-2xl bg-[#fef7e0] p-4 text-sm text-[#3c2f00] dark:bg-[#3d3200] dark:text-[#fde293]">
        <Info className="mt-0.5 size-5 shrink-0" />
        <div className="space-y-1 leading-relaxed">
          <p className="font-medium">Your data lives only in this browser</p>
          <p>
            Nothing is sent to a server. Clearing site data, using private browsing, or switching browsers or computers
            means your tasks won’t be there. Export a backup regularly — you can import it anywhere.
          </p>
          {memoryOnly && <p className="font-medium">Storage is currently unavailable — changes will not be saved.</p>}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border p-4">
          <HardDriveDownload className="size-6 text-primary" />
          <p className="mt-2 font-medium">Export data</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Download {pluralize(counts.boards, "board")}, {pluralize(counts.tasks, "task")} and{" "}
            {pluralize(counts.tags, "label")} as a JSON file.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Last export: {data.settings.lastExportAt ? formatTimestamp(data.settings.lastExportAt) : "never"}
          </p>
          <Button className="mt-3" onClick={exportData}>
            Export data
          </Button>
        </div>
        <div className="rounded-2xl border p-4">
          <HardDriveUpload className="size-6 text-primary" />
          <p className="mt-2 font-medium">Import data</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Restore a backup file. You’ll see a preview and can choose to merge or replace.
          </p>
          <Button
            className="mt-3"
            variant="outline"
            onClick={() => {
              ui.setSettingsOpen(false);
              ui.setImportOpen(true);
            }}
          >
            Import data…
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-2xl border p-4">
        <div className="flex gap-3">
          <ShieldCheck className="size-5 shrink-0 text-success" />
          <div>
            <p className="text-sm font-medium">Persistent storage</p>
            <p className="text-xs text-muted-foreground">
              {persisted
                ? "Granted — the browser won’t clear your data automatically."
                : "Ask the browser not to evict your data when space runs low."}
              {usage && ` · ${usage}`}
            </p>
          </div>
        </div>
        {!persisted && navigator.storage?.persist && (
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              const ok = await navigator.storage.persist();
              setPersisted(ok);
              if (ok) toast.success("Persistent storage granted");
              else toast("The browser declined. Exporting backups is the safest option.");
            }}
          >
            Request
          </Button>
        )}
      </div>

      <div className="flex items-center justify-between gap-4 rounded-2xl border border-destructive/40 p-4">
        <div>
          <p className="text-sm font-medium text-destructive">Delete all data</p>
          <p className="text-xs text-muted-foreground">Removes every board, task and label from this browser.</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="border-destructive text-destructive hover:bg-destructive-container"
          onClick={async () => {
            const ok = await ui.confirm({
              title: "Delete all data?",
              description:
                "Every board, list, task and label stored in this browser will be permanently deleted. This cannot be undone — export a backup first if you might need it.",
              actionLabel: "Delete everything",
              destructive: true,
            });
            if (!ok) return;
            try {
              const empty = emptyData();
              await actions.replaceAll({ ...empty, settings: { ...empty.settings, theme: data.settings.theme, onboarded: true } });
              toast.success("All data deleted");
              ui.setSettingsOpen(false);
            } catch {
              toast.error("Could not delete data.");
            }
          }}
        >
          <Trash2 /> Delete all
        </Button>
      </div>
    </div>
  );
}
