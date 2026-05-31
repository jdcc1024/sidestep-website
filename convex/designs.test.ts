// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

const modules = import.meta.glob("./**/*.*s");

async function seedOwner(
  t: ReturnType<typeof convexTest>,
  subject = "user_owner_clerk",
) {
  const userId = await t.run((ctx) =>
    ctx.db.insert("users", {
      clerkId: subject,
      email: "owner@example.com",
      name: "Owner",
      isAdmin: false,
      createdAt: Date.now(),
    }),
  );
  return {
    userId,
    asUser: t.withIdentity({
      subject,
      email: "owner@example.com",
      name: "Owner",
    }),
  };
}

// Storage ids in convex-test are opaque strings shaped like real ones via
// ctx.storage.store. We don't need real bytes — the validators accept any
// v.id("_storage").
async function fakeStorageId(t: ReturnType<typeof convexTest>) {
  return t.run((ctx) =>
    ctx.storage.store(new Blob(["x"], { type: "text/plain" })),
  );
}

describe("designs.createDesign", () => {
  it("inserts a design owned by the caller", async () => {
    const t = convexTest(schema, modules);
    const { userId, asUser } = await seedOwner(t);
    const storageId = await fakeStorageId(t);

    const designId = await asUser.mutation(api.designs.createDesign, {
      title: "Away kit concept",
      brief: "Navy with gold accents.",
      fileIds: [storageId],
    });

    const row = await t.run((ctx) => ctx.db.get(designId));
    expect(row).toMatchObject({
      ownerId: userId,
      title: "Away kit concept",
      brief: "Navy with gold accents.",
    });
    expect(row?.fileIds).toEqual([storageId]);
  });

  it("rejects createDesign when no files are attached", async () => {
    const t = convexTest(schema, modules);
    const { asUser } = await seedOwner(t);
    await expect(
      asUser.mutation(api.designs.createDesign, {
        title: "Empty",
        brief: "Has a brief but no files.",
        fileIds: [],
      }),
    ).rejects.toThrow(/At least one file/);
  });

  it("persists silhouette specs when supplied", async () => {
    const t = convexTest(schema, modules);
    const { asUser } = await seedOwner(t);
    const storageId = await fakeStorageId(t);

    const designId = await asUser.mutation(api.designs.createDesign, {
      title: "Home kit",
      brief: "Bold stripes.",
      fileIds: [storageId],
      jerseyStyle: "  Soccer jersey  ",
      neckline: "Crew Neck",
      sleeveStyle: "Raglan",
    });

    const row = await t.run((ctx) => ctx.db.get(designId));
    expect(row).toMatchObject({
      // jerseyStyle is trimmed; neckline / sleeve match the allowlists.
      jerseyStyle: "Soccer jersey",
      neckline: "Crew Neck",
      sleeveStyle: "Raglan",
    });
  });

  it("creates a design with no specs (specs are optional)", async () => {
    const t = convexTest(schema, modules);
    const { asUser } = await seedOwner(t);
    const storageId = await fakeStorageId(t);

    const designId = await asUser.mutation(api.designs.createDesign, {
      title: "Idea only",
      brief: "No cut decided yet.",
      fileIds: [storageId],
    });

    const row = await t.run((ctx) => ctx.db.get(designId));
    expect(row?.neckline).toBeUndefined();
    expect(row?.sleeveStyle).toBeUndefined();
    expect(row?.jerseyStyle).toBeUndefined();
  });

  it("rejects an invalid neckline", async () => {
    const t = convexTest(schema, modules);
    const { asUser } = await seedOwner(t);
    const storageId = await fakeStorageId(t);

    await expect(
      asUser.mutation(api.designs.createDesign, {
        title: "Bad cut",
        brief: "Brief.",
        fileIds: [storageId],
        neckline: "Turtle",
      }),
    ).rejects.toThrow(/neckline/i);
  });

  it("rejects an invalid sleeve style", async () => {
    const t = convexTest(schema, modules);
    const { asUser } = await seedOwner(t);
    const storageId = await fakeStorageId(t);

    await expect(
      asUser.mutation(api.designs.createDesign, {
        title: "Bad sleeve",
        brief: "Brief.",
        fileIds: [storageId],
        sleeveStyle: "Sleeveless",
      }),
    ).rejects.toThrow(/sleeve/i);
  });
});

describe("designs.updateDesign", () => {
  it("updates metadata for a design the caller owns", async () => {
    const t = convexTest(schema, modules);
    const { asUser } = await seedOwner(t);
    const storageId = await fakeStorageId(t);

    const designId = await asUser.mutation(api.designs.createDesign, {
      title: "First pass",
      brief: "Initial brief.",
      fileIds: [storageId],
    });

    await asUser.mutation(api.designs.updateDesign, {
      designId,
      title: "Revised pass",
      brief: "Updated brief.",
      addFileIds: [],
    });

    const row = await t.run((ctx) => ctx.db.get(designId));
    expect(row).toMatchObject({ title: "Revised pass", brief: "Updated brief." });
  });

  it("updates silhouette specs when supplied", async () => {
    const t = convexTest(schema, modules);
    const { asUser } = await seedOwner(t);
    const storageId = await fakeStorageId(t);

    const designId = await asUser.mutation(api.designs.createDesign, {
      title: "Spec edit",
      brief: "Initial.",
      fileIds: [storageId],
    });

    await asUser.mutation(api.designs.updateDesign, {
      designId,
      title: "Spec edit",
      brief: "Initial.",
      addFileIds: [],
      jerseyStyle: "Hockey jersey",
      neckline: "V-Neck",
      sleeveStyle: "Regular",
    });

    const row = await t.run((ctx) => ctx.db.get(designId));
    expect(row).toMatchObject({
      jerseyStyle: "Hockey jersey",
      neckline: "V-Neck",
      sleeveStyle: "Regular",
    });
  });

  it("rejects updateDesign when the caller doesn't own the design", async () => {
    const t = convexTest(schema, modules);
    const { asUser: asOwner } = await seedOwner(t, "user_owner_clerk");
    const storageId = await fakeStorageId(t);
    const designId = await asOwner.mutation(api.designs.createDesign, {
      title: "Owned by Owner",
      brief: "Brief.",
      fileIds: [storageId],
    });

    // A second user, freshly synced.
    await t.run((ctx) =>
      ctx.db.insert("users", {
        clerkId: "user_intruder_clerk",
        email: "intruder@example.com",
        name: "Intruder",
        isAdmin: false,
        createdAt: Date.now(),
      }),
    );
    const asIntruder = t.withIdentity({
      subject: "user_intruder_clerk",
      email: "intruder@example.com",
      name: "Intruder",
    });

    await expect(
      asIntruder.mutation(api.designs.updateDesign, {
        designId,
        title: "Hijacked",
        brief: "Hijack.",
        addFileIds: [],
      }),
    ).rejects.toThrow(/don't have access/);
  });
});

describe("designs.generateUploadUrl", () => {
  it("returns an upload URL string for an authenticated user", async () => {
    const t = convexTest(schema, modules);
    const { asUser } = await seedOwner(t);
    const url = await asUser.mutation(api.designs.generateUploadUrl, {});
    expect(typeof url).toBe("string");
    expect(url).toContain("http");
  });

  it("rejects generateUploadUrl when caller is unauthenticated", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.mutation(api.designs.generateUploadUrl, {}),
    ).rejects.toThrow(/Not authenticated/);
  });
});
