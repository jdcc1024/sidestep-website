// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

const modules = import.meta.glob("./**/*.*s");

const VALID_INTAKE = {
  name: "Sam Captain",
  teamName: "Falcons",
  email: "sam@example.com",
  sport: "Soccer",
  estimatedQuantity: 12,
  designPreference: "needs-help" as const,
  brief: "Need a navy kit with gold trim.",
  newsletterOptIn: false,
};

describe("intakes.submitIntake", () => {
  it("inserts a public intake (no auth required)", async () => {
    const t = convexTest(schema, modules);
    const intakeId = await t.mutation(api.intakes.submitIntake, VALID_INTAKE);
    const row = await t.run((ctx) => ctx.db.get(intakeId));
    expect(row).toMatchObject({
      name: "Sam Captain",
      teamName: "Falcons",
      email: "sam@example.com",
      sport: "Soccer",
      estimatedQuantity: 12,
      designPreference: "needs-help",
      newsletterOptIn: false,
    });
  });

  it("rejects an intake with a malformed email", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.mutation(api.intakes.submitIntake, {
        ...VALID_INTAKE,
        email: "not-an-email",
      }),
    ).rejects.toThrow(/valid email/);
  });

  it("rejects an intake with quantity below the minimum", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.mutation(api.intakes.submitIntake, {
        ...VALID_INTAKE,
        estimatedQuantity: 2,
      }),
    ).rejects.toThrow(/Quantity must be at least/);
  });
});
