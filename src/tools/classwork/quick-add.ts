import type { Matcher } from "@/lib/quick-add/types";
import { parseDatePhrase, stripDatePhrase, describeDate } from "@/lib/quick-add/dates";

/**
 * "pset 6 due friday", "essay due tomorrow", "lab 3 due sep 12".
 *
 * Requires an explicit "due" (or "by"). Without that keyword this would
 * swallow anything containing a weekday — "gym friday" is an event, not
 * coursework — so the keyword is what keeps the matchers from fighting.
 */
const DUE = /\b(?:due|by)\b/i;

export const classworkMatcher: Matcher = (input, ctx) => {
  if (!DUE.test(input)) return null;

  const when = parseDatePhrase(input, ctx.today);
  if (!when) return null;

  const title = stripDatePhrase(input, when);
  if (!title) return null;

  return {
    tool: "classwork",
    // Assignments carry a date and no time, so a written time is left in the
    // title rather than silently dropped.
    label: `Classwork · "${title}" · due ${describeDate(when.date, ctx.today)}`,
    run: async (api) => {
      await api.addAssignment({ title, date: when.date });
    },
  };
};
