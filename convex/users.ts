import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// Helper: get or create userProfile for the authenticated user
async function getOrCreateProfile(
  ctx: Parameters<typeof query>[0]["ctx"] | Parameters<typeof mutation>[0]["ctx"],
  userId: string
) {
  const profile = await (ctx as any).db
    .query("userProfiles")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .unique();

  if (!profile) {
    const profileId = await (ctx as any).db.insert("userProfiles", {
      userId,
      onboardingComplete: false,
    });
    return { _id: profileId, userId, onboardingComplete: false };
  }
  return profile;
}

// --- QUERIES ---

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const user = await ctx.db.get(userId);
    if (!user) return null;

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    return {
      ...user,
      profile: profile ?? null,
    };
  },
});

// --- MUTATIONS ---

export const updateUserProfile = mutation({
  args: {
    qtcSex: v.optional(
      v.union(
        v.literal("male"),
        v.literal("female"),
        v.literal("unspecified")
      )
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (profile) {
      await ctx.db.patch(profile._id, args);
    } else {
      await ctx.db.insert("userProfiles", {
        userId,
        onboardingComplete: false,
        ...args,
      });
    }
  },
});

export const completeOnboarding = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (profile) {
      await ctx.db.patch(profile._id, { onboardingComplete: true });
    } else {
      await ctx.db.insert("userProfiles", {
        userId,
        onboardingComplete: true,
      });
    }
  },
});
