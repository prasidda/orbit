import { v } from "convex/values";
import { mutation, query, MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { getMe, requireUser } from "./lib/auth";
import { DEFAULT_GOAL_ML } from "./water";

function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 18);
  return base.length >= 3 ? base : `orbit${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * Water is the one tool that starts shared: a friend who sees nothing on day
 * one has no reason to come back. Seeding is idempotent and only ever fills a
 * *missing* row, so someone who deliberately turns water off stays off.
 */
async function seedDefaults(ctx: MutationCtx, userId: Id<"users">) {
  const share = await ctx.db
    .query("shareSettings")
    .withIndex("by_user_tool", (q) => q.eq("userId", userId).eq("tool", "water"))
    .unique();
  if (!share) {
    await ctx.db.insert("shareSettings", { userId, tool: "water", visibility: "friends" });
  }

  const goal = await ctx.db
    .query("goals")
    .withIndex("by_user_tool", (q) => q.eq("userId", userId).eq("tool", "water"))
    .unique();
  if (!goal) {
    await ctx.db.insert("goals", { userId, tool: "water", target: DEFAULT_GOAL_ML });
  }
}

/**
 * Called once on every sign-in. Clerk owns identity; this mirrors just enough
 * of it into Convex that other tables can reference a `users` row.
 */
export const store = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not signed in");

    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .unique();

    const name = identity.name ?? identity.email?.split("@")[0] ?? "Friend";

    if (existing) {
      // Keep name/avatar fresh, but never overwrite a handle the user chose.
      if (existing.name !== name || existing.imageUrl !== identity.pictureUrl) {
        await ctx.db.patch(existing._id, { name, imageUrl: identity.pictureUrl });
      }
      // Also backfills anyone who signed up before these defaults existed.
      await seedDefaults(ctx, existing._id);
      return existing._id;
    }

    // First sign-in: mint a unique handle.
    let handle = slugify(name);
    for (let i = 0; i < 20; i++) {
      const taken = await ctx.db
        .query("users")
        .withIndex("by_handle", (q) => q.eq("handle", handle))
        .unique();
      if (!taken) break;
      handle = `${slugify(name)}${Math.floor(Math.random() * 900 + 100)}`;
    }

    const userId = await ctx.db.insert("users", {
      clerkId: identity.subject,
      name,
      handle,
      imageUrl: identity.pictureUrl,
      timezone: "America/New_York",
    });
    await seedDefaults(ctx, userId);
    return userId;
  },
});

export const me = query({
  args: {},
  handler: async (ctx) => await getMe(ctx),
});

export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
    handle: v.optional(v.string()),
    timezone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx);

    if (args.handle && args.handle !== me.handle) {
      const clean = slugify(args.handle);
      const taken = await ctx.db
        .query("users")
        .withIndex("by_handle", (q) => q.eq("handle", clean))
        .unique();
      if (taken) throw new Error("That handle is already taken");
      await ctx.db.patch(me._id, { handle: clean });
    }

    const rest: Record<string, string> = {};
    if (args.name) rest.name = args.name;
    if (args.timezone) rest.timezone = args.timezone;
    if (Object.keys(rest).length) await ctx.db.patch(me._id, rest);
  },
});

/** Handle lookup for the "add a friend" box. Exact match only — no browsing. */
export const findByHandle = query({
  args: { handle: v.string() },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx);
    const found = await ctx.db
      .query("users")
      .withIndex("by_handle", (q) => q.eq("handle", args.handle.toLowerCase().replace(/^@/, "")))
      .unique();
    if (!found || found._id === me._id) return null;
    // Only ever expose the public card, never the whole row.
    return { _id: found._id, name: found.name, handle: found.handle, imageUrl: found.imageUrl };
  },
});
