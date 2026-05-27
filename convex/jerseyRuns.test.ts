// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

const modules = import.meta.glob("./**/*.*s");

async function seedCaptainWithOrder(
  t: ReturnType<typeof convexTest>,
  subject = "user_captain_clerk",
  opts: { isAdmin?: boolean } = {},
) {
  const userId = await t.run((ctx) =>
    ctx.db.insert("users", {
      clerkId: subject,
      email: "captain@example.com",
      name: "Cap",
      isAdmin: opts.isAdmin ?? false,
      createdAt: Date.now(),
    }),
  );
  const orderId = await t.run((ctx) =>
    ctx.db.insert("orders", {
      captainId: userId,
      teamName: "Falcons",
      sport: "Soccer",
      estimatedQuantity: 12,
      jerseyStyle: "Classic",
      neckline: "Crew Neck",
      sleeveStyle: "Regular",
      hasOwnDesign: false,
      designIds: [],
      internalStages: [{ name: "Inquiry", completedAt: Date.now() }],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }),
  );
  return {
    userId,
    orderId,
    asUser: t.withIdentity({
      subject,
      email: "captain@example.com",
      name: "Cap",
    }),
  };
}

const ONE_DAY = 24 * 60 * 60 * 1000;

function validRunArgs(orderId: Id<"orders">) {
  return {
    orderId,
    sizeOptions: ["S", "M", "L"],
    namesMode: "open" as const,
    fixedRoster: [] as { name: string; number?: string }[],
    customQuestions: [],
    deadline: Date.now() + 7 * ONE_DAY,
  };
}

describe("jerseyRuns.create", () => {
  it("creates an open run for the captain's order", async () => {
    const t = convexTest(schema, modules);
    const { userId, orderId, asUser } = await seedCaptainWithOrder(t);

    const runId = await asUser.mutation(
      api.jerseyRuns.create,
      validRunArgs(orderId),
    );
    const row = await t.run((ctx) => ctx.db.get(runId));
    expect(row).toMatchObject({
      orderId,
      captainId: userId,
      status: "open",
      namesMode: "open",
    });
    expect(row?.sizeOptions).toEqual(["S", "M", "L"]);
  });

  it("rejects creating a second run for the same order", async () => {
    const t = convexTest(schema, modules);
    const { orderId, asUser } = await seedCaptainWithOrder(t);
    await asUser.mutation(api.jerseyRuns.create, validRunArgs(orderId));

    await expect(
      asUser.mutation(api.jerseyRuns.create, validRunArgs(orderId)),
    ).rejects.toThrow(/already has a jersey run/);
  });

  it("rejects creating a run on someone else's order", async () => {
    const t = convexTest(schema, modules);
    const { orderId } = await seedCaptainWithOrder(t, "user_captain_clerk");
    await t.run((ctx) =>
      ctx.db.insert("users", {
        clerkId: "user_other_clerk",
        email: "other@example.com",
        name: "Other",
        isAdmin: false,
        createdAt: Date.now(),
      }),
    );
    const asOther = t.withIdentity({
      subject: "user_other_clerk",
      email: "other@example.com",
      name: "Other",
    });

    await expect(
      asOther.mutation(api.jerseyRuns.create, validRunArgs(orderId)),
    ).rejects.toThrow(/don't have access/);
  });
});

describe("jerseyRuns.submitResponse", () => {
  it("records a fan's response on an open run", async () => {
    const t = convexTest(schema, modules);
    const { orderId, asUser } = await seedCaptainWithOrder(t);
    const runId = await asUser.mutation(
      api.jerseyRuns.create,
      validRunArgs(orderId),
    );

    // submitResponse is public — no identity required.
    const responseId = await t.mutation(api.jerseyRuns.submitResponse, {
      jerseyRunId: runId,
      respondentName: "Sam",
      respondentEmail: "SAM@Example.com",
      size: "M",
      customAnswers: {},
    });

    const row = await t.run((ctx) => ctx.db.get(responseId));
    expect(row).toMatchObject({
      jerseyRunId: runId,
      respondentName: "Sam",
      // Email is normalized to lowercase before persistence.
      respondentEmail: "sam@example.com",
      size: "M",
    });
  });

  it("rejects a response with a size that's not in the run's sizeOptions", async () => {
    const t = convexTest(schema, modules);
    const { orderId, asUser } = await seedCaptainWithOrder(t);
    const runId = await asUser.mutation(
      api.jerseyRuns.create,
      validRunArgs(orderId),
    );

    await expect(
      t.mutation(api.jerseyRuns.submitResponse, {
        jerseyRunId: runId,
        respondentName: "Sam",
        respondentEmail: "sam@example.com",
        size: "4XL",
        customAnswers: {},
      }),
    ).rejects.toThrow(/Pick a size/);
  });
});

describe("jerseyRuns.closeRunByAdmin", () => {
  it("schedules a close when an admin calls it on an open run", async () => {
    const t = convexTest(schema, modules);
    // Captain creates the run.
    const { orderId, asUser } = await seedCaptainWithOrder(t);
    const runId = await asUser.mutation(
      api.jerseyRuns.create,
      validRunArgs(orderId),
    );

    // Separate admin identity.
    await t.run((ctx) =>
      ctx.db.insert("users", {
        clerkId: "user_admin_clerk",
        email: "admin@example.com",
        name: "Admin",
        isAdmin: true,
        createdAt: Date.now(),
      }),
    );
    const asAdmin = t.withIdentity({
      subject: "user_admin_clerk",
      email: "admin@example.com",
      name: "Admin",
    });

    const result = await asAdmin.mutation(api.jerseyRuns.closeRunByAdmin, {
      jerseyRunId: runId,
    });
    expect(result).toEqual({ alreadyClosed: false });
  });

  it("rejects closeRunByAdmin when caller is not an admin", async () => {
    const t = convexTest(schema, modules);
    const { orderId, asUser } = await seedCaptainWithOrder(t);
    const runId = await asUser.mutation(
      api.jerseyRuns.create,
      validRunArgs(orderId),
    );

    // Same captain (non-admin) tries to close.
    await expect(
      asUser.mutation(api.jerseyRuns.closeRunByAdmin, { jerseyRunId: runId }),
    ).rejects.toThrow(/Admin access required/);
  });
});
