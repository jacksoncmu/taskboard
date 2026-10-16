import { addDays, differenceInCalendarDays, format, isValid, parse, parseISO, startOfDay } from "date-fns";
import type { Task } from "@/models/types";

export const DATE_FMT = "yyyy-MM-dd";

export function toDateKey(d: Date): string {
  return format(d, DATE_FMT);
}

export function todayKey(): string {
  return toDateKey(new Date());
}

export function parseDateKey(key: string): Date {
  return parse(key, DATE_FMT, new Date());
}

export function isValidDateKey(key: unknown): key is string {
  return typeof key === "string" && /^\d{4}-\d{2}-\d{2}$/.test(key) && isValid(parseDateKey(key));
}

export function isValidTime(t: unknown): t is string {
  return typeof t === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
}

/** Days from today to the due date (negative = overdue). Null when no due date. */
export function daysUntilDue(task: Pick<Task, "dueDate">, today = new Date()): number | null {
  if (!task.dueDate) return null;
  return differenceInCalendarDays(parseDateKey(task.dueDate), startOfDay(today));
}

/** A task is overdue when incomplete and its due date (and time, when set) has passed. */
export function isOverdue(task: Pick<Task, "dueDate" | "dueTime" | "completed">, now = new Date()): boolean {
  if (task.completed || !task.dueDate) return false;
  const days = daysUntilDue(task, now)!;
  if (days < 0) return true;
  if (days === 0 && task.dueTime) {
    const [h, m] = task.dueTime.split(":").map(Number);
    const due = parseDateKey(task.dueDate);
    due.setHours(h, m, 0, 0);
    return due.getTime() < now.getTime();
  }
  return false;
}

export function formatTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return format(d, "h:mm a");
}

/** Human friendly due label: "Today", "Tomorrow", "Yesterday", "Friday", "Mar 4", "Mar 4, 2027". */
export function formatDueLabel(task: Pick<Task, "dueDate" | "dueTime">, now = new Date()): string {
  if (!task.dueDate) return "";
  const date = parseDateKey(task.dueDate);
  const days = differenceInCalendarDays(date, startOfDay(now));
  let label: string;
  if (days === 0) label = "Today";
  else if (days === 1) label = "Tomorrow";
  else if (days === -1) label = "Yesterday";
  else if (days > 1 && days < 7) label = format(date, "EEEE");
  else if (date.getFullYear() === now.getFullYear()) label = format(date, "MMM d");
  else label = format(date, "MMM d, yyyy");
  if (task.dueTime) label += `, ${formatTime(task.dueTime)}`;
  return label;
}

export function formatDayHeading(key: string, now = new Date()): string {
  const date = parseDateKey(key);
  const days = differenceInCalendarDays(date, startOfDay(now));
  if (days === 0) return `Today · ${format(date, "EEE, MMM d")}`;
  if (days === 1) return `Tomorrow · ${format(date, "EEE, MMM d")}`;
  if (days === -1) return `Yesterday · ${format(date, "EEE, MMM d")}`;
  return format(date, date.getFullYear() === now.getFullYear() ? "EEEE, MMMM d" : "EEEE, MMMM d, yyyy");
}

export function formatTimestamp(iso: string | null): string {
  if (!iso) return "—";
  const d = parseISO(iso);
  return isValid(d) ? format(d, "MMM d, yyyy, h:mm a") : "—";
}

export function addDaysKey(key: string, n: number): string {
  return toDateKey(addDays(parseDateKey(key), n));
}
