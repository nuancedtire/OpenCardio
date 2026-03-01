import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  // --- AUTH (injected by @convex-dev/auth) ---
  ...authTables,

  // --- USER PROFILES (custom fields beyond auth) ---
  userProfiles: defineTable({
    userId: v.id("users"),
    qtcSex: v.optional(
      v.union(v.literal("male"), v.literal("female"), v.literal("unspecified"))
    ),
    onboardingComplete: v.boolean(),
    role: v.optional(
      v.union(
        v.literal("clinician"),
        v.literal("researcher"),
        v.literal("admin")
      )
    ),
  }).index("by_user", ["userId"]),

  // --- ECG SCANS ---
  ecg_scans: defineTable({
    userId: v.id("users"),

    // Storage
    storageId: v.id("_storage"),
    imageContentType: v.string(),
    imageSizeBytes: v.optional(v.number()),

    // Metadata (non-PII)
    label: v.optional(v.string()),
    capturedAt: v.number(),

    // Processing pipeline status
    status: v.union(
      v.literal("uploading"),
      v.literal("processing"),
      v.literal("complete"),
      v.literal("failed")
    ),
    failureReason: v.optional(v.string()),
    retryCount: v.optional(v.number()),

    // Linked result
    aiResultId: v.optional(v.id("ai_results")),
  })
    .index("by_user", ["userId"])
    .index("by_user_status", ["userId", "status"])
    .index("by_user_created", ["userId", "_creationTime"]),

  // --- AI RESULTS ---
  ai_results: defineTable({
    scanId: v.id("ecg_scans"),
    userId: v.id("users"),

    // Digitisation outputs
    digitisedSignalStorageId: v.optional(v.id("_storage")),
    digitisationQuality: v.optional(
      v.union(v.literal("good"), v.literal("acceptable"), v.literal("poor"))
    ),
    leadLayoutDetected: v.optional(v.string()),

    // Signal data (stored inline for Phase 1 — use storage for large signals in Phase 2)
    signalData: v.optional(v.any()), // Record<string, number[]>

    // Measurements
    heartRateBpm: v.optional(v.number()),
    rrIntervalMs: v.optional(v.number()),
    prIntervalMs: v.optional(v.number()),
    qrsWidthMs: v.optional(v.number()),
    qtIntervalMs: v.optional(v.number()),
    qtcFridericia: v.optional(v.number()),
    qtcBazett: v.optional(v.number()),
    cardiacAxisDegrees: v.optional(v.number()),
    pWaveDurationMs: v.optional(v.number()),

    // QTc alert
    qtcAlertLevel: v.optional(
      v.union(
        v.literal("normal"),
        v.literal("borderline"),
        v.literal("prolonged")
      )
    ),

    // Rhythm
    primaryRhythm: v.optional(v.string()),
    primaryRhythmCode: v.optional(v.string()),
    primaryRhythmConfidence: v.optional(v.number()),

    // Multi-label diagnoses
    diagnoses: v.optional(
      v.array(
        v.object({
          label: v.string(),
          code: v.string(),
          category: v.union(
            v.literal("rhythm"),
            v.literal("conduction"),
            v.literal("ischaemia"),
            v.literal("structural"),
            v.literal("other")
          ),
          confidence: v.number(),
          severity: v.union(
            v.literal("info"),
            v.literal("warning"),
            v.literal("critical")
          ),
          leadsAffected: v.optional(v.array(v.string())),
          explanation: v.optional(v.string()),
        })
      )
    ),

    // OMI / STEMI
    omiProbability: v.optional(v.number()),
    omiTier: v.optional(
      v.union(
        v.literal("low"),
        v.literal("intermediate"),
        v.literal("high")
      )
    ),
    stemiCriteriaMet: v.optional(v.boolean()),
    stemiCriteriaLeads: v.optional(v.array(v.string())),

    // Sgarbossa
    sgarbossaActivated: v.optional(v.boolean()),
    sgarbossaOriginalScore: v.optional(v.number()),
    sgarbossaSmithModified: v.optional(
      v.union(
        v.literal("positive"),
        v.literal("negative"),
        v.literal("indeterminate")
      )
    ),

    // Pattern flags
    patternFlags: v.optional(
      v.array(
        v.object({
          pattern: v.string(),
          leads: v.array(v.string()),
          description: v.string(),
          severity: v.union(v.literal("warning"), v.literal("critical")),
        })
      )
    ),

    // Heatmap
    omiHeatmapData: v.optional(v.any()),

    // LVEF
    lvefProbabilityReduced: v.optional(v.number()),
    lvefVerdict: v.optional(
      v.union(
        v.literal("likely_reduced"),
        v.literal("borderline"),
        v.literal("likely_normal")
      )
    ),

    // Provenance
    modelVersionDigitiser: v.optional(v.string()),
    modelVersionCoreDx: v.optional(v.string()),
    modelVersionOmi: v.optional(v.string()),
    modelVersionLvef: v.optional(v.string()),
    inferenceTimestampMs: v.optional(v.number()),
    inferenceLatencyMs: v.optional(v.number()),
  })
    .index("by_scan", ["scanId"])
    .index("by_user", ["userId"])
    .index("by_user_created", ["userId", "_creationTime"]),
});
