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

export const setStatus = mutation({
  args: { assignmentId: v.id("assignments"), status },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx);
    const row = await ctx.db.get(args.assignmentId);
    if (!row || row.userId !== me._id) throw new Error("Not found");
    await ctx.db.patch(row._id, { status: args.status });
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
