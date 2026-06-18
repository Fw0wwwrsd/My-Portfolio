// All calendar math uses "date keys" (yyyy-MM-dd strings) anchored to UTC so
// the demo behaves identically in any server timezone. Times-of-day are
// minutes from midnight (endMinute > 1440 = crosses midnight).

export const DAY_MS = 24 * 60 * 60 * 1000;

export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const DAY_NAMES_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function fromDateKey(key: string): Date {
  return new Date(`${key}T00:00:00.000Z`);
}

/** Today as a date key, in the server's local timezone. */
export function todayKey(): string {
  const now = new Date();
  return toDateKey(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())));
}

export function addDays(key: string, days: number): string {
  return toDateKey(new Date(fromDateKey(key).getTime() + days * DAY_MS));
}

/** 0 = Sunday … 6 = Saturday */
export function dayOfWeek(key: string): number {
  return fromDateKey(key).getUTCDay();
}

/** Monday of the week containing `key` (weeks start Monday). */
export function weekStart(key: string): string {
  const dow = dayOfWeek(key);
  const back = dow === 0 ? 6 : dow - 1;
  return addDays(key, -back);
}

export function weekDays(weekStartKey: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStartKey, i));
}

export function isValidDateKey(key: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(key) && !Number.isNaN(fromDateKey(key).getTime());
}

/** "09:00", "17:30"; minutes past 1440 wrap ("25:00" -> "01:00"). */
export function formatMinute(minute: number): string {
  const m = ((minute % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const mm = String(m % 60).padStart(2, "0");
  return `${String(h).padStart(2, "0")}:${mm}`;
}

export function formatTimeRange(startMinute: number, endMinute: number): string {
  const overnight = endMinute > 1440 ? " (+1d)" : "";
  return `${formatMinute(startMinute)}–${formatMinute(endMinute)}${overnight}`;
}

/** "Mon 9 Jun" */
export function formatDateKey(key: string): string {
  const d = fromDateKey(key);
  return `${DAY_NAMES_SHORT[d.getUTCDay()]} ${d.getUTCDate()} ${MONTH_NAMES_SHORT[d.getUTCMonth()]}`;
}

/** "9 Jun – 15 Jun 2026" */
export function formatWeekRange(weekStartKey: string): string {
  const start = fromDateKey(weekStartKey);
  const end = fromDateKey(addDays(weekStartKey, 6));
  const s = `${start.getUTCDate()} ${MONTH_NAMES_SHORT[start.getUTCMonth()]}`;
  const e = `${end.getUTCDate()} ${MONTH_NAMES_SHORT[end.getUTCMonth()]} ${end.getUTCFullYear()}`;
  return `${s} – ${e}`;
}

export function shiftDurationHours(startMinute: number, endMinute: number): number {
  return (endMinute - startMinute) / 60;
}

/** Parse "HH:MM" into minutes from midnight, or null if invalid. */
export function parseTimeToMinute(value: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 47 || min > 59) return null;
  return h * 60 + min;
}
