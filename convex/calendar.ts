import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./lib/auth";

/**
 * The calendar owns plain events, and it *composes* dated rows from the other
 * tools. This aggregation is the one place that knows every tool has a `date`
 * column — which is why a new tool shows up on the grid by adding a block
 * here rather than by touching the grid component.
 */

export const events = query({
  args: { from: v.string(), to: v.string() },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx);
    return await ctx.db
      .query("events")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", me._id).gte("date", args.from).lte("date", args.to)
      )
      .collect();
  },
});

export const addEvent = mutation({
  args: {
    title: v.string(),
    date: v.string(),
    startMin: v.optional(v.number()),
    endMin: v.optional(v.number()),
    location: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx);
    const title = args.title.trim();
    if (!title) throw new Error("Give the event a title");
    return await ctx.db.insert("events", {
      userId: me._id,
      title,
      date: args.date,
      startMin: args.startMin,
      endMin: args.endMin,
      location: args.location?.trim() || undefined,
    });
  },
});

export const removeEvent = mutation({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx);
    const row = await ctx.db.get(args.eventId);
    if (!row || row.userId !== me._id) throw new Error("Not found");
    await ctx.db.delete(row._id);
  },
});

export type CalendarItem = {
  id: string;
  date: string;
  tool: "calendar" | "classwork" | "workouts" | "water";
  title: string;
  detail?: string;
  startMin?: number;
  done?: boolean;
};

/** Everything dated, across every tool, for one visible range. */
export const range = query({
  args: { from: v.string(), to: v.string() },
  handler: async (ctx, args): Promise<CalendarItem[]> => {
    const me = await requireUser(ctx);
    const inRange = <T extends { date: string }>(rows: T[]) =>
      rows.filter((r) => r.date >= args.from && r.date <= args.to);

    const items: CalendarItem[] = [];

    const eventRows = await ctx.db
      .query("events")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", me._id).gte("date", args.from).lte("date", args.to)
      )
      .collect();
    for (const row of eventRows) {
      items.push({
        id: row._id,
        date: row.date,
        tool: "calendar",
        title: row.title,
        detail: row.location,
        startMin: row.startMin,
      });
    }

    const assignmentRows = await ctx.db
      .query("assignments")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", me._id).gte("date", args.from).lte("date", args.to)
      )
      .collect();
    for (const row of assignmentRows) {
      const course = row.courseId ? await ctx.db.get(row.courseId) : null;
      items.push({
        id: row._id,
        date: row.date,
        tool: "classwork",
        title: row.title,
        detail: course?.code ?? course?.name,
        done: row.status === "done",
      });
    }

    const workoutRows = await ctx.db
      .query("workouts")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", me._id).gte("date", args.from).lte("date", args.to)
      )
      .collect();
    for (const row of workoutRows) {
      items.push({ id: row._id, date: row.date, tool: "workouts", title: row.name });
    }

    // Water appears as a single "goal met" marker per day, not 12 sip rows.
    const waterRows = await ctx.db
      .query("waterLogs")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", me._id).gte("date", args.from).lte("date", args.to)
      )
      .collect();
    const goal = await ctx.db
      .query("goals")
      .withIndex("by_user_tool", (q) => q.eq("userId", me._id).eq("tool", "water"))
      .unique();
    const target = goal?.target ?? 3000;

    const byDate = new Map<string, number>();
    for (const row of inRange(waterRows)) {
      byDate.set(row.date, (byDate.get(row.date) ?? 0) + row.amountMl);
    }
    for (const [date, total] of byDate) {
      if (total >= target) {
        items.push({ id: `water-${date}`, date, tool: "water", title: "Water goal met", done: true });
      }
    }

    return items;
  },
});
