import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
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
import {
  checkRosterName,
  checkRosterNumber,
  rosterMatchKey,
} from "../lib/rosterEntry/rules";
import { checkCustomAnswer, isJerseyRunClosed } from "../lib/jerseyRunResponse/rules";

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

// Derived production counts for a run (R-04) — the live total the order
// page (O-07) reads, plus the same Σ qty grouped by design. The total is
// scoped to the order's *current* designs: an entry on a since-removed
// design (no longer in `order.designIds`) drops out of both the per-design
// breakdown and the grand total, so `total` always reconciles with the sum
// of `byDesign`. Not-yet-filled roster slots have no order entries and so
// contribute 0; blank/bulk lines (no slot) count by their qty like any
// other. `byDesign` lists every linked design in order — a design with no
// entries shows total 0. Captain or admin only; a stable empty shape for a
// missing run/order so the consumer never null-checks.
export const countsByRun = query({
  args: { runId: v.id("jerseyRuns") },
  handler: async (ctx, { runId }) => {
    const empty: {
      total: number;
      byDesign: Array<{ designId: Id<"designs">; title: string; total: number }>;
    } = { total: 0, byDesign: [] };

    const run = await ctx.db.get(runId);
    if (!run) return empty;

    const user = await requireCurrentUser(ctx);
    if (run.captainId !== user._id && !user.isAdmin)
      throw new ConvexError("You don't have access to this jersey run.");

    const order = await ctx.db.get(run.orderId);
    if (!order) return empty;

    const entries = await ctx.db
      .query("orderEntries")
      .withIndex("by_run", (q) => q.eq("runId", runId))
      .collect();

    // One pass tallies Σ qty per design id across every entry on the run.
    const qtyByDesign = new Map<string, number>();
    for (const e of entries)
      qtyByDesign.set(e.designId, (qtyByDesign.get(e.designId) ?? 0) + e.qty);

    // Project onto the order's current designs only — this is what excludes
    // removed-design entries (their qty is in the map but never read).
    const byDesign = await Promise.all(
      order.designIds.map(async (designId) => {
        const design = await ctx.db.get(designId);
        return {
          designId,
          title: design?.title ?? "Untitled design",
          total: qtyByDesign.get(designId) ?? 0,
        };
      }),
    );
    const total = byDesign.reduce((sum, d) => sum + d.total, 0);

    return { total, byDesign };
  },
});

// Public — no auth. The fan submission path (R-02), replacing the legacy
// jerseyRuns.submitResponse. One submission carries the fan's identity
// plus 1..N jersey lines spanning the order's designs. Each line becomes
// one order entry; a named line attaches to (or mints) a roster slot,
// while a blank line is a bulk/spare jersey with no slot. Grouping is
// emergent — every line carries the same normalized submitter email, so a
// returning fan's later submission joins their existing group with no
// batch id. Re-validates everything the client checked, since this is the
// one surface anyone on the internet can hit.
export const submitOrder = mutation({
  args: {
    jerseyRunId: v.id("jerseyRuns"),
    submitterName: v.string(),
    submitterEmail: v.string(),
    customAnswers: v.record(v.string(), v.string()),
    lines: v.array(
      v.object({
        designId: v.id("designs"),
        // An explicit slot pick (the fixed-mode picker). When present we
        // attach to it directly; otherwise we match/mint by name+number.
        rosterEntryId: v.optional(v.id("rosterEntries")),
        name: v.optional(v.string()),
        number: v.optional(v.string()),
        size: v.string(),
        qty: v.number(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.jerseyRunId);
    if (!run) throw new ConvexError("Jersey run not found.");
    if (isJerseyRunClosed(run))
      throw new ConvexError("This jersey run is closed.");

    const order = await ctx.db.get(run.orderId);
    if (!order) throw new ConvexError("Order not found.");

    const nameCheck = checkSubmitterName(args.submitterName);
    if (!nameCheck.ok) throw new ConvexError(nameCheck.error);
    const emailCheck = checkSubmitterEmail(args.submitterEmail);
    if (!emailCheck.ok) throw new ConvexError(emailCheck.error);

    if (args.lines.length === 0)
      throw new ConvexError("Add at least one jersey.");

    // Keep only answers to questions the run actually asks — a stale form
    // snapshot (captain edited questions after sharing the link) can carry
    // extras. The same record rides on every line of this submission.
    const knownQuestionIds = new Set(run.customQuestions.map((q) => q.id));
    const customAnswers: Record<string, string> = {};
    for (const [id, value] of Object.entries(args.customAnswers)) {
      if (!knownQuestionIds.has(id)) continue;
      const result = checkCustomAnswer(value);
      if (!result.ok) throw new ConvexError(result.error);
      if (result.value.length > 0) customAnswers[id] = result.value;
    }
    const hasAnswers = Object.keys(customAnswers).length > 0;

    // Existing roster slots on the run, keyed for attach-on-match. New
    // slots minted mid-submission are added to the map so two lines that
    // name the same player resolve to one slot.
    const existingRoster = await ctx.db
      .query("rosterEntries")
      .withIndex("by_run", (q) => q.eq("runId", args.jerseyRunId))
      .collect();
    const slotByKey = new Map<string, Id<"rosterEntries">>();
    for (const r of existingRoster)
      slotByKey.set(rosterMatchKey(r.designId, r.name, r.number), r._id);

    // Which submitter emails already sit on each slot — drives open-mode
    // collision detection (a *different* fan claiming the same slot).
    const priorEntries = await ctx.db
      .query("orderEntries")
      .withIndex("by_run", (q) => q.eq("runId", args.jerseyRunId))
      .collect();
    const emailsBySlot = new Map<string, Set<string>>();
    for (const e of priorEntries) {
      if (!e.rosterEntryId) continue;
      const set = emailsBySlot.get(e.rosterEntryId) ?? new Set<string>();
      set.add(e.submitterEmail);
      emailsBySlot.set(e.rosterEntryId, set);
    }

    const now = Date.now();
    const results: Array<{
      orderEntryId: Id<"orderEntries">;
      designId: Id<"designs">;
      rosterEntryId: Id<"rosterEntries"> | undefined;
      attached: boolean;
      collision: boolean;
    }> = [];

    for (const line of args.lines) {
      if (!order.designIds.includes(line.designId))
        throw new ConvexError("That design isn't part of this order.");

      const sizeCheck = checkSize(line.size, run.sizeOptions);
      if (!sizeCheck.ok) throw new ConvexError(sizeCheck.error);
      const qtyCheck = checkQty(line.qty);
      if (!qtyCheck.ok) throw new ConvexError(qtyCheck.error);

      let rosterEntryId: Id<"rosterEntries"> | undefined;
      let attached = false;

      if (line.rosterEntryId) {
        // Explicit pick (fixed-mode dropdown) — validate it belongs here.
        const slot = await ctx.db.get(line.rosterEntryId);
        if (!slot || slot.runId !== args.jerseyRunId)
          throw new ConvexError("That player slot isn't on this run.");
        if (slot.designId !== line.designId)
          throw new ConvexError("That player slot is on a different design.");
        rosterEntryId = slot._id;
        attached = true;
      } else {
        const numberCheck = checkRosterNumber(line.number);
        if (!numberCheck.ok) throw new ConvexError(numberCheck.error);

        const rawName = (line.name ?? "").trim();
        if (rawName.length > 0) {
          const rosterNameCheck = checkRosterName(line.name ?? "");
          if (!rosterNameCheck.ok)
            throw new ConvexError(rosterNameCheck.error);
          const key = rosterMatchKey(
            line.designId,
            rosterNameCheck.value,
            numberCheck.value,
          );
          const matched = slotByKey.get(key);
          if (matched) {
            rosterEntryId = matched;
            attached = true;
          } else {
            rosterEntryId = await ctx.db.insert("rosterEntries", {
              runId: args.jerseyRunId,
              orderId: run.orderId,
              designId: line.designId,
              name: rosterNameCheck.value,
              number: numberCheck.value,
              source: "fan",
              createdAt: now,
            });
            slotByKey.set(key, rosterEntryId);
          }
        }
        // No name → blank/bulk line: rosterEntryId stays undefined.
      }

      // Open-mode collision: attaching to a slot another submitter already
      // claims. Fixed mode expects shared seeded slots, so it never flags.
      let collision = false;
      if (attached && rosterEntryId && run.namesMode === "open") {
        const claimants = emailsBySlot.get(rosterEntryId);
        if (claimants && [...claimants].some((e) => e !== emailCheck.value))
          collision = true;
      }

      const orderEntryId = await ctx.db.insert("orderEntries", {
        runId: args.jerseyRunId,
        designId: line.designId,
        rosterEntryId,
        size: sizeCheck.value,
        qty: qtyCheck.value,
        source: "fan",
        submitterName: nameCheck.value,
        submitterEmail: emailCheck.value,
        customAnswers: hasAnswers ? customAnswers : undefined,
        createdAt: now,
      });

      if (rosterEntryId) {
        const set = emailsBySlot.get(rosterEntryId) ?? new Set<string>();
        set.add(emailCheck.value);
        emailsBySlot.set(rosterEntryId, set);
      }

      results.push({
        orderEntryId,
        designId: line.designId,
        rosterEntryId,
        attached,
        collision,
      });
    }

    return {
      submitterEmail: emailCheck.value,
      created: results.length,
      collisions: results.filter((r) => r.collision).length,
      entries: results,
    };
  },
});
