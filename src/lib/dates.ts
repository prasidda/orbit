import { format, parse, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, addDays, isSameDay } from "date-fns";

/**
 * A DateKey is a local calendar day as "YYYY-MM-DD".
 *
 * Every dated row in the app stores one of these. It is deliberately NOT a
 * timestamp: "the day I drank this water" is a calendar fact, not an instant.
 *
 * NEVER use `new Date().toISOString().slice(0, 10)` to produce one — that
 * converts to UTC first, so anything logged after ~7pm US Eastern lands on
 * tomorrow. Always go through `toDateKey`.
 */
export type DateKey = string;

export function toDateKey(date: Date = new Date()): DateKey {
  return format(date, "yyyy-MM-dd");
}

export function fromDateKey(key: DateKey): Date {
  return parse(key, "yyyy-MM-dd", new Date());
}

export function todayKey(): DateKey {
  return toDateKey(new Date());
}

export function shiftKey(key: DateKey, days: number): DateKey {
  return toDateKey(addDays(fromDateKey(key), days));
}

export function isToday(key: DateKey): boolean {
  return isSameDay(fromDateKey(key), new Date());
}

/** Inclusive range of DateKeys, for querying a month/week in one shot. */
export function rangeKeys(from: Date, to: Date): DateKey[] {
  return eachDayOfInterval({ start: from, end: to }).map(toDateKey);
}

/** The 6-week grid a month calendar renders, padded with neighbouring days. */
export function monthGrid(month: Date, weekStartsOn: 0 | 1 = 0): Date[] {
  return eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn }),
  });
}

export function monthBounds(month: Date, weekStartsOn: 0 | 1 = 0) {
  const days = monthGrid(month, weekStartsOn);
  return { from: toDateKey(days[0]), to: toDateKey(days[days.length - 1]) };
}

export function formatDayLong(key: DateKey): string {
  return format(fromDateKey(key), "EEEE, d MMMM");
}

export function formatDayShort(key: DateKey): string {
  return format(fromDateKey(key), "EEE d MMM");
}

/** "Morning" / "Afternoon" / "Evening" — used by the Today greeting. */
export function greeting(now: Date = new Date()): string {
  const h = now.getHours();
  if (h < 12) return "Morning";
  if (h < 18) return "Afternoon";
  return "Evening";
}
