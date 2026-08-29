import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * The map of the whole app.
 *
 * Two conventions every tool table follows, because the shell depends on them:
 *   1. every row has `userId`
 *   2. anything that happens on a day has `date` as a local "YYYY-MM-DD"
 *      string, indexed by ["userId", "date"]
 *
 * Follow those two and a new tool gets the Today dashboard, the calendar,
 * and friend sharing without writing any shell code.
 */

export const toolKey = v.union(
  v.literal("water"),
  v.literal("workouts"),
  v.literal("classwork"),
  v.literal("calendar")
);

export const visibility = v.union(v.literal("private"), v.literal("friends"));

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    name: v.string(),
    handle: v.string(), // unique, lowercase — how friends find each other
    imageUrl: v.optional(v.string()),
    timezone: v.optional(v.string()),
  })
    .index("by_clerk", ["clerkId"])
    .index("by_handle", ["handle"]),

  friendships: defineTable({
    requesterId: v.id("users"),
    addresseeId: v.id("users"),
    status: v.union(v.literal("pending"), v.literal("accepted")),
  })
    .index("by_requester", ["requesterId", "status"])
    .index("by_addressee", ["addresseeId", "status"])
    .index("by_pair", ["requesterId", "addresseeId"]),

  // Per-tool sharing. Absent row means private — sharing is always opt-in.
  shareSettings: defineTable({
    userId: v.id("users"),
    tool: toolKey,
    visibility,
  }).index("by_user_tool", ["userId", "tool"]),

  goals: defineTable({
    userId: v.id("users"),
    tool: toolKey,
    target: v.number(), // water: ml/day. workouts: sessions/week.
  }).index("by_user_tool", ["userId", "tool"]),

  // ---- tools ----------------------------------------------------------

  waterLogs: defineTable({
    userId: v.id("users"),
    date: v.string(),
    amountMl: v.number(),
    loggedAt: v.number(),
  }).index("by_user_date", ["userId", "date"]),

  workouts: defineTable({
    userId: v.id("users"),
    date: v.string(),
    name: v.string(),
    notes: v.optional(v.string()),
    durationMin: v.optional(v.number()),
    finishedAt: v.optional(v.number()),
  }).index("by_user_date", ["userId", "date"]),

  workoutSets: defineTable({
    userId: v.id("users"),
    workoutId: v.id("workouts"),
    exercise: v.string(),
    reps: v.number(),
    weight: v.number(),
    unit: v.union(v.literal("kg"), v.literal("lb")),
    order: v.number(),
  })
    .index("by_workout", ["workoutId", "order"])
    .index("by_user_exercise", ["userId", "exercise"]),

  courses: defineTable({
    userId: v.id("users"),
    name: v.string(),
    code: v.optional(v.string()),
    color: v.string(),
    archived: v.optional(v.boolean()),
  }).index("by_user", ["userId"]),

  assignments: defineTable({
    userId: v.id("users"),
    courseId: v.optional(v.id("courses")),
    title: v.string(),
    date: v.string(), // due date
    status: v.union(v.literal("todo"), v.literal("doing"), v.literal("done")),
    notes: v.optional(v.string()),
    grade: v.optional(v.string()),
    // The day it was actually checked off, which is rarely the due date.
    // Kept separate so the calendar can show "due here, finished there".
    completedDate: v.optional(v.string()),
  })
    .index("by_user_date", ["userId", "date"])
    .index("by_user_status", ["userId", "status"])
    .index("by_user_completed", ["userId", "completedDate"])
    .index("by_course", ["courseId"]),

  events: defineTable({
    userId: v.id("users"),
    date: v.string(),
    title: v.string(),
    startMin: v.optional(v.number()), // minutes from local midnight
    endMin: v.optional(v.number()),
    location: v.optional(v.string()),
    notes: v.optional(v.string()),
    color: v.optional(v.string()),
  }).index("by_user_date", ["userId", "date"]),

  /**
   * Weekly repeats, stored as a rule rather than as hundreds of rows.
   *
   * The calendar expands these into "planned" occurrences at read time, so
   * changing the rule updates every future week at once and the table stays
   * one row per habit. An occurrence only becomes a real row when you
   * actually do the thing.
   */
  recurrences: defineTable({
    userId: v.id("users"),
    tool: v.union(v.literal("workouts"), v.literal("calendar")),
    title: v.string(),
    byDay: v.array(v.number()), // 0 = Sunday … 6 = Saturday
    startsOn: v.string(),
    endsOn: v.optional(v.string()),
    startMin: v.optional(v.number()),
    location: v.optional(v.string()),
  }).index("by_user", ["userId"]),

  // A friend tapping "nudge" on your water card.
  nudges: defineTable({
    fromId: v.id("users"),
    toId: v.id("users"),
    tool: toolKey,
    message: v.string(),
    readAt: v.optional(v.number()),
  }).index("by_to", ["toId"]),
});
