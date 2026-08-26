import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./lib/auth";

const tool = v.union(
  v.literal("water"),
  v.literal("workouts"),
  v.literal("classwork"),
  v.literal("calendar")
);

/** Per-tool sharing + goals, as one object the settings page can render. */
export const mine = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireUser(ctx);
    const shares = await ctx.db
      .query("shareSettings")
      .withIndex("by_user_tool", (q) => q.eq("userId", me._id))
      .collect();
    const goals = await ctx.db
      .query("goals")
      .withIndex("by_user_tool", (q) => q.eq("userId", me._id))
      .collect();

    return {
      sharing: Object.fromEntries(shares.map((s) => [s.tool, s.visibility])),
      goals: Object.fromEntries(goals.map((g) => [g.tool, g.target])),
    };
  },
});

export const setSharing = mutation({
  args: { tool, visibility: v.union(v.literal("private"), v.literal("friends")) },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx);
    const existing = await ctx.db
      .query("shareSettings")
      .withIndex("by_user_tool", (q) => q.eq("userId", me._id).eq("tool", args.tool))
      .unique();

    if (existing) await ctx.db.patch(existing._id, { visibility: args.visibility });
    else await ctx.db.insert("shareSettings", { userId: me._id, tool: args.tool, visibility: args.visibility });
  },
});

export const setGoal = mutation({
  args: { tool, target: v.number() },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx);
    if (args.target <= 0) throw new Error("Goal must be positive");
    const existing = await ctx.db
      .query("goals")
      .withIndex("by_user_tool", (q) => q.eq("userId", me._id).eq("tool", args.tool))
      .unique();

    if (existing) await ctx.db.patch(existing._id, { target: args.target });
    else await ctx.db.insert("goals", { userId: me._id, tool: args.tool, target: args.target });
  },
});
