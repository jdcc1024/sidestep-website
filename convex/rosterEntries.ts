import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  requireCurrentUser,
  requireOrderOwnership,
} from "./_auth";
import {
  checkRosterName,
  checkRosterNumber,
} from "../lib/rosterEntry/rules";

// Create a roster entry — a name+number player slot on one of the order's
// designs (R-01 foundation; the captain-seeding UI lands in R-03, the fan
// attach path in R-02). Takes the run id and resolves the order from it,
// since the run is 1:1 with the order and carries the ownership we gate
// on. `source` defaults to "captain" — the seeding path; R-02 passes
// "fan" from the public submission.
export const create = mutation({
  args: {
    runId: v.id("jerseyRuns"),
    designId: v.id("designs"),
    name: v.string(),
    number: v.optional(v.string()),
    source: v.optional(v.union(v.literal("captain"), v.literal("fan"))),
  },
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (!run) throw new ConvexError("Jersey run not found.");
    const { order } = await requireOrderOwnership(ctx, run.orderId);

    // A roster entry belongs to a design the order actually links — a
    // slot on a design that isn't on the order has no home.
    if (!order.designIds.includes(args.designId))
      throw new ConvexError("That design isn't part of this order.");

    const nameCheck = checkRosterName(args.name);
    if (!nameCheck.ok) throw new ConvexError(nameCheck.error);

    const numberCheck = checkRosterNumber(args.number);
    if (!numberCheck.ok) throw new ConvexError(numberCheck.error);

    return ctx.db.insert("rosterEntries", {
      runId: args.runId,
      orderId: run.orderId,
      designId: args.designId,
      name: nameCheck.value,
      number: numberCheck.value,
      source: args.source ?? "captain",
      createdAt: Date.now(),
    });
  },
});

// Every roster entry on a run, for the captain dashboard / order page
// (R-03, R-04 consume this). Captain or admin only. Returns [] for a
// missing run so a deleted run renders empty rather than throwing.
export const listByRun = query({
  args: { runId: v.id("jerseyRuns") },
  handler: async (ctx, { runId }) => {
    const run = await ctx.db.get(runId);
    if (!run) return [];

    const user = await requireCurrentUser(ctx);
    if (run.captainId !== user._id && !user.isAdmin)
      throw new ConvexError("You don't have access to this jersey run.");

    return ctx.db
      .query("rosterEntries")
      .withIndex("by_run", (q) => q.eq("runId", runId))
      .collect();
  },
});
