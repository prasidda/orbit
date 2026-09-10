import type { Matcher } from "@/lib/quick-add/types";
import { toMl, formatCups, type WaterUnit } from "@/lib/units";
import { parseDatePhrase, describeDate } from "@/lib/quick-add/dates";

/**
 * "2 cups", "log 2 cups", "+500ml", "16oz", "drink 1.5 cups".
 *
 * A bare number deliberately does NOT match. "2" alone could mean two cups,
 * two sets, or an assignment called "2" — guessing there would be worse than
 * not matching, because a wrong row is more work to undo than a retype.
 */
const WATER = new RegExp(
  String.raw`(?:^|\s)(?:log\s+|add\s+|drink\s+|had\s+)?\+?(\d+(?:\.\d+)?)\s*(cups?|c|ml|oz|ounces?)\b`,
  "i"
);

function unitOf(raw: string): WaterUnit {
  const lower = raw.toLowerCase();
  if (lower.startsWith("ml")) return "ml";
  if (lower.startsWith("oz") || lower.startsWith("ounce")) return "oz";
  return "cup";
}

export const waterMatcher: Matcher = (input, ctx) => {
  const match = WATER.exec(input);
  if (!match) return null;

  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const amountMl = toMl(amount, unitOf(match[2]));
  if (amountMl <= 0 || amountMl > 5000) return null; // mirrors the mutation's guard

  // Water can be backdated — "2 cups yesterday" after forgetting to log.
  const when = parseDatePhrase(input, ctx.today);
  const date = when?.date ?? ctx.today;

  return {
    tool: "water",
    label: `Water · ${formatCups(amountMl)} · ${describeDate(date, ctx.today)}`,
    run: async (api) => {
      await api.logWater({ date, amountMl });
    },
  };
};
