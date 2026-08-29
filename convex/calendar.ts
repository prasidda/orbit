import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { requireUser } from "./lib/auth";
import { DEFAULT_GOAL_ML } from "./water";
import { occurrencesInRange } from "./lib/recurrence";

/**
 * The calendar owns plain events, and it *composes* dated rows from the other
 * tools. This aggregation is the one place that knows every tool has a `date`
 * column — which is why a new tool shows up on the grid by adding a block
 * here rather than by touching the grid component.
 */

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
  /** Finished: a done assignment, or a met water goal. */
  done?: boolean;
  /** A repeat that hasn't happened yet — drawn hollow, not solid. */
  planned?: boolean;
};

/**
 * Month-grid data: one dot per thing, across every tool.
 *
 * Water is the exception — a day gets at most one water marker rather than a
 * dot per sip, because twelve dots would drown out everything else.
 */
export const range = query({
  args: { from: v.string(), to: v.string() },
  handler: async (ctx, args): Promise<CalendarItem[]> => {
    const me = await requireUser(ctx);
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

    // Assignments appear twice on purpose: on the day they're due, and again
    // on the day they were actually finished. Seeing both is the point.
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
        detail: course?.code ?? course?.name ?? "due",
        done: row.status === "done",
      });
    }

    const completedRows = await ctx.db
      .query("assignments")
      .withIndex("by_user_completed", (q) =>
        q.eq("userId", me._id).gte("completedDate", args.from).lte("completedDate", args.to)
      )
      .collect();
    for (const row of completedRows) {
      // Don't double up when something was finished on its own due date.
      if (!row.completedDate || row.completedDate === row.date) continue;
      items.push({
        id: `${row._id}-done`,
        date: row.completedDate,
        tool: "classwork",
        title: row.title,
        detail: "finished",
        done: true,
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

    // Water: one marker per day, and only once the goal is met.
    const waterRows = await ctx.db
      .query("waterLogs")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", me._id).gte("date", args.from).lte("date", args.to)
      )
      .collect();
    const goalRow = await ctx.db
      .query("goals")
      .withIndex("by_user_tool", (q) => q.eq("userId", me._id).eq("tool", "water"))
      .unique();
    const target = goalRow?.target ?? DEFAULT_GOAL_ML;

    const waterByDate = new Map<string, number>();
    for (const row of waterRows) {
      waterByDate.set(row.date, (waterByDate.get(row.date) ?? 0) + row.amountMl);
    }
    for (const [date, total] of waterByDate) {
      if (total >= target) {
        items.push({ id: `water-${date}`, date, tool: "water", title: "Water goal met", done: true });
      }
    }

    // Weekly repeats, expanded into planned occurrences. A planned item is
    // suppressed once the real thing exists on that day, so a completed
    // Monday workout doesn't sit next to a ghost of itself.
    const rules = await ctx.db
      .query("recurrences")
      .withIndex("by_user", (q) => q.eq("userId", me._id))
      .collect();

    const actualWorkouts = new Set(workoutRows.map((w) => `${w.date}|${w.name.toLowerCase()}`));
    const actualEvents = new Set(eventRows.map((e) => `${e.date}|${e.title.toLowerCase()}`));

    for (const rule of rules) {
      for (const date of occurrencesInRange(rule, args.from, args.to)) {
        const key = `${date}|${rule.title.toLowerCase()}`;
        if (rule.tool === "workouts" && actualWorkouts.has(key)) continue;
        if (rule.tool === "calendar" && actualEvents.has(key)) continue;

        items.push({
          id: `rule-${rule._id}-${date}`,
          date,
          tool: rule.tool === "workouts" ? "workouts" : "calendar",
          title: rule.title,
          detail: rule.location ?? "planned",
          startMin: rule.startMin,
          planned: true,
        });
      }
    }

    return items;
  },
});

export type DaySummary = {
  date: string;
  water: { totalMl: number; goalMl: number; logCount: number };
  workouts: { id: Id<"workouts">; name: string; setCount: number; volume: number }[];
  planned: { id: string; tool: "workouts" | "calendar"; title: string; startMin?: number }[];
  due: { id: Id<"assignments">; title: string; course?: string; status: string }[];
  finished: { id: Id<"assignments">; title: string; course?: string }[];
  events: { id: Id<"events">; title: string; startMin?: number; location?: string }[];
};

/**
 * Everything about one day, for the panel under the grid.
 *
 * The month grid answers "which days had something"; this answers "how did
 * that day actually go" — which is what you want when you tap a date to check
 * your progress.
 */
export const day = query({
  args: { date: v.string() },
  handler: async (ctx, args): Promise<DaySummary> => {
    const me = await requireUser(ctx);

    const waterLogs = await ctx.db
      .query("waterLogs")
      .withIndex("by_user_date", (q) => q.eq("userId", me._id).eq("date", args.date))
      .collect();
    const goalRow = await ctx.db
      .query("goals")
      .withIndex("by_user_tool", (q) => q.eq("userId", me._id).eq("tool", "water"))
      .unique();

    const workoutRows = await ctx.db
      .query("workouts")
      .withIndex("by_user_date", (q) => q.eq("userId", me._id).eq("date", args.date))
      .collect();
    const workouts = [];
    for (const workout of workoutRows) {
      const sets = await ctx.db
        .query("workoutSets")
        .withIndex("by_workout", (q) => q.eq("workoutId", workout._id))
        .collect();
      workouts.push({
        id: workout._id,
        name: workout.name,
        setCount: sets.length,
        volume: sets.reduce((sum, s) => sum + s.reps * s.weight, 0),
      });
    }

    const dueRows = await ctx.db
      .query("assignments")
      .withIndex("by_user_date", (q) => q.eq("userId", me._id).eq("date", args.date))
      .collect();
    const courseName = async (courseId?: Id<"courses">) => {
      if (!courseId) return undefined;
      const course = await ctx.db.get(courseId);
      return course ? (course.code ?? course.name) : undefined;
    };

    const due = [];
    for (const row of dueRows) {
      due.push({
        id: row._id,
        title: row.title,
        course: await courseName(row.courseId),
        status: row.status,
      });
    }

    const completedRows = await ctx.db
      .query("assignments")
      .withIndex("by_user_completed", (q) =>
        q.eq("userId", me._id).eq("completedDate", args.date)
      )
      .collect();
    const finished = [];
    for (const row of completedRows) {
      finished.push({ id: row._id, title: row.title, course: await courseName(row.courseId) });
    }

    const eventRows = await ctx.db
      .query("events")
      .withIndex("by_user_date", (q) => q.eq("userId", me._id).eq("date", args.date))
      .collect();

    const rules = await ctx.db
      .query("recurrences")
      .withIndex("by_user", (q) => q.eq("userId", me._id))
      .collect();
    const actualWorkouts = new Set(workoutRows.map((w) => w.name.toLowerCase()));
    const actualEvents = new Set(eventRows.map((e) => e.title.toLowerCase()));

    const planned = [];
    for (const rule of rules) {
      if (occurrencesInRange(rule, args.date, args.date).length === 0) continue;
      const key = rule.title.toLowerCase();
      if (rule.tool === "workouts" && actualWorkouts.has(key)) continue;
      if (rule.tool === "calendar" && actualEvents.has(key)) continue;
      planned.push({
        id: `rule-${rule._id}`,
        tool: rule.tool,
        title: rule.title,
        startMin: rule.startMin,
      });
    }

    return {
      date: args.date,
      water: {
        totalMl: waterLogs.reduce((sum, l) => sum + l.amountMl, 0),
        goalMl: goalRow?.target ?? DEFAULT_GOAL_ML,
        logCount: waterLogs.length,
      },
      workouts,
      planned,
      due,
      finished,
      events: eventRows
        .map((e) => ({
          id: e._id,
          title: e.title,
          startMin: e.startMin,
          location: e.location,
        }))
        .sort((a, b) => (a.startMin ?? 1441) - (b.startMin ?? 1441)),
    };
  },
});
