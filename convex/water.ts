import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { requireUser, assertCanView, Ctx } from "./lib/auth";

/** 12 cups at 240ml. Kept in sync with DEFAULT_WATER_GOAL_ML in src/lib/units.ts. */
export const DEFAULT_GOAL_ML = 2880;

async function goalFor(ctx: Ctx, userId: Id<"users">): Promise<number> {
  const goal = await ctx.db
    .query("goals")
    .withIndex("by_user_tool", (q) => q.eq("userId", userId).eq("tool", "water"))
    .unique();
  return goal?.target ?? DEFAULT_GOAL_ML;
}

/** One day's worth of water — the query the Today card and /water both use. */
export const day = query({
  args: { date: v.string() },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx);
    const logs = await ctx.db
      .query("waterLogs")
      .withIndex("by_user_date", (q) => q.eq("userId", me._id).eq("date", args.date))
      .collect();

    return {
      logs: logs.sort((a, b) => b.loggedAt - a.loggedAt),
      totalMl: logs.reduce((sum, l) => sum + l.amountMl, 0),
      goalMl: await goalFor(ctx, me._id),
    };
  },
});

/** Daily totals across a range — powers the history chart and streaks. */
export const history = query({
  args: { from: v.string(), to: v.string() },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx);
    const logs = await ctx.db
      .query("waterLogs")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", me._id).gte("date", args.from).lte("date", args.to)
      )
      .collect();

    const byDate = new Map<string, number>();
    for (const log of logs) {
      byDate.set(log.date, (byDate.get(log.date) ?? 0) + log.amountMl);
    }

    return {
      goalMl: await goalFor(ctx, me._id),
      days: [...byDate.entries()]
        .map(([date, totalMl]) => ({ date, totalMl }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    };
  },
});

export const log = mutation({
  args: { date: v.string(), amountMl: v.number() },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx);
    if (args.amountMl <= 0 || args.amountMl > 5000) throw new Error("That's not a real glass of water");

    return await ctx.db.insert("waterLogs", {
      userId: me._id,
      date: args.date,
      amountMl: Math.round(args.amountMl),
      loggedAt: Date.now(),
    });
  },
});

export const removeLog = mutation({
  args: { logId: v.id("waterLogs") },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx);
    const row = await ctx.db.get(args.logId);
    if (!row || row.userId !== me._id) throw new Error("Not found");
    await ctx.db.delete(row._id);
  },
});

/** Undo the most recent log of a day — the mis-tap escape hatch. */
export const undoLast = mutation({
  args: { date: v.string() },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx);
    const logs = await ctx.db
      .query("waterLogs")
      .withIndex("by_user_date", (q) => q.eq("userId", me._id).eq("date", args.date))
      .collect();
    if (!logs.length) return;
    const last = logs.reduce((a, b) => (a.loggedAt > b.loggedAt ? a : b));
    await ctx.db.delete(last._id);
  },
});

/** A friend's day. Guarded by assertCanView — the only cross-user read. */
export const friendDay = query({
  args: { userId: v.id("users"), date: v.string() },
  handler: async (ctx, args) => {
    await assertCanView(ctx, args.userId, "water");
    const logs = await ctx.db
      .query("waterLogs")
      .withIndex("by_user_date", (q) => q.eq("userId", args.userId).eq("date", args.date))
      .collect();
    return {
      totalMl: logs.reduce((sum, l) => sum + l.amountMl, 0),
      goalMl: await goalFor(ctx, args.userId),
    };
  },
});
