import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
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

/**
 * Creating a session and scheduling it are the same act.
 *
 * A workout is a name plus the days it happens on. `repeatDays` empty means
 * a one-off today; otherwise the session repeats on those weekdays and today
 * only gets a real row if today is one of them. Splitting these into separate
 * "session" and "split" concepts meant two doors to the same room.
 */
export const create = mutation({
  args: {
    date: v.string(),
    name: v.string(),
    repeatDays: v.optional(v.array(v.number())),
    /** Force a row for `date` even if it isn't one of the repeat days. */
    startNow: v.optional(v.boolean()),
    /** Carry the exercises over from the last time you did this session. */
    copyLast: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx);
    const name = args.name.trim();
    if (!name) throw new Error("Give the session a name");

    const repeatDays = [...new Set((args.repeatDays ?? []).filter((d) => d >= 0 && d <= 6))].sort();

    if (repeatDays.length > 0) {
      const existing = await ctx.db
        .query("recurrences")
        .withIndex("by_user", (q) => q.eq("userId", me._id))
        .collect();
      const match = existing.find(
        (r) => r.tool === "workouts" && r.title.toLowerCase() === name.toLowerCase()
      );

      // Same name means the same session — update its days rather than
      // stacking a second rule that fires alongside the first.
      if (match) {
        await ctx.db.patch(match._id, { byDay: repeatDays });
      } else {
        await ctx.db.insert("recurrences", {
          userId: me._id,
          tool: "workouts",
          title: name,
          byDay: repeatDays,
          startsOn: args.date,
        });
      }
    }

    const weekday = new Date(`${args.date}T12:00:00Z`).getUTCDay();
    const happensToday = repeatDays.length === 0 || repeatDays.includes(weekday);
    if (!args.startNow && !happensToday) return null;

    // Don't create a second row for a session already logged today.
    const alreadyToday = await ctx.db
      .query("workouts")
      .withIndex("by_user_date", (q) => q.eq("userId", me._id).eq("date", args.date))
      .collect();
    const duplicate = alreadyToday.find((w) => w.name.toLowerCase() === name.toLowerCase());
    if (duplicate) return duplicate._id;

    const workoutId = await ctx.db.insert("workouts", {
      userId: me._id,
      date: args.date,
      name,
    });

    // A session you do every week is the same exercises with different
    // numbers. Carrying last time's list over means starting leg day is one
    // tap instead of retyping five exercises; the weights come across too, as
    // a starting point to adjust rather than a blank field.
    if (args.copyLast) {
      const previous = await ctx.db
        .query("workouts")
        .withIndex("by_user_date", (q) => q.eq("userId", me._id).lt("date", args.date))
        .order("desc")
        .collect();
      const source = previous.find((w) => w.name.toLowerCase() === name.toLowerCase());

      if (source) {
        const sets = await ctx.db
          .query("workoutSets")
          .withIndex("by_workout", (q) => q.eq("workoutId", source._id))
          .collect();
        for (const set of sets.sort((a, b) => a.order - b.order)) {
          await ctx.db.insert("workoutSets", {
            userId: me._id,
            workoutId,
            exercise: set.exercise,
            kind: set.kind,
            reps: set.reps,
            weight: set.weight,
            unit: set.unit,
            durationSec: set.durationSec,
            order: set.order,
          });
        }
      }
    }

    return workoutId;
  },
});

/** One session, with everything its own page needs. */
export const get = query({
  args: { workoutId: v.id("workouts") },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx);
    const workout = await ctx.db.get(args.workoutId);
    if (!workout || workout.userId !== me._id) return null;

    const hydrated = await withSets(ctx, workout);

    // The schedule belongs to the session *name*, not to this one day's row.
    const rules = await ctx.db
      .query("recurrences")
      .withIndex("by_user", (q) => q.eq("userId", me._id))
      .collect();
    const rule = rules.find(
      (r) => r.tool === "workouts" && r.title.toLowerCase() === workout.name.toLowerCase()
    );

    return {
      ...hydrated,
      schedule: rule ? { recurrenceId: rule._id, byDay: rule.byDay } : null,
    };
  },
});

/**
 * Change which days this session repeats on, from the session itself.
 *
 * Editing the schedule where the session lives is the point — it used to be a
 * separate list, which meant two places to look for one setting.
 */
export const setSchedule = mutation({
  args: { workoutId: v.id("workouts"), byDay: v.array(v.number()) },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx);
    const workout = await ctx.db.get(args.workoutId);
    if (!workout || workout.userId !== me._id) throw new Error("Not found");

    const byDay = [...new Set(args.byDay.filter((d) => d >= 0 && d <= 6))].sort();

    const rules = await ctx.db
      .query("recurrences")
      .withIndex("by_user", (q) => q.eq("userId", me._id))
      .collect();
    const rule = rules.find(
      (r) => r.tool === "workouts" && r.title.toLowerCase() === workout.name.toLowerCase()
    );

    if (byDay.length === 0) {
      // No days means it doesn't repeat — drop the rule rather than keep one
      // that can never fire.
      if (rule) await ctx.db.delete(rule._id);
      return;
    }

    if (rule) await ctx.db.patch(rule._id, { byDay });
    else
      await ctx.db.insert("recurrences", {
        userId: me._id,
        tool: "workouts",
        title: workout.name,
        byDay,
        startsOn: workout.date,
      });
  },
});

/**
 * Every session you have: the ones that repeat, plus any you've logged
 * recently. This is what the overview lists, so a session is reachable
 * whether or not it happens to be scheduled today.
 */
export const sessionIndex = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireUser(ctx);

    const rules = (
      await ctx.db
        .query("recurrences")
        .withIndex("by_user", (q) => q.eq("userId", me._id))
        .collect()
    ).filter((r) => r.tool === "workouts");

    const workouts = await ctx.db
      .query("workouts")
      .withIndex("by_user_date", (q) => q.eq("userId", me._id))
      .order("desc")
      .take(200);

    type Entry = {
      name: string;
      byDay: number[];
      lastWorkoutId?: Id<"workouts">;
      lastDate?: string;
    };
    const byName = new Map<string, Entry>();

    for (const rule of rules) {
      byName.set(rule.title.toLowerCase(), { name: rule.title, byDay: rule.byDay });
    }

    for (const workout of workouts) {
      const key = workout.name.toLowerCase();
      const existing = byName.get(key);
      if (!existing) {
        byName.set(key, {
          name: workout.name,
          byDay: [],
          lastWorkoutId: workout._id,
          lastDate: workout.date,
        });
      } else if (!existing.lastWorkoutId || workout.date > (existing.lastDate ?? "")) {
        existing.lastWorkoutId = workout._id;
        existing.lastDate = workout.date;
      }
    }

    return [...byName.values()].sort((a, b) => {
      // Repeating sessions first, then most recently done.
      if (a.byDay.length !== b.byDay.length) return b.byDay.length - a.byDay.length;
      return (b.lastDate ?? "").localeCompare(a.lastDate ?? "");
    });
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
