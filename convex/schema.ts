import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    isAdmin: v.boolean(),
    createdAt: v.number(),
  }).index("by_clerkId", ["clerkId"]),

  designs: defineTable({
    ownerId: v.id("users"),
    title: v.string(),
    brief: v.string(),
    canvaLink: v.optional(v.string()),
    fileIds: v.array(v.id("_storage")),
    // Silhouette specs live on the design now (moved off the order in O-01)
    // so a reusable design carries its own cut. Optional: a design can be
    // saved before its specs are decided; the design form wires them in O-02.
    jerseyStyle: v.optional(v.string()),
    neckline: v.optional(v.string()),
    sleeveStyle: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_owner", ["ownerId"]),

  orders: defineTable({
    captainId: v.id("users"),
    teamName: v.string(),
    sport: v.string(),
    estimatedQuantity: v.number(),
    hasOwnDesign: v.boolean(),
    designIds: v.array(v.id("designs")),
    internalStages: v.array(
      v.object({
        name: v.string(),
        completedAt: v.optional(v.number()),
      }),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_captain", ["captainId"]),

  jerseyRuns: defineTable({
    orderId: v.id("orders"),
    captainId: v.id("users"),
    // Available sizes the fan can pick from on the public form.
    // Stored on the run (not hard-coded) so captains can scope size
    // options to what they expect their team to need.
    sizeOptions: v.array(v.string()),
    namesMode: v.union(v.literal("open"), v.literal("fixed")),
    fixedRoster: v.optional(
      v.array(
        v.object({
          name: v.string(),
          number: v.optional(v.string()),
        }),
      ),
    ),
    customQuestions: v.array(
      v.object({
        id: v.string(),
        label: v.string(),
      }),
    ),
    deadline: v.number(),
    status: v.union(v.literal("open"), v.literal("closed")),
    createdAt: v.number(),
  })
    .index("by_order", ["orderId"])
    .index("by_captain", ["captainId"]),

  jerseyRunResponses: defineTable({
    jerseyRunId: v.id("jerseyRuns"),
    respondentName: v.string(),
    respondentEmail: v.string(),
    jerseyName: v.optional(v.string()),
    jerseyNumber: v.optional(v.string()),
    size: v.string(),
    customAnswers: v.record(v.string(), v.string()),
    submittedAt: v.number(),
  })
    .index("by_jerseyRun", ["jerseyRunId"])
    .index("by_respondentEmail", ["respondentEmail"]),

  intakes: defineTable({
    name: v.string(),
    teamName: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    sport: v.string(),
    estimatedQuantity: v.number(),
    designPreference: v.optional(
      v.union(
        v.literal("own-design"),
        v.literal("needs-help"),
        v.literal("undecided"),
      ),
    ),
    usageContext: v.optional(
      v.array(v.union(v.literal("event"), v.literal("league"))),
    ),
    deadline: v.optional(v.number()),
    brief: v.string(),
    questions: v.optional(v.string()),
    newsletterOptIn: v.optional(v.boolean()),
    submittedAt: v.number(),
  })
    .index("by_submittedAt", ["submittedAt"])
    .index("by_deadline", ["deadline"]),
});
