import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUserOrNull, requireCurrentUser } from "./_auth";
import {
  JERSEY_STYLE_MAX_LENGTH,
  isNeckline,
  isSleeveStyle,
} from "../lib/design/rules";

// Server-side guards. Mirror lib/design so the client and server cap
// values the same way — defense in depth against a hand-rolled client that
// posts past the form's maxLength. Spec allowlists/caps come from
// lib/design/rules so the two sides can't drift.
const TITLE_MAX_LENGTH = 120;
const BRIEF_MAX_LENGTH = 2000;
const CANVA_LINK_MAX_LENGTH = 500;

function normalizeTitle(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new ConvexError("Title is required.");
  if (trimmed.length > TITLE_MAX_LENGTH)
    throw new ConvexError("Title is too long.");
  return trimmed;
}

function normalizeBrief(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new ConvexError("Brief is required.");
  if (trimmed.length > BRIEF_MAX_LENGTH)
    throw new ConvexError("Brief is too long.");
  return trimmed;
}

function normalizeCanvaLink(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed.length > CANVA_LINK_MAX_LENGTH)
    throw new ConvexError("Canva link is too long.");
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new ConvexError("Canva link must be a valid URL.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:")
    throw new ConvexError("Canva link must start with http:// or https://");
  return trimmed;
}

// Silhouette specs are optional per design — a design can be saved before
// its cut is decided. Each spec is validated independently when present:
// jerseyStyle is free text (length-capped), neckline and sleeve style must
// match the allowlists in lib/design/rules. Returns only the specs that
// were supplied so we never write an empty string for an omitted field.
function normalizeSpecs(args: {
  jerseyStyle?: string;
  neckline?: string;
  sleeveStyle?: string;
}): { jerseyStyle?: string; neckline?: string; sleeveStyle?: string } {
  const specs: { jerseyStyle?: string; neckline?: string; sleeveStyle?: string } =
    {};

  if (args.jerseyStyle !== undefined) {
    const trimmed = args.jerseyStyle.trim();
    if (trimmed) {
      if (trimmed.length > JERSEY_STYLE_MAX_LENGTH)
        throw new ConvexError("Jersey style is too long.");
      specs.jerseyStyle = trimmed;
    }
  }

  if (args.neckline !== undefined && args.neckline.trim()) {
    if (!isNeckline(args.neckline)) throw new ConvexError("Invalid neckline.");
    specs.neckline = args.neckline;
  }

  if (args.sleeveStyle !== undefined && args.sleeveStyle.trim()) {
    if (!isSleeveStyle(args.sleeveStyle))
      throw new ConvexError("Invalid sleeve style.");
    specs.sleeveStyle = args.sleeveStyle;
  }

  return specs;
}

// Captain's own designs, newest first. Mirrors the auth/scoping shape of
// listMyOrders so the portal dashboard can fetch both with the same
// guarantees.
export const listMyDesigns = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return [];

    return ctx.db
      .query("designs")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .order("desc")
      .collect();
  },
});

// Fetches one design with its file URLs already resolved so the detail
// page can render download links without a second round-trip per file.
// Returns null for an unauthenticated caller or a not-found id; throws on
// access violation so the UI can surface "you don't have access" instead
// of silently rendering empty.
export const getMyDesign = query({
  args: { designId: v.id("designs") },
  handler: async (ctx, { designId }) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return null;

    const design = await ctx.db.get(designId);
    if (!design) return null;
    if (design.ownerId !== user._id)
      throw new ConvexError("You don't have access to this design.");

    const files = await Promise.all(
      design.fileIds.map(async (storageId) => ({
        storageId,
        url: await ctx.storage.getUrl(storageId),
      })),
    );

    return { ...design, files };
  },
});

// Two-phase upload — step 1: client asks for a signed URL to PUT the file
// to, step 2: client calls createDesign with the returned storage ids.
// Auth is checked here so unauthenticated visitors can't generate upload
// URLs and stuff our bucket.
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireCurrentUser(ctx);
    return ctx.storage.generateUploadUrl();
  },
});

export const createDesign = mutation({
  args: {
    title: v.string(),
    brief: v.string(),
    canvaLink: v.optional(v.string()),
    fileIds: v.array(v.id("_storage")),
    jerseyStyle: v.optional(v.string()),
    neckline: v.optional(v.string()),
    sleeveStyle: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);

    const title = normalizeTitle(args.title);
    const brief = normalizeBrief(args.brief);
    const canvaLink = normalizeCanvaLink(args.canvaLink);
    const specs = normalizeSpecs(args);

    // Files are optional — an idea-only brief is a valid design
    // (flow spec §Flow 1). A captain can attach references later via edit.
    const now = Date.now();
    return ctx.db.insert("designs", {
      ownerId: user._id,
      title,
      brief,
      ...(canvaLink ? { canvaLink } : {}),
      ...specs,
      fileIds: args.fileIds,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Edit mode. Updates the metadata fields and appends any newly uploaded
// files. Pass an empty addFileIds array to update metadata only.
export const updateDesign = mutation({
  args: {
    designId: v.id("designs"),
    title: v.string(),
    brief: v.string(),
    canvaLink: v.optional(v.string()),
    addFileIds: v.array(v.id("_storage")),
    jerseyStyle: v.optional(v.string()),
    neckline: v.optional(v.string()),
    sleeveStyle: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const design = await ctx.db.get(args.designId);
    if (!design) throw new ConvexError("Design not found.");
    if (design.ownerId !== user._id)
      throw new ConvexError("You don't have access to this design.");

    const title = normalizeTitle(args.title);
    const brief = normalizeBrief(args.brief);
    const canvaLink = normalizeCanvaLink(args.canvaLink);
    const specs = normalizeSpecs(args);

    // Files optional — a design may carry zero files (idea-only). Appending
    // an empty addFileIds array leaves the existing files untouched.
    const nextFileIds = [...design.fileIds, ...args.addFileIds];

    await ctx.db.patch(args.designId, {
      title,
      brief,
      // Convex `patch` doesn't accept undefined for optional fields — pass
      // an explicit string (possibly empty) and let the schema/optional do
      // the rest. We use the normalized value or fall back to clearing.
      ...(canvaLink ? { canvaLink } : { canvaLink: undefined }),
      // Apply any supplied silhouette specs; omitted specs are left as-is.
      ...specs,
      fileIds: nextFileIds,
      updatedAt: Date.now(),
    });

    return args.designId;
  },
});
