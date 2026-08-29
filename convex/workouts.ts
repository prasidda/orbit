import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc } from "./_generated/dataModel";
import { requireUser, Ctx } from "./lib/auth";

async function withSets(ctx: Ctx, workout: Doc<"workouts">) {
  const sets = await ctx.db
    .query("workoutSets")
    .withIndex("by_workout", (q) => q.eq("workoutId", workout._id))
    .collect();

  // Only reps sets carry volume; a 60-second plank has no meaningful
  // reps × weight. Time sets are summed separately instead.
  const volume = sets.reduce(
    (sum, s) => (s.kind === "time" ? sum : sum + (s.reps ?? 0) * (s.weight ?? 0)),
    0
  );
  const timeSec = sets.reduce((sum, s) => sum + (s.durationSec ?? 0), 0);

  return {
    ...workout,
    sets: sets.sort((a, b) => a.order - b.order),
    volume,
    timeSec,
  };
}

export const day = query({
  args: { date: v.string() },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx);
    const rows = await ctx.db
      .query("workouts")
      .withIndex("by_user_date", (q) => q.eq("userId", me._id).eq("date", args.date))
      .collect();
    return await Promise.all(rows.map((w) => withSets(ctx, w)));
  },
});

export const history = query({
  args: { from: v.string(), to: v.string() },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx);
    const rows = await ctx.db
      .query("workouts")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", me._id).gte("date", args.from).lte("date", args.to)
      )
      .collect();
    const hydrated = await Promise.all(rows.map((w) => withSets(ctx, w)));
    return hydrated.sort((a, b) => b.date.localeCompare(a.date));
  },
});

/** Exercises you've logged before, most-used first — feeds the autocomplete. */
export const exercises = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireUser(ctx);
    const sets = await ctx.db
      .query("workoutSets")
      .withIndex("by_user_exercise", (q) => q.eq("userId", me._id))
      .collect();

    const counts = new Map<string, number>();
    for (const set of sets) counts.set(set.exercise, (counts.get(set.exercise) ?? 0) + 1);

    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 40)
      .map(([exercise]) => exercise);
  },
});

export const create = mutation({
  args: {
    date: v.string(),
    name: v.string(),
    // Weekly repeat on the same weekday, stored as a rule the calendar
    // expands — see convex/recurrences.ts.
    repeatWeekly: v.optional(v.boolean()),
    weekday: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx);
    const name = args.name.trim();
    if (!name) throw new Error("Give the session a name");

    const workoutId = await ctx.db.insert("workouts", {
      userId: me._id,
      date: args.date,
      name,
    });

    if (args.repeatWeekly && args.weekday !== undefined) {
      const existing = await ctx.db
        .query("recurrences")
        .withIndex("by_user", (q) => q.eq("userId", me._id))
        .collect();
      const duplicate = existing.some(
        (r) => r.tool === "workouts" && r.title.toLowerCase() === name.toLowerCase()
      );
      if (!duplicate) {
        await ctx.db.insert("recurrences", {
          userId: me._id,
          tool: "workouts",
          title: name,
          byDay: [args.weekday],
          startsOn: args.date,
        });
      }
    }

    return workoutId;
  },
});

export const rename = mutation({
  args: { workoutId: v.id("workouts"), name: v.string() },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx);
    const workout = await ctx.db.get(args.workoutId);
    if (!workout || workout.userId !== me._id) throw new Error("Not found");
    await ctx.db.patch(workout._id, { name: args.name.trim() || workout.name });
  },
});

export const remove = mutation({
  args: { workoutId: v.id("workouts") },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx);
    const workout = await ctx.db.get(args.workoutId);
    if (!workout || workout.userId !== me._id) throw new Error("Not found");

    // Sets are children of the session, so they go with it.
    const sets = await ctx.db
      .query("workoutSets")
      .withIndex("by_workout", (q) => q.eq("workoutId", workout._id))
      .collect();
    for (const set of sets) await ctx.db.delete(set._id);
    await ctx.db.delete(workout._id);
  },
});

export const addSet = mutation({
  args: {
    workoutId: v.id("workouts"),
    exercise: v.string(),
    kind: v.union(v.literal("reps"), v.literal("time")),
    // reps sets
    reps: v.optional(v.number()),
    weight: v.optional(v.number()),
    unit: v.optional(v.union(v.literal("kg"), v.literal("lb"))),
    // time sets
    durationSec: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx);
    const workout = await ctx.db.get(args.workoutId);
    if (!workout || workout.userId !== me._id) throw new Error("Not found");

    const exercise = args.exercise.trim();
    if (!exercise) throw new Error("Name the exercise");

    const existing = await ctx.db
      .query("workoutSets")
      .withIndex("by_workout", (q) => q.eq("workoutId", workout._id))
      .collect();

    if (args.kind === "time") {
      const durationSec = Math.round(args.durationSec ?? 0);
      if (durationSec <= 0) throw new Error("How long did it take?");
      return await ctx.db.insert("workoutSets", {
        userId: me._id,
        workoutId: workout._id,
        exercise,
        kind: "time",
        durationSec,
        order: existing.length,
      });
    }

    return await ctx.db.insert("workoutSets", {
      userId: me._id,
      workoutId: workout._id,
      exercise,
      kind: "reps",
      reps: Math.max(1, Math.round(args.reps ?? 1)),
      weight: Math.max(0, args.weight ?? 0),
      unit: args.unit ?? "lb",
      order: existing.length,
    });
  },
});

/**
 * How long the session took. Typed rather than timed — a stopwatch you have
 * to remember to stop produces worse data than a number you enter after.
 */
export const setDuration = mutation({
  args: { workoutId: v.id("workouts"), durationMin: v.number() },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx);
    const workout = await ctx.db.get(args.workoutId);
    if (!workout || workout.userId !== me._id) throw new Error("Not found");

    const minutes = Math.max(0, Math.round(args.durationMin));
    await ctx.db.patch(workout._id, {
      durationMin: minutes === 0 ? undefined : minutes,
    });
  },
});

/** Minutes trained per day — the workouts equivalent of the water chart. */
export const minutesByDay = query({
  args: { from: v.string(), to: v.string() },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx);
    const rows = await ctx.db
      .query("workouts")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", me._id).gte("date", args.from).lte("date", args.to)
      )
      .collect();

    const byDate = new Map<string, number>();
    for (const row of rows) {
      byDate.set(row.date, (byDate.get(row.date) ?? 0) + (row.durationMin ?? 0));
    }

    return {
      days: [...byDate.entries()]
        .map(([date, minutes]) => ({ date, minutes }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      sessionCount: rows.length,
      untimed: rows.filter((r) => r.durationMin === undefined).length,
    };
  },
});

export const removeSet = mutation({
  args: { setId: v.id("workoutSets") },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx);
    const set = await ctx.db.get(args.setId);
    if (!set || set.userId !== me._id) throw new Error("Not found");
    await ctx.db.delete(set._id);
  },
});
