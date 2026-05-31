// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { INTERNAL_STAGES } from "../lib/orderStages";

const modules = import.meta.glob("./**/*.*s");

// Seeds a user row and returns both the id and an identity-scoped client.
async function seedUser(
  t: ReturnType<typeof convexTest>,
  subject: string,
  overrides: Partial<{ email: string; name: string; isAdmin: boolean }> = {},
) {
  const email = overrides.email ?? `${subject}@example.com`;
  const name = overrides.name ?? subject;
  const userId = await t.run((ctx) =>
    ctx.db.insert("users", {
      clerkId: subject,
      email,
      name,
      isAdmin: overrides.isAdmin ?? false,
      createdAt: Date.now(),
    }),
  );
  return { userId, asUser: t.withIdentity({ subject, email, name }) };
}

// Inserts an order owned by `captainId` with the single seeded "Inquiry"
// stage that createOrder produces.
async function seedOrder(
  t: ReturnType<typeof convexTest>,
  captainId: Id<"users">,
): Promise<Id<"orders">> {
  const now = Date.now();
  return t.run((ctx) =>
    ctx.db.insert("orders", {
      captainId,
      teamName: "Falcons",
      sport: "Soccer",
      estimatedQuantity: 12,
      hasOwnDesign: false,
      designIds: [],
      internalStages: [{ name: "Inquiry", completedAt: now }],
      createdAt: now,
      updatedAt: now,
    }),
  );
}

// The full 14-stage checklist payload the component sends, with an optional
// override for which stages carry a completedAt timestamp.
function fullStages(
  completed: Partial<Record<string, number>> = {},
): Array<{ name: string; completedAt: number | null }> {
  return INTERNAL_STAGES.map((name) => ({
    name,
    completedAt: completed[name] ?? null,
  }));
}

describe("admin.updateOrderStages", () => {
  it("marks a stage complete with its completedAt timestamp", async () => {
    const t = convexTest(schema, modules);
    const { userId: captainId } = await seedUser(t, "captain");
    const { asUser: asAdmin } = await seedUser(t, "admin", { isAdmin: true });
    const orderId = await seedOrder(t, captainId);

    const completedAt = Date.now();
    await asAdmin.mutation(api.admin.updateOrderStages, {
      orderId,
      stages: fullStages({ "Design Confirmed": completedAt }),
    });

    const order = await t.run((ctx) => ctx.db.get(orderId));
    const stage = order?.internalStages.find(
      (s) => s.name === "Design Confirmed",
    );
    expect(stage?.completedAt).toBe(completedAt);
    // The full 14-stage list is persisted, not just the touched ones.
    expect(order?.internalStages).toHaveLength(INTERNAL_STAGES.length);
  });

  it("clears completedAt when a stage is unchecked", async () => {
    const t = convexTest(schema, modules);
    const { userId: captainId } = await seedUser(t, "captain");
    const { asUser: asAdmin } = await seedUser(t, "admin", { isAdmin: true });
    const orderId = await seedOrder(t, captainId);

    // First complete it, then send it back unchecked.
    await asAdmin.mutation(api.admin.updateOrderStages, {
      orderId,
      stages: fullStages({ "Design Confirmed": Date.now() }),
    });
    await asAdmin.mutation(api.admin.updateOrderStages, {
      orderId,
      stages: fullStages(),
    });

    const order = await t.run((ctx) => ctx.db.get(orderId));
    const stage = order?.internalStages.find(
      (s) => s.name === "Design Confirmed",
    );
    expect(stage?.completedAt ?? null).toBeNull();
  });

  it("derives the customer-facing stage from the updated checklist", async () => {
    const t = convexTest(schema, modules);
    const { userId: captainId } = await seedUser(t, "captain");
    const { asUser: asAdmin } = await seedUser(t, "admin", { isAdmin: true });
    const orderId = await seedOrder(t, captainId);

    const now = Date.now();
    await asAdmin.mutation(api.admin.updateOrderStages, {
      orderId,
      stages: fullStages({
        Inquiry: now,
        "Design Ideated": now,
        "Design Confirmed": now,
      }),
    });

    const order = await t.run((ctx) => ctx.db.get(orderId));
    const { deriveCustomerStage } = await import("../lib/orderStages");
    expect(deriveCustomerStage(order!.internalStages)).toBe("Design Confirmed");
  });

  it("rejects a non-admin caller", async () => {
    const t = convexTest(schema, modules);
    const { userId: captainId, asUser: asCaptain } = await seedUser(
      t,
      "captain",
    );
    const orderId = await seedOrder(t, captainId);

    await expect(
      asCaptain.mutation(api.admin.updateOrderStages, {
        orderId,
        stages: fullStages({ "Design Confirmed": Date.now() }),
      }),
    ).rejects.toThrow(/Admin access required/);
  });

  it("rejects an unknown stage name", async () => {
    const t = convexTest(schema, modules);
    const { userId: captainId } = await seedUser(t, "captain");
    const { asUser: asAdmin } = await seedUser(t, "admin", { isAdmin: true });
    const orderId = await seedOrder(t, captainId);

    await expect(
      asAdmin.mutation(api.admin.updateOrderStages, {
        orderId,
        stages: [{ name: "Bogus Stage", completedAt: Date.now() }],
      }),
    ).rejects.toThrow(/stage/i);
  });

  it("rejects when the order does not exist", async () => {
    const t = convexTest(schema, modules);
    const { asUser: asAdmin } = await seedUser(t, "admin", { isAdmin: true });

    // A syntactically valid but non-existent order id.
    const { userId: captainId } = await seedUser(t, "captain");
    const orderId = await seedOrder(t, captainId);
    await t.run((ctx) => ctx.db.delete(orderId));

    await expect(
      asAdmin.mutation(api.admin.updateOrderStages, {
        orderId,
        stages: fullStages(),
      }),
    ).rejects.toThrow(/not found/i);
  });
});
