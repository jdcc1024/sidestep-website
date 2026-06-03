// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

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
