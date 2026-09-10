import type { Matcher, QuickAddContext, QuickAddIntent } from "./types";
import { waterMatcher } from "@/tools/water/quick-add";
import { workoutMatcher } from "@/tools/workouts/quick-add";
import { classworkMatcher } from "@/tools/classwork/quick-add";
import { calendarMatcher } from "@/tools/calendar/quick-add";

/**
 * ADDING QUICK-ADD TO A TOOL
 * --------------------------
 * Write `src/tools/<key>/quick-add.ts` exporting a `Matcher`, then add it
 * below. The palette picks it up with no shell changes — same idea as the
 * tool registry itself.
 *
 * ORDER MATTERS. Matchers run top to bottom and the first non-null wins, so
 * the most specific patterns go first:
 *   - water needs an explicit unit ("2 cups"), so it can't steal anything else
 *   - workouts claim "start X" and "X 3x8"
 *   - classwork requires the word "due"
 *   - calendar is the catch-all for "<title> <when>", so it must be last or it
 *     would swallow every phrase containing a weekday
 */
const MATCHERS: Matcher[] = [
  waterMatcher,
  workoutMatcher,
  classworkMatcher,
  calendarMatcher,
];

export function matchQuickAdd(
  input: string,
  ctx: QuickAddContext
): QuickAddIntent | null {
  const trimmed = input.trim();
  // Two characters can't be a meaningful entry, and matching on every
  // keystroke of a navigation search would flash previews at the user.
  if (trimmed.length < 3) return null;

  for (const matcher of MATCHERS) {
    const intent = matcher(trimmed, ctx);
    if (intent) return intent;
  }
  return null;
}
