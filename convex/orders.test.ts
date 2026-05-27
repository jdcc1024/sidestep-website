// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

const modules = import.meta.glob("./**/*.*s");

// A signed-in identity whose Convex `users` row has been synced. We seed
// the row directly via t.run() so each test starts from a known state
// without going through the syncCurrentUser mutation every time.
async function seedCaptain(
  t: ReturnType<typeof convexTest>,
  subject = "user_captain_clerk",
  overrides: Partial<{ email: string; name: string; isAdmin: boolean }> = {},
) {
  const userId = await t.run((ctx) =>
    ctx.db.insert("users", {
      clerkId: subject,
      email: overrides.email ?? "captain@example.com",
      name: overrides.name ?? "Cap",
      isAdmin: overrides.isAdmin ?? false,
      createdAt: Date.now(),
    }),
  );
  return {
    userId,
    asUser: t.withIdentity({
      subject,
      email: overrides.email ?? "captain@example.com",
      name: overrides.name ?? "Cap",
    }),
  };
}

const VALID_ORDER = {
  teamName: "Falcons",
  sport: "Soccer",
  estimatedQuantity: 12,
  jerseyStyle: "Classic crew",
  neckline: "Crew Neck",
  sleeveStyle: "Regular",
  hasOwnDesign: false,
  designIds: [] as never[],
};

describe("orders.createOrder", () => {
  it("inserts an order for an authenticated captain", async () => {
    const t = convexTest(schema, modules);
    const { userId, asUser } = await seedCaptain(t);

    const orderId = await asUser.mutation(api.orders.createOrder, VALID_ORDER);
    expect(orderId).not.toBeNull();

    const row = await t.run((ctx) => ctx.db.get(orderId));
    expect(row).toMatchObject({
      captainId: userId,
      teamName: "Falcons",
      sport: "Soccer",
      estimatedQuantity: 12,
      neckline: "Crew Neck",
      sleeveStyle: "Regular",
    });
    expect(row?.internalStages[0]?.name).toBe("Inquiry");
  });

  it("rejects an unauthenticated caller (no Clerk identity)", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.mutation(api.orders.createOrder, VALID_ORDER),
    ).rejects.toThrow(/Not authenticated/);
  });

  it("rejects linking a design owned by a different captain", async () => {
    const t = convexTest(schema, modules);
    const { asUser } = await seedCaptain(t, "user_captain_clerk");
    const { userId: otherUserId } = await seedCaptain(
      t,
      "user_other_clerk",
      { email: "other@example.com", name: "Other" },
    );

    const foreignDesignId = await t.run((ctx) =>
      ctx.db.insert("designs", {
        ownerId: otherUserId,
        title: "Not mine",
        brief: "Not my brief",
        fileIds: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
    );

    await expect(
      asUser.mutation(api.orders.createOrder, {
        ...VALID_ORDER,
        designIds: [foreignDesignId],
      }),
    ).rejects.toThrow(/not yours/);
  });

  it("rejects an invalid neckline value", async () => {
    const t = convexTest(schema, modules);
    const { asUser } = await seedCaptain(t);
    await expect(
      asUser.mutation(api.orders.createOrder, {
        ...VALID_ORDER,
        neckline: "Turtle",
      }),
    ).rejects.toThrow(/neckline/i);
  });
});
