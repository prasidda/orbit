import * as chrono from "chrono-node/en";
import { toDateKey, fromDateKey, shiftKey, formatDayShort, type DateKey } from "@/lib/dates";

/**
 * Date phrases for quick-add: "friday", "tomorrow", "sep 12", "in 3 days".
 *
 * chrono-node is a deterministic parser — no model. It exists here because the
 * long tail is genuinely fiddly (does a bare "friday" mean this week or next?)
 * and getting it subtly wrong files work on the wrong day.
 *
 * Imported from the `/en` subpath, not the package root: the root pulls in
 * parsers for nine other languages, none of which this app has any use for.
 */

export type ParsedDate = {
  date: DateKey;
  /** Minutes from local midnight, only when a time was actually written. */
  startMin?: number;
  /** The matched substring, so a caller can strip it out of a title. */
  text: string;
  index: number;
};

/**
 * The reference instant is local midnight of `today`, not `new Date()`. That
 * keeps results identical whenever the parse runs — including at 11:30pm,
 * where using the real clock would drift "tomorrow" onto the wrong day.
 */
export function parseDatePhrase(input: string, today: DateKey): ParsedDate | null {
  const results = chrono.parse(input, fromDateKey(today), { forwardDate: true });
  if (results.length === 0) return null;

  const result = results[0];
  const parsed = result.start;
  const date = toDateKey(parsed.date());

  // isCertain("hour") is the difference between "friday" (no time) and
  // "friday at 9" (9am). Without this check every date would land at midnight
  // and every event would claim to start then.
  const startMin = parsed.isCertain("hour")
    ? parsed.get("hour")! * 60 + (parsed.get("minute") ?? 0)
    : undefined;

  return { date, startMin, text: result.text, index: result.index };
}

/** Leftover connectors once the date phrase is cut out of a title. */
const CONNECTORS = /\b(due|on|at|by|for|this|next)\b/gi;

/**
 * "pset 6 due friday" -> "pset 6".
 *
 * Removes the matched phrase, then the connector that introduced it, so the
 * title doesn't keep a dangling "due".
 */
export function stripDatePhrase(input: string, found: ParsedDate): string {
  const before = input.slice(0, found.index);
  const after = input.slice(found.index + found.text.length);

  return `${before} ${after}`
    .replace(CONNECTORS, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * "today" / "tomorrow" / "Fri 11 Sep" — the preview's date label.
 *
 * Uses the app's own `formatDayShort` rather than `toLocaleDateString`: the
 * locale version renders differently per browser, which makes the preview
 * inconsistent with every other date in the app and untestable besides.
 * `shiftKey` handles tomorrow, since adding 86,400,000ms is wrong across a
 * DST boundary.
 */
export function describeDate(date: DateKey, today: DateKey): string {
  if (date === today) return "today";
  if (date === shiftKey(today, 1)) return "tomorrow";
  return formatDayShort(date);
}
