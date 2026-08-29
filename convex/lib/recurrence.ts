/**
 * Pure date maths for weekly repeats. No Convex imports on purpose — this is
 * the part most worth testing in isolation, and a rule that fires on the wrong
 * weekday is both easy to write and hard to notice.
 */

export type WeeklyRule = {
  byDay: number[]; // 0 = Sunday … 6 = Saturday
  startsOn: string; // YYYY-MM-DD
  endsOn?: string;
};

/**
 * Which YYYY-MM-DD keys in [from, to] the rule fires on.
 *
 * Dates are parsed at UTC noon rather than midnight: these keys are plain
 * calendar days carrying no timezone, and noon leaves 12 hours of slack in
 * both directions so a day can never roll into its neighbour.
 */
export function occurrencesInRange(rule: WeeklyRule, from: string, to: string): string[] {
  const out: string[] = [];
  if (rule.byDay.length === 0) return out;

  const start = rule.startsOn > from ? rule.startsOn : from;
  const end = rule.endsOn && rule.endsOn < to ? rule.endsOn : to;
  if (start > end) return out;

  const cursor = new Date(`${start}T12:00:00Z`);
  const last = new Date(`${end}T12:00:00Z`);

  while (cursor <= last) {
    if (rule.byDay.includes(cursor.getUTCDay())) {
      out.push(cursor.toISOString().slice(0, 10));
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out;
}
