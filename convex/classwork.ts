import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./lib/auth";

const status = v.union(v.literal("todo"), v.literal("doing"), v.literal("done"));

export const courses = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireUser(ctx);
    const rows = await ctx.db
      .query("courses")
      .withIndex("by_user", (q) => q.eq("userId", me._id))
      .collect();
    return rows.filter((c) => !c.archived);
  },
});

export const addCourse = mutation({
  args: { name: v.string(), code: v.optional(v.string()), color: v.string() },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx);
    const name = args.name.trim();
    if (!name) throw new Error("Give the course a name");
    return await ctx.db.insert("courses", {
      userId: me._id,
      name,
      code: args.code?.trim() || undefined,
      color: args.color,
    });
  },
});

/**
 * Deleting a course keeps its assignments — they just lose their tag. Losing
 * a semester of coursework because you tidied up a course list would be a
 * nasty surprise.
 */
export const removeCourse = mutation({
  args: { courseId: v.id("courses") },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx);
    const course = await ctx.db.get(args.courseId);
    if (!course || course.userId !== me._id) throw new Error("Not found");

    const tagged = await ctx.db
      .query("assignments")
      .withIndex("by_course", (q) => q.eq("courseId", course._id))
      .collect();
    for (const row of tagged) {
      await ctx.db.patch(row._id, { courseId: undefined });
    }

    await ctx.db.delete(course._id);
  },
});

export const archiveCourse = mutation({
  args: { courseId: v.id("courses") },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx);
    const course = await ctx.db.get(args.courseId);
    if (!course || course.userId !== me._id) throw new Error("Not found");
    await ctx.db.patch(course._id, { archived: true });
  },
});

/**
 * Every assignment, joined to its course. Small enough to send whole — this
 * is one person's coursework, not a dataset.
 */
export const assignments = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireUser(ctx);
    const rows = await ctx.db
      .query("assignments")
      .withIndex("by_user_date", (q) => q.eq("userId", me._id))
      .collect();

    const courseCache = new Map<string, { name: string; code?: string; color: string } | null>();
    const hydrated = [];

    for (const row of rows) {
      let course = null;
      if (row.courseId) {
        const key = row.courseId;
        if (!courseCache.has(key)) {
          const found = await ctx.db.get(row.courseId);
          courseCache.set(
            key,
            found ? { name: found.name, code: found.code, color: found.color } : null
          );
        }
        course = courseCache.get(key) ?? null;
      }
      hydrated.push({ ...row, course });
    }

    return hydrated.sort((a, b) => a.date.localeCompare(b.date));
  },
});

export const addAssignment = mutation({
  args: {
    title: v.string(),
    date: v.string(),
    courseId: v.optional(v.id("courses")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx);
    const title = args.title.trim();
    if (!title) throw new Error("Give the assignment a title");

    // Guard against pointing at somebody else's course.
    if (args.courseId) {
      const course = await ctx.db.get(args.courseId);
      if (!course || course.userId !== me._id) throw new Error("Not found");
    }

    return await ctx.db.insert("assignments", {
      userId: me._id,
      title,
      date: args.date,
      courseId: args.courseId,
      notes: args.notes?.trim() || undefined,
      status: "todo",
    });
  },
});

/**
 * Checking something off records *when*, which is what puts it on the
 * calendar on the day you finished it rather than the day it was due.
 *
 * `today` comes from the client because only the browser knows the user's
 * local date — deriving it server-side would file late-evening work under
 * tomorrow.
 */
export const setStatus = mutation({
  args: { assignmentId: v.id("assignments"), status, today: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx);
    const row = await ctx.db.get(args.assignmentId);
    if (!row || row.userId !== me._id) throw new Error("Not found");

    if (args.status === "done") {
      // Keep the original completion day if it's already done — re-checking
      // an item shouldn't quietly move it to today.
      await ctx.db.patch(row._id, {
        status: "done",
        completedDate: row.completedDate ?? args.today ?? row.date,
      });
    } else {
      await ctx.db.patch(row._id, { status: args.status, completedDate: undefined });
    }
  },
});

export const removeAssignment = mutation({
  args: { assignmentId: v.id("assignments") },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx);
    const row = await ctx.db.get(args.assignmentId);
    if (!row || row.userId !== me._id) throw new Error("Not found");
    await ctx.db.delete(row._id);
  },
});
