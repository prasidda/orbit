import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { requireUser, canView, areFriends, Ctx } from "./lib/auth";

type PublicUser = { _id: Id<"users">; name: string; handle: string; imageUrl?: string };

function publicUser(u: Doc<"users">): PublicUser {
  return { _id: u._id, name: u.name, handle: u.handle, imageUrl: u.imageUrl };
}

/** Shared by `list` and `dailyStats` so the two can never disagree. */
async function acceptedFriends(ctx: Ctx, meId: Id<"users">): Promise<PublicUser[]> {
  const asRequester = await ctx.db
    .query("friendships")
    .withIndex("by_requester", (q) => q.eq("requesterId", meId).eq("status", "accepted"))
    .collect();
  const asAddressee = await ctx.db
    .query("friendships")
    .withIndex("by_addressee", (q) => q.eq("addresseeId", meId).eq("status", "accepted"))
    .collect();

  const out: PublicUser[] = [];
  for (const row of [...asRequester, ...asAddressee]) {
    const otherId = row.requesterId === meId ? row.addresseeId : row.requesterId;
    const other = await ctx.db.get(otherId);
    if (other) out.push(publicUser(other));
  }
  return out;
}

export const request = mutation({
  args: { handle: v.string() },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx);
    const them = await ctx.db
      .query("users")
      .withIndex("by_handle", (q) => q.eq("handle", args.handle.toLowerCase().replace(/^@/, "")))
      .unique();

    if (!them) throw new Error("No one here with that handle");
    if (them._id === me._id) throw new Error("You're already yourself");
    if (await areFriends(ctx, me._id, them._id)) throw new Error("You're already friends");

    // If they already asked you, accept instead of creating a mirror request.
    const incoming = await ctx.db
      .query("friendships")
      .withIndex("by_pair", (q) => q.eq("requesterId", them._id).eq("addresseeId", me._id))
      .unique();
    if (incoming) {
      await ctx.db.patch(incoming._id, { status: "accepted" });
      return "accepted" as const;
    }

    const outgoing = await ctx.db
      .query("friendships")
      .withIndex("by_pair", (q) => q.eq("requesterId", me._id).eq("addresseeId", them._id))
      .unique();
    if (outgoing) return "pending" as const;

    await ctx.db.insert("friendships", {
      requesterId: me._id,
      addresseeId: them._id,
      status: "pending",
    });
    return "pending" as const;
  },
});

export const respond = mutation({
  args: { friendshipId: v.id("friendships"), accept: v.boolean() },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx);
    const row = await ctx.db.get(args.friendshipId);
    // Only the addressee may answer, and only a pending request.
    if (!row || row.addresseeId !== me._id || row.status !== "pending") {
      throw new Error("Not found");
    }
    if (args.accept) await ctx.db.patch(row._id, { status: "accepted" });
    else await ctx.db.delete(row._id);
  },
});

export const remove = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx);
    for (const [a, b] of [
      [me._id, args.userId],
      [args.userId, me._id],
    ] as const) {
      const row = await ctx.db
        .query("friendships")
        .withIndex("by_pair", (q) => q.eq("requesterId", a).eq("addresseeId", b))
        .unique();
      if (row) await ctx.db.delete(row._id);
    }
  },
});

/** Accepted friends, plus requests waiting on each side. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireUser(ctx);
    const friends = await acceptedFriends(ctx, me._id);

    const hydrate = async (id: Id<"users">) => {
      const u = await ctx.db.get(id);
      return u ? publicUser(u) : null;
    };

    const incomingRows = await ctx.db
      .query("friendships")
      .withIndex("by_addressee", (q) => q.eq("addresseeId", me._id).eq("status", "pending"))
      .collect();
    const outgoingRows = await ctx.db
      .query("friendships")
      .withIndex("by_requester", (q) => q.eq("requesterId", me._id).eq("status", "pending"))
      .collect();

    const incoming = [];
    for (const row of incomingRows) {
      const user = await hydrate(row.requesterId);
      if (user) incoming.push({ friendshipId: row._id, user });
    }
    const outgoing = [];
    for (const row of outgoingRows) {
      const user = await hydrate(row.addresseeId);
      if (user) outgoing.push({ friendshipId: row._id, user });
    }

    return { friends, incoming, outgoing };
  },
});

/**
 * The live friend feed.
 *
 * Every per-tool field passes through `canView`, so a friend who hasn't
 * shared that tool yields `null` and the client renders "not shared" — the
 * query itself can never leak a number.
 */
export const dailyStats = query({
  args: { date: v.string() },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx);
    const friends = await acceptedFriends(ctx, me._id);

    const stats = [];
    for (const friend of friends) {
      let water: { totalMl: number; goalMl: number; lastLoggedAt: number | null } | null = null;

      if (await canView(ctx, friend._id, "water")) {
        const logs = await ctx.db
          .query("waterLogs")
          .withIndex("by_user_date", (q) => q.eq("userId", friend._id).eq("date", args.date))
          .collect();
        const goal = await ctx.db
          .query("goals")
          .withIndex("by_user_tool", (q) => q.eq("userId", friend._id).eq("tool", "water"))
          .unique();
        water = {
          totalMl: logs.reduce((sum, l) => sum + l.amountMl, 0),
          goalMl: goal?.target ?? 3000,
          lastLoggedAt: logs.length ? Math.max(...logs.map((l) => l.loggedAt)) : null,
        };
      }

      let workouts: { count: number; names: string[] } | null = null;
      if (await canView(ctx, friend._id, "workouts")) {
        const rows = await ctx.db
          .query("workouts")
          .withIndex("by_user_date", (q) => q.eq("userId", friend._id).eq("date", args.date))
          .collect();
        workouts = { count: rows.length, names: rows.map((r) => r.name) };
      }

      stats.push({ user: friend, water, workouts });
    }

    return stats;
  },
});

/** A friendly poke. Rate-limited to one unread nudge per friend per tool. */
export const nudge = mutation({
  args: { userId: v.id("users"), tool: v.union(v.literal("water"), v.literal("workouts")), message: v.string() },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx);
    if (!(await areFriends(ctx, me._id, args.userId))) throw new Error("Not found");

    const existing = await ctx.db
      .query("nudges")
      .withIndex("by_to", (q) => q.eq("toId", args.userId))
      .collect();
    const alreadyWaiting = existing.some(
      (n) => n.fromId === me._id && n.tool === args.tool && !n.readAt
    );
    if (alreadyWaiting) return;

    await ctx.db.insert("nudges", {
      fromId: me._id,
      toId: args.userId,
      tool: args.tool,
      message: args.message.slice(0, 140),
    });
  },
});
