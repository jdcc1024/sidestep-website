import { internalMutation } from "./_generated/server";

/**
 * Round-trips one record through every table to prove the schema accepts the
 * shapes documented in backlog/1-02-database-schema.md. Run with:
 *   npx convex run _schemaSmokeTest:run
 * Inserts then deletes — no residue.
 */
export const run = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    const userId = await ctx.db.insert("users", {
      clerkId: "smoke_clerk_id",
      email: "smoke@example.com",
      name: "Smoke User",
      isAdmin: false,
      createdAt: now,
    });

    const designId = await ctx.db.insert("designs", {
      ownerId: userId,
      title: "Smoke Design",
      brief: "smoke",
      fileIds: [],
      createdAt: now,
      updatedAt: now,
    });

    const orderId = await ctx.db.insert("orders", {
      captainId: userId,
      teamName: "Smoke FC",
      sport: "soccer",
      estimatedQuantity: 12,
      jerseyStyle: "classic",
      neckline: "crew",
      sleeveStyle: "short",
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
      customQuestions: [{ id: "q1", label: "Delivery method?" }],
      deadline: now + 7 * 24 * 60 * 60 * 1000,
      status: "open",
      createdAt: now,
    });

    const responseId = await ctx.db.insert("jerseyRunResponses", {
      jerseyRunId: runId,
      respondentName: "Fan One",
      respondentEmail: "fan@example.com",
      jerseyName: "FAN",
      jerseyNumber: "7",
      size: "M",
      customAnswers: { "Delivery method?": "pickup" },
      submittedAt: now,
    });

    const intakeId = await ctx.db.insert("intakes", {
      name: "Lead Person",
      teamName: "Lead Team",
      sport: "basketball",
      estimatedQuantity: 20,
      brief: "looking for jerseys",
      submittedAt: now,
    });

    const inserted = {
      user: await ctx.db.get(userId),
      design: await ctx.db.get(designId),
      order: await ctx.db.get(orderId),
      run: await ctx.db.get(runId),
      response: await ctx.db.get(responseId),
      intake: await ctx.db.get(intakeId),
    };

    for (const [name, doc] of Object.entries(inserted)) {
      if (!doc) throw new Error(`smoke test: ${name} round-trip returned null`);
    }
    if (inserted.order!.internalStages[0].name !== "Inquiry") {
      throw new Error("smoke test: nested stage field lost in round-trip");
    }
    if (inserted.response!.customAnswers["Delivery method?"] !== "pickup") {
      throw new Error("smoke test: customAnswers record lost in round-trip");
    }

    await ctx.db.delete(responseId);
    await ctx.db.delete(runId);
    await ctx.db.delete(orderId);
    await ctx.db.delete(designId);
    await ctx.db.delete(intakeId);
    await ctx.db.delete(userId);

    return { ok: true, tablesChecked: 6 };
  },
});
