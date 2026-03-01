import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

// --- MUTATIONS ---

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await ctx.storage.generateUploadUrl();
  },
});

export const createScan = mutation({
  args: {
    storageId: v.id("_storage"),
    imageContentType: v.string(),
    imageSizeBytes: v.optional(v.number()),
    label: v.optional(v.string()),
    capturedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    if (args.label && args.label.length > 120) {
      throw new Error("Label too long (max 120 characters)");
    }

    const scanId = await ctx.db.insert("ecg_scans", {
      userId,
      storageId: args.storageId,
      imageContentType: args.imageContentType,
      imageSizeBytes: args.imageSizeBytes,
      label: args.label,
      capturedAt: args.capturedAt,
      status: "processing",
      retryCount: 0,
    });

    // Schedule AI processing immediately
    await ctx.scheduler.runAfter(0, internal.actions.processEcgScan, {
      scanId,
      storageId: args.storageId,
      userId,
    });

    return scanId;
  },
});

export const updateScanLabel = mutation({
  args: {
    scanId: v.id("ecg_scans"),
    label: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    if (args.label.length > 120) throw new Error("Label too long");

    const scan = await ctx.db.get(args.scanId);
    if (!scan || scan.userId !== userId) throw new Error("Not found");

    await ctx.db.patch(args.scanId, { label: args.label });
  },
});

export const deleteScan = mutation({
  args: { scanId: v.id("ecg_scans") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const scan = await ctx.db.get(args.scanId);
    if (!scan || scan.userId !== userId) throw new Error("Not found");

    // Delete associated AI result and signal storage
    if (scan.aiResultId) {
      const result = await ctx.db.get(scan.aiResultId);
      if (result?.digitisedSignalStorageId) {
        await ctx.storage.delete(result.digitisedSignalStorageId);
      }
      await ctx.db.delete(scan.aiResultId);
    }

    // Delete the ECG image from storage
    await ctx.storage.delete(scan.storageId);

    // Delete the scan record
    await ctx.db.delete(args.scanId);
  },
});

// --- QUERIES ---

export const getMyScans = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { page: [], isDone: true, continueCursor: "" };

    return await ctx.db
      .query("ecg_scans")
      .withIndex("by_user_created", (q) => q.eq("userId", userId))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

export const getScanById = query({
  args: { scanId: v.id("ecg_scans") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const scan = await ctx.db.get(args.scanId);
    if (!scan || scan.userId !== userId) return null;

    return scan;
  },
});

export const getAiResult = query({
  args: { scanId: v.id("ecg_scans") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const scan = await ctx.db.get(args.scanId);
    if (!scan || scan.userId !== userId) return null;
    if (!scan.aiResultId) return null;

    return await ctx.db.get(scan.aiResultId);
  },
});

export const getEcgImageUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return await ctx.storage.getUrl(args.storageId);
  },
});
