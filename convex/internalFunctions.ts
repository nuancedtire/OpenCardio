import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

// Called from processEcgScan action after successful AI analysis
export const saveAiResult = internalMutation({
  args: {
    scanId: v.id("ecg_scans"),
    userId: v.id("users"),
    result: v.any(),
  },
  handler: async (ctx, args) => {
    const resultId = await ctx.db.insert("ai_results", {
      scanId: args.scanId,
      userId: args.userId,
      ...args.result,
    });

    await ctx.db.patch(args.scanId, {
      status: "complete",
      aiResultId: resultId,
    });

    return resultId;
  },
});

// Called from processEcgScan action on failure
export const markScanFailed = internalMutation({
  args: {
    scanId: v.id("ecg_scans"),
    reason: v.string(),
    retryCount: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.scanId, {
      status: args.retryCount >= 3 ? "failed" : "processing",
      failureReason: args.reason,
      retryCount: args.retryCount,
    });
  },
});

// Called from processEcgScan action to get current retry count
export const getScanRetryCount = internalQuery({
  args: { scanId: v.id("ecg_scans") },
  handler: async (ctx, args) => {
    const scan = await ctx.db.get(args.scanId);
    return scan ? { retryCount: scan.retryCount ?? 0 } : null;
  },
});
