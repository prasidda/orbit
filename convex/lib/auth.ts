import { QueryCtx, MutationCtx } from "../_generated/server";
import { Doc, Id } from "../_generated/dataModel";

export type Ctx = QueryCtx | MutationCtx;
export type Tool = "water" | "workouts" | "classwork" | "calendar";
export type Visibility = "private" | "friends";

/**
 * What a tool shares before the user has said anything.
 *
 * Water is on: a friend who sees nothing on day one has no reason to come
 * back, and a daily water total is about as low-stakes as shared data gets.
 * Everything else is off, and any explicit choice writes a row that wins over
 * this table — including turning water off.
 *
 * This is a default rather than seeded rows on purpose: it applies to accounts
 * that already existed, with no backfill to run.
 */
export const DEFAULT_VISIBILITY: Record<Tool, Visibility> = {
  water: "friends",
  workouts: "private",
  classwork: "private",
  calendar: "private",
};

/**
 * THE AUTHORIZATION SURFACE.
 *
 * Every function in this app starts with `requireUser`, and every read of
 * somebody else's data goes through `assertCanView`. Nothing else is allowed
 * to decide who can see what — one place to get right, one place to test.
 */

export async function getMe(ctx: Ctx): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return await ctx.db
    .query("users")
    .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
    .unique();
}

export async function requireUser(ctx: Ctx): Promise<Doc<"users">> {
  const me = await getMe(ctx);
  if (!me) throw new Error("Not signed in");
  return me;
}

export async function areFriends(
  ctx: Ctx,
  a: Id<"users">,
  b: Id<"users">
): Promise<boolean> {
  if (a === b) return true;
  const forward = await ctx.db
    .query("friendships")
    .withIndex("by_pair", (q) => q.eq("requesterId", a).eq("addresseeId", b))
    .unique();
  if (forward?.status === "accepted") return true;

  const back = await ctx.db
    .query("friendships")
    .withIndex("by_pair", (q) => q.eq("requesterId", b).eq("addresseeId", a))
    .unique();
  return back?.status === "accepted";
}

export async function canView(
  ctx: Ctx,
  ownerId: Id<"users">,
  tool: Tool
): Promise<boolean> {
  const me = await getMe(ctx);
  if (!me) return false;
  if (me._id === ownerId) return true;

  // An explicit row always wins; otherwise fall back to the tool's default.
  const share = await ctx.db
    .query("shareSettings")
    .withIndex("by_user_tool", (q) => q.eq("userId", ownerId).eq("tool", tool))
    .unique();
  if ((share?.visibility ?? DEFAULT_VISIBILITY[tool]) !== "friends") return false;

  return await areFriends(ctx, me._id, ownerId);
}

export async function assertCanView(
  ctx: Ctx,
  ownerId: Id<"users">,
  tool: Tool
): Promise<void> {
  if (!(await canView(ctx, ownerId, tool))) {
    // Deliberately vague: don't confirm the row exists to someone who can't see it.
    throw new Error("Not found");
  }
}

/** Guards writes — you may only ever write your own rows. */
export async function assertOwner(
  ctx: Ctx,
  ownerId: Id<"users">
): Promise<Doc<"users">> {
  const me = await requireUser(ctx);
  if (me._id !== ownerId) throw new Error("Not found");
  return me;
}
