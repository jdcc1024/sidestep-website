import { ConvexError, v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";

// Server-side guards. Mirror lib/order.ts so the client and server cap
// values the same way — defense in depth against a hand-rolled client that
// posts past the form's maxLength.
const TEAM_NAME_MAX_LENGTH = 120;
const SPORT_MAX_LENGTH = 120;
const JERSEY_STYLE_MAX_LENGTH = 120;
const MIN_QUANTITY = 1;
const MAX_QUANTITY = 10_000;
const NECKLINES = ["Crew Neck", "V-Neck"] as const;
const SLEEVE_STYLES = ["Regular", "Raglan"] as const;
const INITIAL_INTERNAL_STAGE = "Inquiry";

async function requireCurrentUser(
  ctx: MutationCtx | QueryCtx,
): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError("Not authenticated.");
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
    .unique();
  if (!user) throw new ConvexError("User not found.");
  return user;
}

function requireShort(value: string, field: string, max: number): string {
  const trimmed = value.trim();
  if (!trimmed) throw new ConvexError(`${field} is required.`);
  if (trimmed.length > max) throw new ConvexError(`${field} is too long.`);
  return trimmed;
}

// Captain's own orders, newest first. Returns an empty array for the
// unauthenticated case and for signed-in users whose Convex `users` row
// hasn't been synced yet (first render before UserSync writes the row).
export const listMyOrders = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return [];

    return ctx.db
      .query("orders")
      .withIndex("by_captain", (q) => q.eq("captainId", user._id))
      .order("desc")
      .collect();
  },
});

export const createOrder = mutation({
  args: {
    teamName: v.string(),
    sport: v.string(),
    estimatedQuantity: v.number(),
    jerseyStyle: v.string(),
    neckline: v.string(),
    sleeveStyle: v.string(),
    hasOwnDesign: v.boolean(),
    designIds: v.array(v.id("designs")),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);

    const teamName = requireShort(args.teamName, "Team name", TEAM_NAME_MAX_LENGTH);
    const sport = requireShort(args.sport, "Sport", SPORT_MAX_LENGTH);
    const jerseyStyle = requireShort(
      args.jerseyStyle,
      "Jersey style",
      JERSEY_STYLE_MAX_LENGTH,
    );

    if (
      !Number.isFinite(args.estimatedQuantity) ||
      !Number.isInteger(args.estimatedQuantity) ||
      args.estimatedQuantity < MIN_QUANTITY ||
      args.estimatedQuantity > MAX_QUANTITY
    ) {
      throw new ConvexError(
        `Quantity must be a whole number between ${MIN_QUANTITY} and ${MAX_QUANTITY}.`,
      );
    }

    if (!(NECKLINES as readonly string[]).includes(args.neckline))
      throw new ConvexError("Invalid neckline.");
    if (!(SLEEVE_STYLES as readonly string[]).includes(args.sleeveStyle))
      throw new ConvexError("Invalid sleeve style.");

    // Each linked design must exist and be owned by this captain. Without
    // this check, a captain could link another user's designs by id.
    const uniqueDesignIds = Array.from(new Set(args.designIds));
    for (const designId of uniqueDesignIds) {
      const design = await ctx.db.get(designId);
      if (!design || design.ownerId !== user._id)
        throw new ConvexError("One of the linked designs is not yours.");
    }

    const now = Date.now();
    return ctx.db.insert("orders", {
      captainId: user._id,
      teamName,
      sport,
      estimatedQuantity: args.estimatedQuantity,
      jerseyStyle,
      neckline: args.neckline,
      sleeveStyle: args.sleeveStyle,
      hasOwnDesign: args.hasOwnDesign,
      designIds: uniqueDesignIds,
      internalStages: [{ name: INITIAL_INTERNAL_STAGE, completedAt: now }],
      createdAt: now,
      updatedAt: now,
    });
  },
});
