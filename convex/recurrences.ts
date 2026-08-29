import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./lib/auth";

const tool = v.union(v.literal("workouts"), v.literal("calendar"));

export const list = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireUser(ctx);
    return await ctx.db
      .query("recurrences")
      .withIndex("by_user", (q) => q.eq("userId", me._id))
      .collect();
  },
});

export const create = mutation({
  args: {
    tool,
    title: v.string(),
    byDay: v.array(v.number()),
    startsOn: v.string(),
    startMin: v.optional(v.number()),
    location: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx);
    const title = args.title.trim();
    if (!title) throw new Error("Give it a name");

    // Keep days sane and unique — a rule with day 9 in it would silently
    // never fire, which is a horrible thing to debug later.
    const byDay = [...new Set(args.byDay.filter((d) => d >= 0 && d <= 6))].sort();
    if (byDay.length === 0) throw new Error("Pick at least one day");

    return await ctx.db.insert("recurrences", {
      userId: me._id,
      tool: args.tool,
      title,
      byDay,
      startsOn: args.startsOn,
      startMin: args.startMin,
      location: args.location?.trim() || undefined,
    });
  },
});

export const remove = mutation({
  args: { recurrenceId: v.id("recurrences") },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx);
    const row = await ctx.db.get(args.recurrenceId);
    if (!row || row.userId !== me._id) throw new Error("Not found");
    await ctx.db.delete(row._id);
  },
});
