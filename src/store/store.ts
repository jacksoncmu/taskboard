/**
 * Application state container. Holds AppData in memory, notifies React subscribers, and persists
 * every change to IndexedDB (diffed by object identity, written in a single transaction).
 */
import { useSyncExternalStore } from "react";
import type { AppData } from "@/models/types";
import { openDatabase, loadAll, persistDiff, replaceAll, type Database } from "@/storage/db";
import { emptyData } from "@/storage/schema";

export type StoreStatus = "loading" | "ready";

interface StoreState {
  data: AppData;
  status: StoreStatus;
  /** True when IndexedDB could not be opened; changes then live only in memory. */
  memoryOnly: boolean;
  storageError: string | null;
  /** True when the database held no data at startup. */
  firstRun: boolean;
}

type Listener = () => void;
type ErrorHandler = (message: string) => void;

const CHANNEL = "taskboard-sync";

class Store {
  private state: StoreState = {
    data: emptyData(),
    status: "loading",
    memoryOnly: false,
    storageError: null,
    firstRun: false,
  };
  private listeners = new Set<Listener>();
  private db: Database | null = null;
  private persisted: AppData = this.state.data;
  private flushScheduled = false;
  private writing: Promise<void> = Promise.resolve();
  private channel: BroadcastChannel | null = null;
  private onError: ErrorHandler = (m) => console.error(m);

  getState = () => this.state;

  subscribe = (l: Listener) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };

  setErrorHandler(fn: ErrorHandler) {
    this.onError = fn;
  }

  private setState(patch: Partial<StoreState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((l) => l());
  }

  async init(): Promise<void> {
    try {
      this.db = await openDatabase();
      const { data, isEmpty } = await loadAll(this.db);
      this.persisted = data;
      this.setState({ data, status: "ready", firstRun: isEmpty });
      this.setupSync();
    } catch (e) {
      console.error(e);
      const message = e instanceof Error ? e.message : String(e);
      this.db = null;
      this.setState({
        status: "ready",
        memoryOnly: true,
        firstRun: true,
        storageError: `Local storage is unavailable (${message}). Changes will be lost when you close this tab — export a backup to keep them.`,
      });
    }
  }

  /** Applies an update. The function must return a new AppData (or the same one for no-op). */
  update = (fn: (data: AppData) => AppData): AppData => {
    const next = fn(this.state.data);
    if (next !== this.state.data) {
      this.setState({ data: next });
      this.scheduleFlush();
    }
    return next;
  };

  /** Replaces all data atomically (used by import / clear). Resolves after it is stored. */
  async replace(data: AppData): Promise<void> {
    await this.writing;
    if (this.db) {
      await replaceAll(this.db, data); // throws before touching memory if the write fails
      this.persisted = data;
      this.channel?.postMessage("changed");
    }
    this.setState({ data });
  }

  private scheduleFlush() {
    if (this.flushScheduled || !this.db) return;
    this.flushScheduled = true;
    queueMicrotask(() => {
      this.flushScheduled = false;
      this.writing = this.writing.then(() => this.flush());
    });
  }

  private async flush() {
    if (!this.db) return;
    const next = this.state.data;
    const prev = this.persisted;
    if (next === prev) return;
    try {
      await persistDiff(this.db, prev, next);
      this.persisted = next;
      this.channel?.postMessage("changed");
      if (this.state.storageError) this.setState({ storageError: null });
    } catch (e) {
      console.error(e);
      const message = e instanceof Error ? e.message : String(e);
      this.setState({ storageError: `Could not save changes: ${message}` });
      this.onError("Could not save your latest change. It will be retried with your next edit.");
    }
  }

  /** Keeps multiple open tabs in sync: reload from the database when another tab writes. */
  private setupSync() {
    if (typeof BroadcastChannel === "undefined") return;
    this.channel = new BroadcastChannel(CHANNEL);
    this.channel.onmessage = async () => {
      if (!this.db) return;
      await this.writing;
      if (this.state.data !== this.persisted) return; // local edits pending; ours win
      try {
        const { data } = await loadAll(this.db);
        this.persisted = data;
        this.setState({ data });
      } catch (e) {
        console.error(e);
      }
    };
  }
}

export const store = new Store();

export function useStore(): StoreState {
  return useSyncExternalStore(store.subscribe, store.getState);
}

export function useAppData(): AppData {
  return useSyncExternalStore(store.subscribe, () => store.getState().data);
}
