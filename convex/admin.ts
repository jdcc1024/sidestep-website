import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { requireAdmin } from "./_auth";
import { INTERNAL_STAGES } from "../lib/orderStages";

const INTERNAL_STAGE_NAMES = new Set<string>(INTERNAL_STAGES);

export const listOrders = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const orders = await ctx.db.query("orders").order("desc").collect();

    // N+1 captain lookup is fine — Sidestep's phase 1 volume is small and
    // captains repeat across orders. Caching by captainId keeps it lean.
    const captainCache = new Map<string, Doc<"users"> | null>();
    return Promise.all(
      orders.map(async (order) => {
        const key = order.captainId;
        let captain = captainCache.get(key);
        if (captain === undefined) {
          captain = await ctx.db.get(order.captainId);
          captainCache.set(key, captain);
        }
        return {
          ...order,
          captainName: captain?.name ?? "Unknown",
          captainEmail: captain?.email ?? "",
        };
      }),
    );
  },
});

export const listDesigns = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const designs = await ctx.db.query("designs").order("desc").collect();

    const ownerCache = new Map<string, Doc<"users"> | null>();
    return Promise.all(
      designs.map(async (design) => {
        const key = design.ownerId;
        let owner = ownerCache.get(key);
        if (owner === undefined) {
          owner = await ctx.db.get(design.ownerId);
          ownerCache.set(key, owner);
        }
        return {
          ...design,
          ownerName: owner?.name ?? "Unknown",
          ownerEmail: owner?.email ?? "",
        };
      }),
    );
  },
});

export const getOrder = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, { orderId }) => {
    await requireAdmin(ctx);

    const order = await ctx.db.get(orderId);
    if (!order) return null;

    const captain = await ctx.db.get(order.captainId);

    // Linked designs may be empty; resolve each in parallel and drop any
    // that have since been deleted so the UI never blows up on a stale id.
    const linkedDesigns = (
      await Promise.all(order.designIds.map((id) => ctx.db.get(id)))
    ).filter((d): d is Doc<"designs"> => d !== null);

    // Convex storage URLs are short-lived signed URLs — generated per query
    // so the admin can click through to the raw file. null is returned for
    // storage ids that no longer exist.
    const designs = await Promise.all(
      linkedDesigns.map(async (design) => {
        const fileUrls = await Promise.all(
          design.fileIds.map(async (storageId) => ({
            storageId,
            url: await ctx.storage.getUrl(storageId),
          })),
        );
        return { ...design, fileUrls };
      }),
    );

    const jerseyRun = await ctx.db
      .query("jerseyRuns")
      .withIndex("by_order", (q) => q.eq("orderId", order._id))
      .unique();

    const jerseyRunResponseCount = jerseyRun
      ? (
          await ctx.db
            .query("jerseyRunResponses")
            .withIndex("by_jerseyRun", (q) =>
              q.eq("jerseyRunId", jerseyRun._id),
            )
            .collect()
        ).length
      : 0;

    return {
      order,
      captain: captain
        ? { name: captain.name, email: captain.email, _id: captain._id }
        : null,
      designs,
      jerseyRun,
      jerseyRunResponseCount,
    };
  },
});

// Replaces an order's internal stage checklist wholesale (issue 2-12). The
// admin checklist UI sends the full 14-stage array every time, each stage
// carrying a `completedAt` timestamp or null. We normalize null to an absent
// field (the schema stores `completedAt` as an optional number) and persist.
// Because Convex is real-time, the customer portal's derived stage updates
// the instant this commits — no refresh on the customer's end.
//
// Stage names are validated against the canonical INTERNAL_STAGES list so a
// hand-rolled client can't smuggle arbitrary labels into the array. Stages
// may be completed out of order per the client requirement — we don't enforce
// any ordering on the timestamps.
export const updateOrderStages = mutation({
  args: {
    orderId: v.id("orders"),
    stages: v.array(
      v.object({
        name: v.string(),
        completedAt: v.union(v.number(), v.null()),
      }),
    ),
  },
  handler: async (ctx, { orderId, stages }) => {
    await requireAdmin(ctx);

    const order = await ctx.db.get(orderId);
    if (!order) throw new ConvexError("Order not found.");

    const seen = new Set<string>();
    const internalStages = stages.map((stage) => {
      if (!INTERNAL_STAGE_NAMES.has(stage.name))
        throw new ConvexError(`Unknown internal stage: ${stage.name}`);
      if (seen.has(stage.name))
        throw new ConvexError(`Duplicate internal stage: ${stage.name}`);
      seen.add(stage.name);
      // null → omit the field so it reads back as "not completed".
      return stage.completedAt === null
        ? { name: stage.name }
        : { name: stage.name, completedAt: stage.completedAt };
    });

    await ctx.db.patch(orderId, { internalStages, updatedAt: Date.now() });
  },
});

// Every jersey run across every customer. Used by the admin oversight
// page (issue 3-02). Joins team name from the linked order and captain
// name/email from the user record so the list table can render without
// follow-up queries. Response count is computed per run — fine at phase 1
// volume; a denormalized counter on the run can come later if needed.
export const listJerseyRuns = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const runs = await ctx.db.query("jerseyRuns").order("desc").collect();

    const orderCache = new Map<string, Doc<"orders"> | null>();
    const captainCache = new Map<string, Doc<"users"> | null>();

    return Promise.all(
      runs.map(async (run) => {
        let order = orderCache.get(run.orderId);
        if (order === undefined) {
          order = await ctx.db.get(run.orderId);
          orderCache.set(run.orderId, order);
        }
        let captain = captainCache.get(run.captainId);
        if (captain === undefined) {
          captain = await ctx.db.get(run.captainId);
          captainCache.set(run.captainId, captain);
        }

        const responses = await ctx.db
          .query("jerseyRunResponses")
          .withIndex("by_jerseyRun", (q) => q.eq("jerseyRunId", run._id))
          .collect();

        return {
          _id: run._id,
          orderId: run.orderId,
          status: run.status,
          deadline: run.deadline,
          createdAt: run.createdAt,
          namesMode: run.namesMode,
          teamName: order?.teamName ?? "Unknown team",
          captainName: captain?.name ?? "Unknown",
          captainEmail: captain?.email ?? "",
          responseCount: responses.length,
        };
      }),
    );
  },
});
