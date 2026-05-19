import { query } from "./_generated/server";

// Captain's own designs, newest first. Mirrors the auth/scoping shape of
// listMyOrders so the portal dashboard can fetch both with the same
// guarantees.
export const listMyDesigns = query({
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
      .query("designs")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .order("desc")
      .collect();
  },
});
