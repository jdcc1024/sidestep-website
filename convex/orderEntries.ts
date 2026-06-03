import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  requireCurrentUser,
  requireOrderOwnership,
} from "./_auth";
import {
  checkQty,
  checkSize,
  checkSubmitterEmail,
  checkSubmitterName,
} from "../lib/orderEntry/rules";

// Create one order entry — a jersey to produce (R-01 foundation; the
// multi-line public fan submission lands in R-02). Gated on order
// ownership via the run. A `rosterEntryId` is optional: omit it for a
// blank/bulk line (a spare jersey with no player slot); pass it to tie
// the jersey to a slot, in which case the slot must belong to the same
// run and design.
export const create = mutation({
  args: {
    runId: v.id("jerseyRuns"),
    designId: v.id("designs"),
    rosterEntryId: v.optional(v.id("rosterEntries")),
    size: v.string(),
    qty: v.number(),
    submitterName: v.string(),
    submitterEmail: v.string(),
    source: v.optional(v.union(v.literal("captain"), v.literal("fan"))),
  },
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (!run) throw new ConvexError("Jersey run not found.");
    const { order } = await requireOrderOwnership(ctx, run.orderId);

    if (!order.designIds.includes(args.designId))
      throw new ConvexError("That design isn't part of this order.");

    if (args.rosterEntryId) {
      const rosterEntry = await ctx.db.get(args.rosterEntryId);
      if (!rosterEntry || rosterEntry.runId !== args.runId)
        throw new ConvexError("That player slot isn't on this run.");
      if (rosterEntry.designId !== args.designId)
        throw new ConvexError("That player slot is on a different design.");
    }

    const sizeCheck = checkSize(args.size, run.sizeOptions);
    if (!sizeCheck.ok) throw new ConvexError(sizeCheck.error);

    const qtyCheck = checkQty(args.qty);
    if (!qtyCheck.ok) throw new ConvexError(qtyCheck.error);

    const nameCheck = checkSubmitterName(args.submitterName);
    if (!nameCheck.ok) throw new ConvexError(nameCheck.error);

    const emailCheck = checkSubmitterEmail(args.submitterEmail);
    if (!emailCheck.ok) throw new ConvexError(emailCheck.error);

    return ctx.db.insert("orderEntries", {
      runId: args.runId,
      designId: args.designId,
      rosterEntryId: args.rosterEntryId,
      size: sizeCheck.value,
      qty: qtyCheck.value,
      source: args.source ?? "captain",
      submitterName: nameCheck.value,
      submitterEmail: emailCheck.value,
      createdAt: Date.now(),
    });
  },
});

// Every order entry on a run — the rows the derived-count query (R-04)
// sums and the dashboard lists. Captain or admin only. Returns [] for a
// missing run.
export const listByRun = query({
  args: { runId: v.id("jerseyRuns") },
  handler: async (ctx, { runId }) => {
    const run = await ctx.db.get(runId);
    if (!run) return [];

    const user = await requireCurrentUser(ctx);
    if (run.captainId !== user._id && !user.isAdmin)
      throw new ConvexError("You don't have access to this jersey run.");

    return ctx.db
      .query("orderEntries")
      .withIndex("by_run", (q) => q.eq("runId", runId))
      .collect();
  },
});
