// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

const modules = import.meta.glob("./**/*.*s");
const ONE_DAY = 24 * 60 * 60 * 1000;

// Same chain as the roster-entry tests: captain → design → order → run.
async function seedRun(t: ReturnType<typeof convexTest>) {
  const now = Date.now();
  const subject = "captain_clerk";
  const { userId, designId, orderId, runId } = await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", {
      clerkId: subject,
      email: "captain@example.com",
      name: "Cap",
      isAdmin: false,
      createdAt: now,
    });
    const designId = await ctx.db.insert("designs", {
      ownerId: userId,
      title: "Home",
      brief: "home kit",
      fileIds: [],
      createdAt: now,
      updatedAt: now,
    });
    const orderId = await ctx.db.insert("orders", {
      captainId: userId,
      teamName: "Falcons",
      sport: "Soccer",
      estimatedQuantity: 12,
      hasOwnDesign: false,
      designIds: [designId],
      internalStages: [{ name: "Inquiry", completedAt: now }],
      createdAt: now,
      updatedAt: now,
    });
    const runId = await ctx.db.insert("jerseyRuns", {
      orderId,
      captainId: userId,
      sizeOptions: ["S", "M", "L"],
      namesMode: "open",
      customQuestions: [],
      deadline: now + 7 * ONE_DAY,
      status: "open",
      createdAt: now,
    });
    return { userId, designId, orderId, runId };
  });
  return {
    userId,
    designId,
    orderId,
    runId,
    asCaptain: t.withIdentity({
      subject,
      email: "captain@example.com",
      name: "Cap",
    }),
  };
}

const submitter = {
  submitterName: "Fan One",
  submitterEmail: "fan@example.com",
};

describe("orderEntries.create", () => {
  it("creates a blank/bulk line with no roster entry", async () => {
    const t = convexTest(schema, modules);
    const { runId, designId, asCaptain } = await seedRun(t);

    const id = await asCaptain.mutation(api.orderEntries.create, {
      runId,
      designId,
      size: "M",
      qty: 5,
      ...submitter,
    });

    const entry = await t.run((ctx) => ctx.db.get(id));
    expect(entry?.rosterEntryId).toBeUndefined();
    expect(entry?.qty).toBe(5);
    expect(entry?.submitterEmail).toBe("fan@example.com");
    expect(entry?.source).toBe("captain");
  });

  it("attaches to a roster entry on the same run + design", async () => {
    const t = convexTest(schema, modules);
    const { runId, designId, asCaptain } = await seedRun(t);
    const rosterEntryId = await asCaptain.mutation(api.rosterEntries.create, {
      runId,
      designId,
      name: "Gretzky",
      number: "99",
    });

    const id = await asCaptain.mutation(api.orderEntries.create, {
      runId,
      designId,
      rosterEntryId,
      size: "L",
      qty: 1,
      source: "fan",
      ...submitter,
    });

    const entry = await t.run((ctx) => ctx.db.get(id));
    expect(entry?.rosterEntryId).toBe(rosterEntryId);
    expect(entry?.source).toBe("fan");
  });

  it("rejects a roster entry from a different design", async () => {
    const t = convexTest(schema, modules);
    const { runId, designId, asCaptain, userId, orderId } = await seedRun(t);
    // Add a second design to the order and a roster entry on it.
    const otherDesignId = await t.run(async (ctx) => {
      const d = await ctx.db.insert("designs", {
        ownerId: userId,
        title: "Away",
        brief: "away kit",
        fileIds: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      const order = await ctx.db.get(orderId);
      await ctx.db.patch(orderId, { designIds: [...order!.designIds, d] });
      return d;
    });
    const otherSlot = await asCaptain.mutation(api.rosterEntries.create, {
      runId,
      designId: otherDesignId,
      name: "Luongo",
      number: "1",
    });

    await expect(
      asCaptain.mutation(api.orderEntries.create, {
        runId,
        designId, // Home design, but slot is on Away
        rosterEntryId: otherSlot,
        size: "M",
        qty: 1,
        ...submitter,
      }),
    ).rejects.toThrow(/different design/);
  });

  it("rejects a size not in the run's options", async () => {
    const t = convexTest(schema, modules);
    const { runId, designId, asCaptain } = await seedRun(t);
    await expect(
      asCaptain.mutation(api.orderEntries.create, {
        runId,
        designId,
        size: "XXXL",
        qty: 1,
        ...submitter,
      }),
    ).rejects.toThrow();
  });

  it("rejects a zero quantity", async () => {
    const t = convexTest(schema, modules);
    const { runId, designId, asCaptain } = await seedRun(t);
    await expect(
      asCaptain.mutation(api.orderEntries.create, {
        runId,
        designId,
        size: "M",
        qty: 0,
        ...submitter,
      }),
    ).rejects.toThrow();
  });
});

describe("orderEntries.listByRun", () => {
  it("returns every order entry on the run for the captain", async () => {
    const t = convexTest(schema, modules);
    const { runId, designId, asCaptain } = await seedRun(t);
    await asCaptain.mutation(api.orderEntries.create, {
      runId,
      designId,
      size: "M",
      qty: 2,
      ...submitter,
    });
    await asCaptain.mutation(api.orderEntries.create, {
      runId,
      designId,
      size: "L",
      qty: 3,
      ...submitter,
    });

    const entries = await asCaptain.query(api.orderEntries.listByRun, {
      runId,
    });
    expect(entries).toHaveLength(2);
    expect(entries.reduce((sum, e) => sum + e.qty, 0)).toBe(5);
  });
});

// Adds a second design (Away) to the order so the per-design grouping has
// something to split across. Returns its id.
async function addAwayDesign(
  t: ReturnType<typeof convexTest>,
  userId: Id<"users">,
  orderId: Id<"orders">,
) {
  return t.run(async (ctx) => {
    const d = await ctx.db.insert("designs", {
      ownerId: userId,
      title: "Away",
      brief: "away kit",
      fileIds: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    const order = await ctx.db.get(orderId);
    await ctx.db.patch(orderId, { designIds: [...order!.designIds, d] });
    return d;
  });
}

describe("orderEntries.countsByRun", () => {
  it("totals Σ qty and groups per design, counting blank lines and zeroing empty slots", async () => {
    const t = convexTest(schema, modules);
    const { runId, designId, orderId, userId, asCaptain } = await seedRun(t);
    const awayId = await addAwayDesign(t, userId, orderId);

    // A filled slot on Home (qty 2).
    const slot = await asCaptain.mutation(api.rosterEntries.create, {
      runId,
      designId,
      name: "Gretzky",
      number: "99",
    });
    await asCaptain.mutation(api.orderEntries.create, {
      runId,
      designId,
      rosterEntryId: slot,
      size: "M",
      qty: 2,
      ...submitter,
    });
    // A not-yet-filled slot on Home — a roster entry with no order entry.
    await asCaptain.mutation(api.rosterEntries.create, {
      runId,
      designId,
      name: "Lemieux",
      number: "66",
    });
    // A blank/bulk line on Home (no roster entry), qty 3.
    await asCaptain.mutation(api.orderEntries.create, {
      runId,
      designId,
      size: "L",
      qty: 3,
      ...submitter,
    });
    // An order entry on Away, qty 4.
    await asCaptain.mutation(api.orderEntries.create, {
      runId,
      designId: awayId,
      size: "S",
      qty: 4,
      ...submitter,
    });

    const counts = await asCaptain.query(api.orderEntries.countsByRun, {
      runId,
    });

    expect(counts.total).toBe(9); // 2 + 3 + 4; empty slot contributes 0
    expect(counts.byDesign).toEqual([
      { designId, title: "Home", total: 5 },
      { designId: awayId, title: "Away", total: 4 },
    ]);
  });

  it("excludes order entries on a design removed from the order", async () => {
    const t = convexTest(schema, modules);
    const { runId, designId, orderId, userId, asCaptain } = await seedRun(t);
    const awayId = await addAwayDesign(t, userId, orderId);

    await asCaptain.mutation(api.orderEntries.create, {
      runId,
      designId,
      size: "M",
      qty: 2,
      ...submitter,
    });
    await asCaptain.mutation(api.orderEntries.create, {
      runId,
      designId: awayId,
      size: "L",
      qty: 4,
      ...submitter,
    });

    // Remove Away from the order — its entries become "removed-design" rows.
    await t.run(async (ctx) => {
      await ctx.db.patch(orderId, { designIds: [designId] });
    });

    const counts = await asCaptain.query(api.orderEntries.countsByRun, {
      runId,
    });
    expect(counts.total).toBe(2); // Away's 4 dropped out
    expect(counts.byDesign).toEqual([{ designId, title: "Home", total: 2 }]);
  });

  it("returns an empty shape for a missing run", async () => {
    const t = convexTest(schema, modules);
    const { runId, asCaptain } = await seedRun(t);
    // Delete the run so its id dangles — the query should return the empty
    // shape rather than throw.
    await t.run(async (ctx) => {
      await ctx.db.delete(runId);
    });

    const counts = await asCaptain.query(api.orderEntries.countsByRun, {
      runId,
    });
    expect(counts).toEqual({ total: 0, byDesign: [] });
  });

  it("rejects a non-captain non-admin", async () => {
    const t = convexTest(schema, modules);
    const { runId } = await seedRun(t);

    const asStranger = t.withIdentity({
      subject: "stranger_clerk",
      email: "stranger@example.com",
      name: "Nobody",
    });
    await t.run(async (ctx) => {
      await ctx.db.insert("users", {
        clerkId: "stranger_clerk",
        email: "stranger@example.com",
        name: "Nobody",
        isAdmin: false,
        createdAt: Date.now(),
      });
    });

    await expect(
      asStranger.query(api.orderEntries.countsByRun, { runId }),
    ).rejects.toThrow(/access/);
  });
});
