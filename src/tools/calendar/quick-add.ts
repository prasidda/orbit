import type { Matcher } from "@/lib/quick-add/types";
import { parseDatePhrase, stripDatePhrase, describeDate } from "@/lib/quick-add/dates";
import { formatTimeOfDay } from "@/lib/dates";

/**
 * "lecture at 2:50 monday", "gym 6pm tomorrow", "dentist friday at 9am".
 *
 * This is the last matcher to run, so it only sees phrases the more specific
 * ones declined. It needs a date phrase and something left over to call the
 * event — a bare "friday" with no title isn't an event.
 */
export const calendarMatcher: Matcher = (input, ctx) => {
  const when = parseDatePhrase(input, ctx.today);
  if (!when) return null;

  const title = stripDatePhrase(input, when);
  if (!title) return null;

  const time = formatTimeOfDay(when.startMin);

  return {
    tool: "calendar",
    label: `Calendar · "${title}" · ${describeDate(when.date, ctx.today)}${time ? ` at ${time}` : ""}`,
    run: async (api) => {
      await api.addEvent({ title, date: when.date, startMin: when.startMin });
    },
  };
};
