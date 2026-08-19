/**
 * Calendar-day helpers.
 *
 * The app keys everything by local calendar day, not by timestamp: "what did I
 * eat on the 18th" must not shift because the user flew to another timezone.
 * So dates are stored and compared as `YYYY-MM-DD` strings built from the
 * device's local date parts, never from `toISOString()` (which converts to UTC
 * and silently rolls the day over late at night).
 */

export type ISODate = string;

/** Local calendar day for a Date, as `YYYY-MM-DD`. */
export function toISODate(date: Date): ISODate {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Today, in the device's local timezone. */
export function today(): ISODate {
  return toISODate(new Date());
}

/** Shift an ISO date by whole days. Negative goes back. */
export function addDays(date: ISODate, days: number): ISODate {
  const parts = date.split('-').map(Number);
  const [year, month, day] = [parts[0] ?? 1970, parts[1] ?? 1, parts[2] ?? 1];
  // Constructing in local time keeps this consistent with toISODate above.
  const shifted = new Date(year, month - 1, day + days);
  return toISODate(shifted);
}

/** Inclusive list of days from `from` to `to`. */
export function dateRange(from: ISODate, to: ISODate): ISODate[] {
  const days: ISODate[] = [];
  let cursor = from;
  // Lexicographic comparison is safe for zero-padded YYYY-MM-DD.
  while (cursor <= to) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return days;
}

/** e.g. "Tuesday, 18 August". Used for the dashboard greeting. */
export function formatLongDate(date: ISODate): string {
  const parts = date.split('-').map(Number);
  const local = new Date(parts[0] ?? 1970, (parts[1] ?? 1) - 1, parts[2] ?? 1);
  return local.toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

/** "Good morning" / "Good afternoon" / "Good evening", by local clock hour. */
export function greetingFor(date: Date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}
