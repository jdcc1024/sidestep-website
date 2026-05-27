import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUserOrNull } from "./_auth";

// Called client-side after every sign-in. Convex verifies the Clerk JWT
// automatically — no args needed, identity is read from auth context.
export const syncCurrentUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const clerkId = identity.subject;
    const email = identity.email ?? "";
    const name = identity.name ?? email;

    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { email, name });
      return existing._id;
    }

    return ctx.db.insert("users", {
      clerkId,
      email,
      name,
      isAdmin: false,
      createdAt: Date.now(),
    });
  },
});

// Called by the Clerk webhook on user.created and user.updated. The webhook
// is the only path that writes isAdmin — keeps Clerk's privateMetadata as
// the canonical source. syncCurrentUser (called from the browser) never
// touches isAdmin.
export const syncUser = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    isAdmin: v.boolean(),
  },
  handler: async (ctx, { clerkId, email, name, isAdmin }) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { email, name, isAdmin });
      return existing._id;
    }

    return ctx.db.insert("users", {
      clerkId,
      email,
      name,
      isAdmin,
      createdAt: Date.now(),
    });
  },
});

// Returns the currently authenticated user's record, or null if not found.
// Used by UserSync in providers.tsx to avoid calling syncCurrentUser when
// the user already exists in the database.
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    return getCurrentUserOrNull(ctx);
  },
});

export const getByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, { clerkId }) => {
    return ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
      .unique();
  },
});
