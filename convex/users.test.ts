// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

// convex-test loads every module under ./ so handlers run with their real
// imports. The glob string is matched at build time by Vite — keep it static.
const modules = import.meta.glob("./**/*.*s");

describe("users.syncCurrentUser", () => {
  it("inserts a new user when called by a fresh Clerk identity", async () => {
    const t = convexTest(schema, modules);
    const asAlice = t.withIdentity({
      subject: "user_alice_clerk",
      email: "alice@example.com",
      name: "Alice",
    });

    const userId = await asAlice.mutation(api.users.syncCurrentUser, {});
    expect(userId).not.toBeNull();

    const user = await asAlice.query(api.users.getCurrentUser, {});
    expect(user).toMatchObject({
      clerkId: "user_alice_clerk",
      email: "alice@example.com",
      name: "Alice",
      isAdmin: false,
    });
  });

  it("returns null without inserting when caller is unauthenticated", async () => {
    const t = convexTest(schema, modules);
    const result = await t.mutation(api.users.syncCurrentUser, {});
    expect(result).toBeNull();

    const everyone = await t.run(async (ctx) => ctx.db.query("users").collect());
    expect(everyone).toEqual([]);
  });
});

describe("users.syncUser", () => {
  it("upserts the user keyed by clerkId (insert then patch)", async () => {
    const t = convexTest(schema, modules);

    const id1 = await t.mutation(api.users.syncUser, {
      clerkId: "user_bob_clerk",
      email: "bob@example.com",
      name: "Bob",
      isAdmin: false,
    });

    const id2 = await t.mutation(api.users.syncUser, {
      clerkId: "user_bob_clerk",
      email: "bob+new@example.com",
      name: "Bob Updated",
      isAdmin: true,
    });

    expect(id1).toBe(id2);

    const row = await t.run(async (ctx) => ctx.db.get(id1));
    expect(row).toMatchObject({
      email: "bob+new@example.com",
      name: "Bob Updated",
      isAdmin: true,
    });
  });

  it("rejects calls with a missing required field (email)", async () => {
    const t = convexTest(schema, modules);
    // Cast through unknown: we're exercising the validator's rejection of a
    // malformed payload, which is exactly the trust-boundary check this
    // smoke test covers.
    await expect(
      t.mutation(api.users.syncUser, {
        clerkId: "user_no_email",
        name: "Nameless",
        isAdmin: false,
      } as unknown as {
        clerkId: string;
        email: string;
        name: string;
        isAdmin: boolean;
      }),
    ).rejects.toThrow();
  });
});
