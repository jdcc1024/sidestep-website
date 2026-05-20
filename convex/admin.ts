import { ConvexError, v } from "convex/values";
import { query, type QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";

// Defense in depth — every admin query checks this. Even if the Next.js
// route gate is bypassed by a hand-rolled client call with a valid Clerk
// JWT, Convex will refuse to return data unless the calling user's row in
// our users table has isAdmin === true (kept in sync by the Clerk webhook).
async function requireAdmin(ctx: QueryCtx): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError("Not authenticated.");

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
    .unique();
  if (!user || !user.isAdmin) {
    throw new ConvexError("Admin access required.");
  }
  return user;
}

export const listOrders = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const orders = await ctx.db.query("orders").order("desc").collect();

    // N+1 captain lookup is fine — Sidestep's phase 1 volume is small and
    // captains repeat across orders. Caching by captainId keeps it lean.
    const captainCache = new Map<string, Doc<"users"> | null>();
    return Promise.all(
      orders.map(async (order) => {
        const key = order.captainId;
        let captain = captainCache.get(key);
        if (captain === undefined) {
          captain = await ctx.db.get(order.captainId);
          captainCache.set(key, captain);
        }
        return {
          ...order,
          captainName: captain?.name ?? "Unknown",
          captainEmail: captain?.email ?? "",
        };
      }),
    );
  },
});

export const listDesigns = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const designs = await ctx.db.query("designs").order("desc").collect();

    const ownerCache = new Map<string, Doc<"users"> | null>();
    return Promise.all(
      designs.map(async (design) => {
        const key = design.ownerId;
        let owner = ownerCache.get(key);
        if (owner === undefined) {
          owner = await ctx.db.get(design.ownerId);
          ownerCache.set(key, owner);
        }
        return {
          ...design,
          ownerName: owner?.name ?? "Unknown",
          ownerEmail: owner?.email ?? "",
        };
      }),
    );
  },
});

export const getOrder = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, { orderId }) => {
    await requireAdmin(ctx);

    const order = await ctx.db.get(orderId);
    if (!order) return null;

    const captain = await ctx.db.get(order.captainId);

    // Linked designs may be empty; resolve each in parallel and drop any
    // that have since been deleted so the UI never blows up on a stale id.
    const linkedDesigns = (
      await Promise.all(order.designIds.map((id) => ctx.db.get(id)))
    ).filter((d): d is Doc<"designs"> => d !== null);

    // Convex storage URLs are short-lived signed URLs — generated per query
    // so the admin can click through to the raw file. null is returned for
    // storage ids that no longer exist.
    const designs = await Promise.all(
      linkedDesigns.map(async (design) => {
        const fileUrls = await Promise.all(
          design.fileIds.map(async (storageId) => ({
            storageId,
            url: await ctx.storage.getUrl(storageId),
          })),
        );
        return { ...design, fileUrls };
      }),
    );

    const jerseyRun = await ctx.db
      .query("jerseyRuns")
      .withIndex("by_order", (q) => q.eq("orderId", order._id))
      .unique();

    const jerseyRunResponseCount = jerseyRun
      ? (
          await ctx.db
            .query("jerseyRunResponses")
            .withIndex("by_jerseyRun", (q) =>
              q.eq("jerseyRunId", jerseyRun._id),
            )
            .collect()
        ).length
      : 0;

    return {
      order,
      captain: captain
        ? { name: captain.name, email: captain.email, _id: captain._id }
        : null,
      designs,
      jerseyRun,
      jerseyRunResponseCount,
    };
  },
});
