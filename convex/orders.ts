import { query } from "./_generated/server";

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
