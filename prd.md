# OpenCardio — Product Requirements Document
### Version 1.0 | MVP + Phase 2
**Stack:** Hono + Vite + React (Cloudflare Workers) · Convex (DB / Auth / Files / Real-time) · Google SSO · Python VPS (AI Inference)

---

## Table of Contents
1. [Product Vision & Goals](#1-product-vision--goals)
2. [Personas](#2-personas)
3. [User Stories](#3-user-stories)
4. [Architecture Overview](#4-architecture-overview)
5. [Data Model — Convex Schema](#5-data-model--convex-schema)
6. [Convex Functions Specification](#6-convex-functions-specification)
7. [Python AI Microservice API Contract](#7-python-ai-microservice-api-contract)
8. [Frontend — Routes & Pages](#8-frontend--routes--pages)
9. [UI Components Library](#9-ui-components-library)
10. [Data Flow Diagrams](#10-data-flow-diagrams)
11. [Optimistic Update Contracts](#11-optimistic-update-contracts)
12. [Non-Functional Requirements](#12-non-functional-requirements)
13. [Phase 1 Scope (MVP)](#13-phase-1-scope-mvp)
14. [Phase 2 Scope](#14-phase-2-scope)
15. [Open Questions Log](#15-open-questions-log)

---

## 1. Product Vision & Goals

### Vision
OpenCardio is a free, open-source, emergency-medicine-first ECG analysis tool. A clinician photographs any 12-lead ECG with their phone, logs in with their trust Google account, and within 10 seconds receives AI-interpreted measurements, rhythm classification, OMI/STEMI probability, and automated QTc alerts — all without recording a single patient identifier.

### What We Are NOT Building
- A regulated medical device (in Phase 1). This is a **clinical decision support research tool**.
- A replacement for a cardiologist's opinion.
- A patient-record system. Zero PHI. Zero MRN. Zero names.

### Success Criteria (Phase 1)
| Metric | Target |
|--------|--------|
| End-to-end latency (photo → result) | < 12 seconds |
| Digitisation success rate (clean 12-lead photo) | > 85% |
| QTc measurement accuracy vs. manual | ± 10ms |
| Rhythm classification accuracy (AF, VT, SVT, HB) | > 90% sensitivity |
| Active users after soft launch | 20 ED clinicians |

---

## 2. Personas

### Persona A — Faz (ED Registrar / Developer, Primary)
- Works overnight shifts in an NHS ED. 15–20 ECGs per shift.
- Frustrated by paper ECGs sitting uninterpreted, waiting for seniors.
- Has PM Cardio personally but trusts can't afford it for all staff.
- Wants: fast OMI risk stratification, automated QTc, defensible documentation.
- Technical: builds the tool. Knows when to trust and when to distrust the AI.

### Persona B — Priya (Foundation Doctor, Year 2)
- Two months into her ED rotation. Nervous about ECG interpretation.
- Gets called to triage a chest pain at 3am. Wants reassurance.
- Wants: a clear verdict first ("This is NOT a STEMI" / "HIGH OMI RISK"), then the detail.
- Not technical. Just opens the app, takes a photo, reads the result.

### Persona C — Mike (Triage Nurse, Senior)
- Triages 40+ patients per shift. Often does the first ECG.
- Needs to know: "Is this urgent? Do I call the doctor immediately?"
- Wants: rhythm + rate, QTc flag, and an OMI amber/red indicator. That's it.
- Does not need or want complex AI detail.

### Persona D — Sanjay (ED Consultant)
- Attending who supervises. Gets called about the ECG Faz/Priya found.
- Wants to see the heatmap + AI confidence to validate or override.
- Wants a PDF he can attach to the notes for coroner documentation.
- Trusts the tool but wants explainability. "Show me where it's looking."

---

## 3. User Stories

### Epic 1: Authentication & Onboarding

**US-001** — As a clinician, I want to sign in with my NHS/trust Google account so I don't have to manage a separate password.
- Acceptance: Google SSO via Convex Auth. On first login, user record created in `users` table.
- Implemented via: `@convex-dev/auth` + Google provider.

**US-002** — As a new user signing in for the first time, I want a brief onboarding modal reminding me this tool does NOT store patient identifiers so I understand the data policy.
- Acceptance: Modal shown once, dismissed, flag stored in `users.onboardingComplete`.

**US-003** — As a user, I want my session to persist across browser refreshes without re-logging in.
- Acceptance: Convex Auth session token persists. Auto-refresh handled by the library.

---

### Epic 2: ECG Upload & Processing

**US-010** — As a clinician, I want to photograph a paper ECG with my phone camera or upload an image from my gallery so the digitisation pipeline can extract the signal.
- Acceptance: Camera capture on mobile (file input with `accept="image/*" capture="environment"`). Gallery upload on desktop.
- Image stored in Convex File Storage (`_storage`). A `ecg_scans` record is created optimistically.
- No patient name, MRN, or identifying information is entered at any point.

**US-011** — As a clinician, immediately after submitting the photo, I want to see a processing screen so the app feels instant even though the AI takes a few seconds.
- Acceptance: Optimistic update sets local query status to `"processing"` immediately. Spinner with step indicators: `Uploading → Digitising → Analysing → Done`.
- The `ecg_scans` record transitions: `uploading → processing → complete | failed`.

**US-012** — As a clinician, I want to add an optional free-text label to a scan (e.g. "Anterior chest pain, 62M") — no PII, just clinical context — so I can identify it in my history.
- Acceptance: `label` field in `ecg_scans`, max 120 characters. Optional.

**US-013** — As a clinician, if the digitisation fails (blurry image, non-standard layout), I want a clear error with guidance on retaking the photo.
- Acceptance: `status = "failed"` with `failureReason` set. UI shows specific tip (e.g. "Ensure good lighting and straight orientation").

**US-014** — As a clinician, I want the app to still function when the Python AI VPS is temporarily unavailable by queuing the request and notifying me when results are ready.
- Acceptance: Convex Scheduler retries the Action up to 3 times with exponential backoff. User sees "Analysis queued — will notify when ready". Real-time update when done.

---

### Epic 3: Results — Core Measurements

**US-020** — As a clinician, I want to immediately see the key ECG measurements: heart rate, QTc (Fridericia), QRS duration, PR interval, and cardiac axis, so I can verify calibration.
- Acceptance: Measurements section with values + reference ranges. QTc shown prominently.
- QTc alert levels: Normal (<450ms male, <460ms female) | Borderline amber (450–500ms) | Prolonged red (>500ms).

**US-021** — As a triage nurse, I want the QTc alert to be unmissable (large red banner) when QTc > 500ms so I escalate immediately.
- Acceptance: Full-width red alert banner at top of results: "⚠ PROLONGED QTc: 542ms — Review medications, seek senior review."

**US-022** — As Sanjay (Consultant), I want to see which correction formula was used for QTc (Bazett / Fridericia) and the raw QT interval so I can cross-check.
- Acceptance: QTc section shows both Fridericia (primary) and Bazett (secondary), plus raw QT and RR interval.

---

### Epic 4: Results — Rhythm & Core Diagnoses

**US-030** — As a clinician, I want to see a classified rhythm (e.g. Sinus Rhythm, Atrial Fibrillation, VT, SVT, Complete Heart Block) with a confidence score.
- Acceptance: Single primary rhythm label. Confidence badge (>80% green, 60–80% amber, <60% grey "low confidence").

**US-031** — As Priya (FY2), I want each diagnosis to come with a one-line plain-English explanation so I understand what it means without looking it up.
- Acceptance: Each diagnosis card has a collapsible "?" tooltip: e.g. AF → "Irregularly irregular rhythm. No P waves. Ventricular rate X bpm."

**US-032** — As a clinician, I want the full multi-label diagnostic summary (conduction abnormalities, hypertrophies, blocks, intervals) displayed in a scannable card layout so I can review in seconds.
- Acceptance: Diagnoses grouped into: Rhythm | Conduction | Ischaemia | Structural (Hypertrophy). Each card: label, confidence, severity colour.

---

### Epic 5: Results — OMI / STEMI Module

**US-040** — As a clinician, I want the OMI risk score to be the MOST prominent element on the results screen because it is the most time-critical clinical decision.
- Acceptance: OMI module displayed as a large card at the very top of results, above measurements.
- Three tiers: `LOW` (green), `INTERMEDIATE` (amber), `HIGH` (red).
- HIGH shows: "⚠ HIGH OMI PROBABILITY — Consider urgent catheter lab activation."

**US-041** — As Sanjay (Consultant), I want to see the lead-by-lead saliency heatmap showing which ECG segments drove the OMI score so I can validate the AI's reasoning.
- Acceptance: The digitised ECG waveform is rendered overlaid with a colour gradient (blue→red) mapped to the model's attention weights per segment, per lead.

**US-042** — As a clinician, I want explicit detection of OMI patterns beyond ST-elevation: Wellens syndrome (Type A/B), de Winter T-waves, posterior STEMI indicator, and hyperacute T-waves.
- Acceptance: Separate rule-based flags displayed as "Pattern Flags" below the OMI score. Each flag: name, lead(s) affected, brief description.

**US-043** — As a clinician, I want the app to distinguish between STEMI criteria (>1mm STE standard) and OMI probability (AI model) with separate indicators, because they are different things.
- Acceptance: Two sub-rows in the OMI card: "Standard STEMI criteria: MET / NOT MET" and "AI OMI probability: HIGH / INTERMEDIATE / LOW".

**US-044** — As a clinician treating a patient with LBBB, I want the app to automatically apply Smith-Modified Sgarbossa Criteria and display whether they are met.
- Acceptance: If LBBB detected in Core AI, Sgarbossa sub-module activates. Shows: Original Sgarbossa score (0–5) and Smith-Modified result (positive/negative), with the key leads annotated.

---

### Epic 6: Results — LVEF Screening Module

**US-050** — As a clinician, I want to know if the ECG suggests reduced LV function (LVEF < 40%) so I can initiate an urgent echo request before the patient leaves the ED.
- Acceptance: LV function card: "LIKELY REDUCED LV FUNCTION — Consider urgent echocardiogram" (red/amber) or "No ECG evidence of reduced LVEF" (green).
- AUROC disclosure shown: "This AI screen has AUROC 0.929 in validation studies. It is not a substitute for echocardiography."

**US-051** — As Faz (senior), I want to see the confidence percentage for the LVEF prediction so I can contextualise low-confidence borderline results.
- Acceptance: Probability score shown (e.g. "P(LVEF<40%) = 0.78") alongside the categorical verdict.

---

### Epic 7: Explainability & Documentation

**US-060** — As Sanjay (Consultant), I want to generate a PDF report of the ECG analysis with the digitised waveform, all measurements, diagnoses, and the OMI risk assessment so I can attach it to the clinical notes.
- Acceptance: "Export PDF" button generates a formatted A4 PDF including: timestamp, label (if any), digitised ECG image, measurements table, diagnoses, OMI verdict, LVEF verdict, heatmap image, AI version/model info, disclaimer.

**US-061** — As a clinician, I want the report footer to clearly state "This report was generated by OpenCardio AI decision support tool (non-regulated research use). Clinical decisions remain the responsibility of the treating clinician."
- Acceptance: Hard-coded disclaimer on every PDF. Model version and inference timestamp included.

---

### Epic 8: Scan History

**US-070** — As a clinician, I want to see my personal scan history (my scans only — not other users') in reverse chronological order so I can review previous ECGs I've run.
- Acceptance: History page, paginated (10 per page, `usePaginatedQuery`). Each row: timestamp, label, primary diagnosis, OMI tier colour dot, QTc value.

**US-071** — As a clinician, I want to tap/click any historical scan to see its full results again.
- Acceptance: Results page accepts `scanId` as URL param and loads from `ecg_scans` table.

**US-072** — As a clinician, I want to delete a historical scan from my history so I can manage my own records.
- Acceptance: Delete action in history list. Convex mutation deletes `ecg_scans` record AND associated `_storage` file. Optimistic update removes from list immediately.

---

### Epic 9: Settings & User Profile

**US-080** — As a clinician, I want to set my biological sex for QTc threshold calibration (male < 450ms normal, female < 460ms normal).
- Acceptance: Profile setting `users.qtcSex: "male" | "female" | "unspecified"`. Defaults to showing both thresholds if unspecified.

**US-081** — As a clinician, I want to see a disclaimer I can acknowledge that confirms I understand the tool is for research/decision support only, not as a standalone clinical diagnostic.
- Acceptance: Shown on first login (US-002). Accessible via Settings > About.

---

## 4. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                   CLOUDFLARE WORKERS                        │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │   Hono Router                                        │  │
│  │   • GET /*  → serves Vite-built React SPA assets     │  │
│  │   • SPA fallback → index.html                        │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  Static Assets (Vite build output via Workers Assets)       │
└───────────────────────────┬─────────────────────────────────┘
                            │ Browser loads React app
                            │ React ↔ Convex WebSocket (direct)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      CONVEX BACKEND                         │
│                                                             │
│  Auth: @convex-dev/auth + Google OAuth                      │
│                                                             │
│  Tables:                                                    │
│  • users         • ecg_scans       • ai_results             │
│                                                             │
│  Queries (reactive, WebSocket):                             │
│  • getMyScans   • getScanById   • getAiResult               │
│                                                             │
│  Mutations (transactional):                                 │
│  • generateUploadUrl  • createScan   • updateScanStatus     │
│  • saveScanLabel     • deleteScan   • updateUserProfile     │
│                                                             │
│  Actions (side-effects, can call external HTTP):            │
│  • processEcgScan  [calls Python VPS]                       │
│    └─ on result: runMutation(internal.saveAiResult)         │
│                                                             │
│  File Storage:                                              │
│  • ECG image → _storage → storageId on ecg_scans           │
│                                                             │
│  Scheduling:                                                │
│  • Retry logic for failed AI calls (3x, backoff)           │
└──────────────────────┬──────────────────────────────────────┘
                       │ ctx.fetch() from Action
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                 PYTHON AI VPS (Dedicated)                   │
│                 FastAPI, GPU/CPU                            │
│                                                             │
│  POST /digitise    → image → 12-lead time-series           │
│  POST /analyse     → time-series → full AI result JSON      │
│                                                             │
│  Models:                                                    │
│  • felixkrones/ECG-Digitiser (digitisation)                 │
│  • ECG-FM fine-tuned (diagnoses + LVEF)                     │
│  • Ribeiro rhythm model                                     │
│  • NeuroKit2 (measurements)                                 │
│  • Rule engine (STEMI criteria, Sgarbossa, Wellens)         │
└─────────────────────────────────────────────────────────────┘
```

### Key Architecture Decisions

**Why Hono only for routing/assets:**
Hono on Workers serves the static Vite bundle and handles SPA fallback routing. The React client communicates with Convex directly via its WebSocket client (`ConvexProvider`). Hono is NOT an API gateway between React and Convex — that would defeat the purpose of Convex's real-time reactivity.

**Why Convex Actions for AI calls:**
Actions run server-side on Convex's infrastructure and can `fetch()` the Python VPS. This keeps the VPS URL and API key secret (never in the browser). After getting the AI result, the action calls an `internalMutation` to write results to the database, which triggers reactive query updates in every connected client automatically.

**File upload flow:**
Client calls `generateUploadUrl` mutation → uploads directly to Convex storage URL (bypasses the Worker) → client calls `createScan` mutation with the storageId → Convex Action `processEcgScan` is scheduled → Action fetches the file from Convex storage, sends to Python VPS, saves result.

---

## 5. Data Model — Convex Schema

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  // --- AUTH (injected by @convex-dev/auth) ---
  ...authTables,

  // --- USERS ---
  users: defineTable({
    // Identity
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    image: v.optional(v.string()),
    // Linked via @convex-dev/auth
    tokenIdentifier: v.string(),

    // App-level profile
    qtcSex: v.optional(v.union(
      v.literal("male"),
      v.literal("female"),
      v.literal("unspecified")
    )),
    onboardingComplete: v.boolean(),
    role: v.optional(v.union(
      v.literal("clinician"),
      v.literal("researcher"),
      v.literal("admin")
    )),
    createdAt: v.number(), // ms epoch
  })
    .index("by_token", ["tokenIdentifier"])
    .index("by_email", ["email"]),

  // --- ECG SCANS ---
  // One record per ECG photo submitted by a user
  ecg_scans: defineTable({
    userId: v.id("users"),

    // Storage
    storageId: v.id("_storage"),          // Convex file storage ID
    imageContentType: v.string(),          // e.g. "image/jpeg"
    imageSizeBytes: v.optional(v.number()),

    // Metadata (non-PII)
    label: v.optional(v.string()),         // Free-text, max 120 chars, no PII
    capturedAt: v.number(),                // Client-supplied timestamp (ms)

    // Processing pipeline status
    status: v.union(
      v.literal("uploading"),     // Image upload in progress
      v.literal("processing"),    // Sent to Python VPS
      v.literal("complete"),      // AI result available
      v.literal("failed")         // Irrecoverable error
    ),
    failureReason: v.optional(v.string()),
    retryCount: v.optional(v.number()),

    // Linked result (set after processing)
    aiResultId: v.optional(v.id("ai_results")),
  })
    .index("by_user", ["userId"])
    .index("by_user_status", ["userId", "status"])
    .index("by_user_created", ["userId", "_creationTime"]),

  // --- AI RESULTS ---
  // One record per completed analysis, linked from ecg_scans
  ai_results: defineTable({
    scanId: v.id("ecg_scans"),
    userId: v.id("users"),

    // Digitisation outputs
    digitisedSignalStorageId: v.optional(v.id("_storage")), // WFDB/JSON signal
    digitisationQuality: v.optional(v.union(
      v.literal("good"),
      v.literal("acceptable"),
      v.literal("poor")
    )),
    leadLayoutDetected: v.optional(v.string()), // e.g. "standard_3x4_rhythm"

    // --- MEASUREMENTS ---
    heartRateBpm: v.optional(v.number()),
    rrIntervalMs: v.optional(v.number()),
    prIntervalMs: v.optional(v.number()),
    qrsWidthMs: v.optional(v.number()),
    qtIntervalMs: v.optional(v.number()),
    qtcFridericia: v.optional(v.number()),    // Primary QTc
    qtcBazett: v.optional(v.number()),        // Secondary QTc
    cardiacAxisDegrees: v.optional(v.number()),
    pWaveDurationMs: v.optional(v.number()),

    // --- QTc ALERT ---
    qtcAlertLevel: v.optional(v.union(
      v.literal("normal"),
      v.literal("borderline"),    // 450–500ms
      v.literal("prolonged")      // >500ms
    )),

    // --- RHYTHM (primary) ---
    primaryRhythm: v.optional(v.string()),       // e.g. "Atrial Fibrillation"
    primaryRhythmCode: v.optional(v.string()),   // e.g. "AF"
    primaryRhythmConfidence: v.optional(v.number()), // 0–1

    // --- MULTI-LABEL DIAGNOSES ---
    // Array of diagnosis objects
    diagnoses: v.optional(v.array(v.object({
      label: v.string(),
      code: v.string(),              // Short code e.g. "LBBB", "LVH", "1AVB"
      category: v.union(
        v.literal("rhythm"),
        v.literal("conduction"),
        v.literal("ischaemia"),
        v.literal("structural"),
        v.literal("other")
      ),
      confidence: v.number(),        // 0–1
      severity: v.union(
        v.literal("info"),
        v.literal("warning"),
        v.literal("critical")
      ),
      leadsAffected: v.optional(v.array(v.string())),
      explanation: v.optional(v.string()), // One-line plain English
    }))),

    // --- OMI / STEMI MODULE ---
    omiProbability: v.optional(v.number()),         // 0–1 raw probability
    omiTier: v.optional(v.union(
      v.literal("low"),
      v.literal("intermediate"),
      v.literal("high")
    )),
    stemiCriteriaMet: v.optional(v.boolean()),      // Standard criteria
    stemiCriteriaLeads: v.optional(v.array(v.string())),

    // Sgarbossa (activated only if LBBB/LVH detected)
    sgarbossaActivated: v.optional(v.boolean()),
    sgarbossaOriginalScore: v.optional(v.number()), // 0–5
    sgarbossaSmithModified: v.optional(v.union(
      v.literal("positive"),
      v.literal("negative"),
      v.literal("indeterminate")
    )),

    // Pattern flags (rule-based)
    patternFlags: v.optional(v.array(v.object({
      pattern: v.string(),           // e.g. "Wellens Type B"
      leads: v.array(v.string()),
      description: v.string(),
      severity: v.union(v.literal("warning"), v.literal("critical")),
    }))),

    // Heatmap: per-lead saliency arrays (JSON-serialised floats)
    // Key: lead name ("I", "II", "V1"…"V6"), Value: array of weights
    omiHeatmapData: v.optional(v.any()),            // Record<string, number[]>

    // --- LVEF MODULE ---
    lvefProbabilityReduced: v.optional(v.number()), // P(LVEF < 40%)
    lvefVerdict: v.optional(v.union(
      v.literal("likely_reduced"),    // > 0.65
      v.literal("borderline"),        // 0.40–0.65
      v.literal("likely_normal")      // < 0.40
    )),

    // --- PROVENANCE ---
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
```

---

## 6. Convex Functions Specification

### 6.1 Mutations

#### `mutations/scans.ts`

```typescript
// generateUploadUrl
// Called first by client before uploading image file.
// Returns a short-lived upload URL (expires 1 hour).
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    return await ctx.storage.generateUploadUrl();
  },
});

// createScan
// Called after client has uploaded image to Convex storage.
// Creates the ecg_scans record and schedules the AI action.
export const createScan = mutation({
  args: {
    storageId: v.id("_storage"),
    imageContentType: v.string(),
    imageSizeBytes: v.optional(v.number()),
    label: v.optional(v.string()),
    capturedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) throw new Error("User not found");

    // Validate label is not suspicious PII (basic check)
    if (args.label && args.label.length > 120) throw new Error("Label too long");

    const scanId = await ctx.db.insert("ecg_scans", {
      userId: user._id,
      storageId: args.storageId,
      imageContentType: args.imageContentType,
      imageSizeBytes: args.imageSizeBytes,
      label: args.label,
      capturedAt: args.capturedAt,
      status: "processing",
      retryCount: 0,
    });

    // Schedule the AI processing action immediately
    await ctx.scheduler.runAfter(0, internal.actions.processEcgScan, {
      scanId,
      storageId: args.storageId,
      userId: user._id,
    });

    return scanId;
  },
});

// updateScanLabel
export const updateScanLabel = mutation({
  args: { scanId: v.id("ecg_scans"), label: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const scan = await ctx.db.get(args.scanId);
    // Ownership check
    const user = await getUserByToken(ctx, identity.tokenIdentifier);
    if (scan?.userId !== user._id) throw new Error("Not authorized");
    await ctx.db.patch(args.scanId, { label: args.label });
  },
});

// deleteScan
export const deleteScan = mutation({
  args: { scanId: v.id("ecg_scans") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const scan = await ctx.db.get(args.scanId);
    const user = await getUserByToken(ctx, identity.tokenIdentifier);
    if (scan?.userId !== user._id) throw new Error("Not authorized");

    // Delete associated AI result if exists
    if (scan.aiResultId) {
      const result = await ctx.db.get(scan.aiResultId);
      if (result?.digitisedSignalStorageId) {
        await ctx.storage.delete(result.digitisedSignalStorageId);
      }
      await ctx.db.delete(scan.aiResultId);
    }

    // Delete the image from storage
    await ctx.storage.delete(scan.storageId);

    // Delete the scan record
    await ctx.db.delete(args.scanId);
  },
});

// updateUserProfile
export const updateUserProfile = mutation({
  args: {
    qtcSex: v.optional(v.union(v.literal("male"), v.literal("female"), v.literal("unspecified"))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const user = await getUserByToken(ctx, identity.tokenIdentifier);
    await ctx.db.patch(user._id, { ...args });
  },
});

// completeOnboarding
export const completeOnboarding = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const user = await getUserByToken(ctx, identity.tokenIdentifier);
    await ctx.db.patch(user._id, { onboardingComplete: true });
  },
});
```

#### `mutations/internal.ts`

```typescript
// saveAiResult — internal only, called from Action
export const saveAiResult = internalMutation({
  args: {
    scanId: v.id("ecg_scans"),
    userId: v.id("users"),
    result: v.any(), // Full AiResultPayload from Python VPS
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
  },
});

// markScanFailed — internal only
export const markScanFailed = internalMutation({
  args: {
    scanId: v.id("ecg_scans"),
    reason: v.string(),
    retryCount: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.scanId, {
      status: args.retryCount < 3 ? "processing" : "failed",
      failureReason: args.reason,
      retryCount: args.retryCount,
    });
  },
});
```

### 6.2 Queries

#### `queries/scans.ts`

```typescript
// getMyScans — paginated scan history
export const getMyScans = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { page: [], isDone: true, continueCursor: "" };

    const user = await getUserByToken(ctx, identity.tokenIdentifier);
    if (!user) return { page: [], isDone: true, continueCursor: "" };

    return await ctx.db
      .query("ecg_scans")
      .withIndex("by_user_created", (q) => q.eq("userId", user._id))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

// getScanById
export const getScanById = query({
  args: { scanId: v.id("ecg_scans") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const scan = await ctx.db.get(args.scanId);
    if (!scan) return null;

    const user = await getUserByToken(ctx, identity.tokenIdentifier);
    // Ownership check
    if (scan.userId !== user?._id) return null;

    return scan;
  },
});

// getAiResult
export const getAiResult = query({
  args: { scanId: v.id("ecg_scans") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const scan = await ctx.db.get(args.scanId);
    if (!scan) return null;

    const user = await getUserByToken(ctx, identity.tokenIdentifier);
    if (scan.userId !== user?._id) return null;

    if (!scan.aiResultId) return null;
    return await ctx.db.get(scan.aiResultId);
  },
});

// getCurrentUser
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    return await getUserByToken(ctx, identity.tokenIdentifier);
  },
});

// getEcgImageUrl — serves a temporary signed URL for the stored ECG image
export const getEcgImageUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});
```

### 6.3 Actions

#### `actions/processEcgScan.ts`

```typescript
"use node"; // Needs Node.js for FormData + complex HTTP handling

export const processEcgScan = internalAction({
  args: {
    scanId: v.id("ecg_scans"),
    storageId: v.id("_storage"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const VPS_URL = process.env.AI_VPS_URL!;
    const VPS_SECRET = process.env.AI_VPS_SECRET!;

    // Fetch the image from Convex storage
    const imageUrl = await ctx.storage.getUrl(args.storageId);
    if (!imageUrl) {
      await ctx.runMutation(internal.mutations.markScanFailed, {
        scanId: args.scanId,
        reason: "Image not found in storage",
        retryCount: 0,
      });
      return;
    }

    const imageBlob = await fetch(imageUrl).then(r => r.blob());

    const startMs = Date.now();
    try {
      // Step 1: Digitise the ECG image
      const digitiseForm = new FormData();
      digitiseForm.append("image", imageBlob, "ecg.jpg");

      const digitiseRes = await fetch(`${VPS_URL}/digitise`, {
        method: "POST",
        headers: { "X-API-Secret": VPS_SECRET },
        body: digitiseForm,
      });

      if (!digitiseRes.ok) {
        throw new Error(`Digitisation failed: ${digitiseRes.status}`);
      }

      const { signal, quality, layout } = await digitiseRes.json();

      // Step 2: Full analysis on the digitised signal
      const analyseRes = await fetch(`${VPS_URL}/analyse`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Secret": VPS_SECRET,
        },
        body: JSON.stringify({ signal, quality, layout }),
      });

      if (!analyseRes.ok) {
        throw new Error(`Analysis failed: ${analyseRes.status}`);
      }

      const aiPayload = await analyseRes.json();
      const inferenceLatencyMs = Date.now() - startMs;

      await ctx.runMutation(internal.mutations.saveAiResult, {
        scanId: args.scanId,
        userId: args.userId,
        result: {
          ...aiPayload,
          digitisationQuality: quality,
          leadLayoutDetected: layout,
          inferenceLatencyMs,
          inferenceTimestampMs: Date.now(),
        },
      });

    } catch (err) {
      // Get current retry count
      const scan = await ctx.runQuery(internal.queries.getScanRetryCount, {
        scanId: args.scanId,
      });
      const retryCount = (scan?.retryCount ?? 0) + 1;

      if (retryCount < 3) {
        // Exponential backoff retry: 5s, 15s, 45s
        const delayMs = Math.pow(3, retryCount) * 5000;
        await ctx.scheduler.runAfter(delayMs, internal.actions.processEcgScan, {
          scanId: args.scanId,
          storageId: args.storageId,
          userId: args.userId,
        });
      }

      await ctx.runMutation(internal.mutations.markScanFailed, {
        scanId: args.scanId,
        reason: String(err),
        retryCount,
      });
    }
  },
});
```

---

## 7. Python AI Microservice API Contract

The Python VPS exposes a FastAPI server. Convex Actions communicate with it exclusively.

### Authentication
All requests must include header: `X-API-Secret: <AI_VPS_SECRET>`

### POST `/digitise`
**Input:** `multipart/form-data` with field `image` (JPEG/PNG, max 20MB)

**Output JSON:**
```json
{
  "signal": {
    "I":   [/* array of float, 500 samples/sec, 10s = 5000 points */],
    "II":  [...],
    "III": [...],
    "aVR": [...], "aVL": [...], "aVF": [...],
    "V1":  [...], "V2":  [...], "V3":  [...],
    "V4":  [...], "V5":  [...], "V6":  [...]
  },
  "quality": "good" | "acceptable" | "poor",
  "layout": "standard_3x4_rhythm" | "cabrera" | "2x6" | "unknown",
  "sample_rate_hz": 500,
  "duration_s": 10
}
```

**Error:** `{ "error": "string", "detail": "string" }`

### POST `/analyse`
**Input JSON:**
```json
{
  "signal": { /* same as above */ },
  "quality": "good",
  "layout": "standard_3x4_rhythm"
}
```

**Output JSON:**
```json
{
  "measurements": {
    "heart_rate_bpm": 72,
    "rr_interval_ms": 833,
    "pr_interval_ms": 162,
    "qrs_width_ms": 88,
    "qt_interval_ms": 380,
    "qtc_fridericia": 441,
    "qtc_bazett": 450,
    "cardiac_axis_degrees": 45,
    "p_wave_duration_ms": 96
  },
  "qtc_alert_level": "normal" | "borderline" | "prolonged",
  "primary_rhythm": {
    "label": "Sinus Rhythm",
    "code": "SR",
    "confidence": 0.97
  },
  "diagnoses": [
    {
      "label": "Left Bundle Branch Block",
      "code": "LBBB",
      "category": "conduction",
      "confidence": 0.91,
      "severity": "warning",
      "leads_affected": ["V5", "V6", "I"],
      "explanation": "Wide QRS with specific morphology indicating delay in left bundle activation."
    }
  ],
  "omi": {
    "probability": 0.82,
    "tier": "high",
    "stemi_criteria_met": false,
    "stemi_criteria_leads": [],
    "sgarbossa_activated": true,
    "sgarbossa_original_score": 3,
    "sgarbossa_smith_modified": "positive",
    "pattern_flags": [
      {
        "pattern": "Sgarbossa Smith-Modified Positive",
        "leads": ["V1", "V2"],
        "description": "Proportional concordant ST elevation exceeding Smith-modified threshold.",
        "severity": "critical"
      }
    ],
    "heatmap_data": {
      "I":   [0.1, 0.1, 0.3, 0.8, 0.9, 0.7, 0.2, ...],
      "V1":  [...],
      /* one weight per sample, same length as signal */
    }
  },
  "lvef": {
    "probability_reduced": 0.73,
    "verdict": "likely_reduced" | "borderline" | "likely_normal"
  },
  "model_versions": {
    "digitiser": "ECGDigitiser-1.0-physionet2024",
    "core_dx": "ECG-FM-1.5M-finetuned-ptbxl",
    "omi": "ECG-FM-OMI-v1",
    "lvef": "ECG-FM-LVEF-v1"
  }
}
```

---

## 8. Frontend — Routes & Pages

Built with React + Vite, deployed via Hono on Cloudflare Workers as a SPA.

### Route Map

```
/                   → Landing / Login page (if not authed)
                    → Redirect to /scan (if authed)
/scan               → Main capture/upload page
/scan/:scanId       → Results page for a specific scan
/history            → Paginated scan history
/settings           → User profile / preferences
/about              → About + disclaimer
```

### Route Guard
All routes except `/` require authentication. `ConvexAuthProvider` wraps the app. Unauthenticated users are redirected to `/`.

### Page Specifications

#### Page: `/` — Landing
- If already authenticated: redirect to `/scan`
- If not: show app name, tagline, and "Sign in with Google" button
- `useAuthActions().signIn("google")` triggers OAuth flow

#### Page: `/scan` — Main Capture
States:
1. **Idle**: Large camera/upload button. Optional label input. Recent scan count.
2. **Uploading**: Progress bar (Convex storage upload). Triggered by optimistic update.
3. **Processing**: Animated step indicator ("Digitising ECG..." → "Analysing rhythms..." → "Checking for OMI...")
4. **Error**: Retry button + specific error message.

Transitions managed by: `ecg_scans.status` field via `useQuery(api.scans.getScanById)`.

On upload complete: redirect to `/scan/:scanId`.

#### Page: `/scan/:scanId` — Results
Three-column layout on desktop, stacked on mobile:
1. **Left/Top**: ECG waveform viewer (digitised signal rendered as SVG/canvas, heatmap overlay)
2. **Middle/Main**: Results panels (ordered by clinical priority):
   - OMI Module card (FIRST, most prominent)
   - QTc Alert banner (if borderline/prolonged)
   - Measurements table
   - Primary Rhythm card
   - Diagnoses grid (categorised)
   - LVEF card
   - Pattern Flags list
3. **Right/Bottom**: Actions (Export PDF, Edit Label, Delete, Share)

Loading state: Show skeleton cards while `useQuery(api.scans.getAiResult)` loads. Real-time reactive — auto-updates when processing completes.

#### Page: `/history`
- Reverse-chronological paginated list using `usePaginatedQuery`
- Each row: timestamp, label, OMI tier dot, primary rhythm, QTc value, status indicator
- Swipe-to-delete on mobile, hover delete button on desktop
- Search/filter by label text using Convex text search

#### Page: `/settings`
- Profile section: Name, email (read-only from Google), QTc sex preference
- Session: Sign out button
- About: Version, disclaimer, link to GitHub

---

## 9. UI Components Library

All components built with Tailwind CSS + shadcn/ui. Mobile-first.

### Core Components

#### `<OmiScoreCard>`
Props: `omiTier: "low"|"intermediate"|"high"`, `probability: number`, `stemiCriteriaMet: boolean`
- Renders: Large colour-coded card. Red for HIGH, amber for INTERMEDIATE, green for LOW.
- HIGH state: pulsing red border animation. Critical finding badge.
- Expandable: shows Sgarbossa details if activated.

#### `<QtcBanner>`
Props: `qtcMs: number`, `alertLevel: "normal"|"borderline"|"prolonged"`, `sex?: string`
- `normal`: renders nothing (invisible)
- `borderline`: amber banner, "Borderline QTc: 472ms — Monitor, review QT-prolonging medications"
- `prolonged`: full-width red pulsing banner, "⚠ PROLONGED QTc: 542ms — Seek senior review NOW"

#### `<EcgWaveformViewer>`
Props: `signal: Record<string, number[]>`, `heatmapData?: Record<string, number[]>`, `sampleRateHz: number`
- Renders all 12 leads in standard 3×4 grid layout using SVG
- Heatmap overlay: colour gradient per sample point (blue=low attention, red=high attention)
- Zoom/pan support on mobile (pinch gesture)
- Lead labels visible

#### `<DiagnosisCard>`
Props: `diagnosis: DiagnosisObject`
- Colour by severity: `info` grey, `warning` amber, `critical` red
- Confidence badge
- Collapsible explanation tooltip
- Affected leads tags

#### `<MeasurementsTable>`
Props: `measurements: MeasurementsObject`, `qtcSex?: "male"|"female"`
- Grid layout: Measurement | Value | Normal Range | Status dot
- QTc row highlighted if abnormal

#### `<LvefCard>`
Props: `verdict: string`, `probability: number`
- Green/amber/red card
- AUROC disclosure link (opens modal)

#### `<ProcessingSteps>`
Props: `currentStep: "uploading"|"digitising"|"analysing"|"done"`
- Animated step indicators with checkmarks on completion
- Realistic timing expectations shown ("Usually 6–10 seconds")

#### `<ScanHistoryRow>`
Props: `scan: EcgScan`, `onDelete: () => void`
- Compact row: timestamp | label | OMI dot | rhythm | QTc | status pill
- Tap → navigate to `/scan/:id`

---

## 10. Data Flow Diagrams

### Flow A: ECG Upload & Processing (Happy Path)

```
User taps "Capture"
       │
       ▼
[Browser] Calls generateUploadUrl mutation
       │ ← Returns upload URL (expires 1h)
       │
[Browser] POST image to Convex storage URL
       │ ← Returns { storageId }
       │
[Browser] Calls createScan mutation with storageId
       │                    │
       │   OPTIMISTIC UPDATE: adds ecg_scans record locally
       │   with status="processing" immediately
       │                    │
       ← scanId returned     │
       │                    ▼
       │          [Convex DB] ecg_scans record created
       │          [Convex Scheduler] processEcgScan scheduled
       │
[Browser] Redirects to /scan/:scanId
       │
       ▼
[Browser] useQuery(getScanById) + useQuery(getAiResult) both active
       │ (reactive WebSocket subscription)
       │
[Convex Action: processEcgScan]
  → fetch image from Convex storage
  → POST /digitise to Python VPS
  ← { signal, quality, layout }
  → POST /analyse to Python VPS
  ← { measurements, diagnoses, omi, lvef, ... }
  → runMutation(saveAiResult)
       │
[Convex DB] ai_results record created
           ecg_scans.status → "complete"
           ecg_scans.aiResultId → resultId
       │
       ▼
[WebSocket] Convex pushes update to all subscribed clients
       │
[Browser] useQuery results update → React re-renders results page
       ▼
User sees full results (< 12s total)
```

### Flow B: Delete Scan (with Optimistic Update)

```
User taps "Delete" on scan row
       │
[Browser] deleteScan mutation called
       │
OPTIMISTIC UPDATE:
  localStore.getQuery(getMyScans) filtered to remove scan._id
  → scan disappears from list IMMEDIATELY
       │
[Server] Convex mutation executes:
  1. Delete ai_results record
  2. storage.delete(digitisedSignalStorageId) if exists
  3. storage.delete(storageId)
  4. Delete ecg_scans record
       │
[WebSocket] Server confirms deletion → optimistic state verified
       (or rolled back if error — scan reappears)
```

---

## 11. Optimistic Update Contracts

### Upload Flow Optimistic Update
```typescript
// On createScan mutation
const createScan = useMutation(api.scans.createScan)
  .withOptimisticUpdate((localStore, args) => {
    // Inject a fake "processing" scan into the getMyScans query
    const existing = localStore.getQuery(api.scans.getMyScans, { /* paginationOpts */ });
    if (existing !== undefined) {
      const fakeScan = {
        _id: crypto.randomUUID() as Id<"ecg_scans">,
        _creationTime: Date.now(),
        storageId: args.storageId,
        label: args.label,
        status: "processing" as const,
        capturedAt: args.capturedAt,
        // userId etc filled optimistically
      };
      // Note: Only modifies in-memory; server will confirm/replace
      localStore.setQuery(
        api.scans.getMyScans,
        {},
        { ...existing, page: [fakeScan, ...existing.page] }
      );
    }
  });
```

### Delete Scan Optimistic Update
```typescript
const deleteScan = useMutation(api.scans.deleteScan)
  .withOptimisticUpdate((localStore, args) => {
    const existing = localStore.getQuery(api.scans.getMyScans, {});
    if (existing !== undefined) {
      localStore.setQuery(
        api.scans.getMyScans,
        {},
        {
          ...existing,
          page: existing.page.filter((s) => s._id !== args.scanId),
        }
      );
    }
  });
```

---

## 12. Non-Functional Requirements

### Performance
| Requirement | Target |
|-------------|--------|
| Page load (Cloudflare Worker, cold) | < 1.5s |
| Photo → Processing Screen transition | < 200ms (optimistic) |
| Photo → Full Results (happy path) | < 12 seconds |
| History page load (first 10 scans) | < 500ms |
| PDF export generation | < 3 seconds |

### Security
- All Convex functions check `ctx.auth.getUserIdentity()` — no unauthenticated access.
- Ownership checks on every query/mutation that returns user data.
- Python VPS protected by `X-API-Secret` header. Secret stored in Convex env vars, never in client.
- Image URLs are signed/temporary (Convex `storage.getUrl()` returns short-lived URLs).
- No patient identifiers accepted in any input field — enforced in Convex validators (label max 120 chars, no fields for MRN/name/DOB).
- HTTPS everywhere (Cloudflare + Convex both enforce TLS).

### Privacy & IG
- GDPR legal basis: Legitimate interests (clinical decision support research).
- No PHI stored at any point in the system.
- Convex data residency: EU deployment (Convex supports EU region).
- File retention: scan images and results retained until user deletes. No automatic purge in Phase 1.
- Data subject rights: user can delete all their scans via the History page (cascade deletes storage).

### Accessibility
- WCAG 2.1 AA compliance minimum.
- Colour-blind safe: OMI tiers communicated with both colour AND icon + text (not colour only).
- QTc alerts use both colour and icon and text.
- Large touch targets on mobile (minimum 44×44px).

### Browser / Platform Support
- Mobile Chrome (iOS/Android): primary target
- Desktop Chrome/Firefox/Safari: supported
- PWA: `manifest.json` + service worker for "Add to Home Screen" on mobile

---

## 13. Phase 1 Scope (MVP)

The following is the definitive scope for the first working build. Everything else is Phase 2.

### IN SCOPE
- [x] Google SSO authentication (Convex Auth + Google OAuth)
- [x] ECG image upload → Convex File Storage
- [x] Optimistic processing screen
- [x] Python VPS with mocked AI responses (Phase 1.0), then real models (Phase 1.1)
- [x] Convex Action calling Python VPS, retry on failure (3x exponential backoff)
- [x] Automated ECG measurements (HR, QTc Fridericia, QRS, PR, axis)
- [x] QTc alert banner (borderline/prolonged tiers)
- [x] Primary rhythm classification with confidence
- [x] Multi-label diagnoses grid (basic categories)
- [x] OMI score card with tier indicator (LOW/INTERMEDIATE/HIGH)
- [x] Standard STEMI criteria flag (rule-based)
- [x] ECG waveform viewer (digitised signal, no heatmap in Phase 1)
- [x] Scan history (paginated)
- [x] Delete scan (cascade)
- [x] PDF report export
- [x] Onboarding disclaimer modal
- [x] Settings: QTc sex preference
- [x] Mobile-first responsive layout
- [x] Hono on Cloudflare Workers serving Vite SPA

### OUT OF SCOPE (Phase 2)
- [ ] OMI heatmap overlay on waveform
- [ ] LVEF prediction module
- [ ] Sgarbossa sub-module
- [ ] Wellens / de Winter pattern flags
- [ ] Posterior STEMI guidance
- [ ] Serial ECG comparison
- [ ] Full-text search in history
- [ ] Cerner SMART on FHIR integration
- [ ] Real Python AI models (replacing mock in 1.0)

### Phase 1 Milestones

**Week 1–2: Skeleton + Auth**
- Hono + Vite + React app deploying to Cloudflare Workers
- Convex project initialised with Google SSO
- Users table + auth flow working
- Onboarding modal

**Week 3–4: Upload Pipeline**
- `generateUploadUrl` → upload → `createScan` flow
- Convex File Storage integration
- Optimistic update on createScan
- Processing screen with step indicators
- Python VPS stub (returns mock AI JSON immediately)

**Week 5–6: Results Screen**
- ECG waveform viewer (digitised signal from mock)
- Measurements table with QTc alert
- OMI score card
- Diagnoses grid
- Basic rhythm card

**Week 7–8: History + Polish**
- Paginated history page
- Delete with optimistic update
- PDF report export
- Settings page
- Mobile UX pass (touch targets, spacing)
- Error states + retry UI

---

## 14. Phase 2 Scope

### P2.1: Full AI Models (Real Python VPS)
- Deploy `felixkrones/ECG-Digitiser` model on VPS
- Deploy ECG-FM fine-tuned for Core Dx
- Deploy Ribeiro rhythm model
- NeuroKit2 measurement pipeline
- Replace mock responses with real inference

### P2.2: OMI Heatmap
- Python VPS returns `heatmap_data` per lead
- ECG waveform viewer renders colour gradient overlay
- "Why did the AI flag this?" lead annotation

### P2.3: LVEF Module
- Fine-tune ECG-FM on MIMIC-IV-ECG echo linkage data
- Add LVEF card to results
- AUROC disclosure modal

### P2.4: Advanced Pattern Recognition
- Sgarbossa sub-module (activates when LBBB detected)
- Wellens syndrome type A/B rule-based detection
- de Winter T-wave pattern
- Posterior STEMI V7-V9 prompting

### P2.5: Serial ECG Comparison
- "Compare with previous" option on results page
- Side-by-side waveform viewer
- Automatic change detection (ST deviation delta)

### P2.6: Cerner Integration
- SMART on FHIR app registration
- Patient context auto-populated from PowerChart
- Write-back of ECG result as FHIR Observation

---

## 15. Open Questions Log

| ID | Question | Owner | Status |
|----|----------|-------|--------|
| OQ-01 | What VPS specs are needed for Phase 1.0 mock vs 1.1 real models? Single VPS sufficient? | Faz | Open |
| OQ-02 | Convex EU region deployment — confirm pricing tier and data residency documentation needed for DTAC? | Faz | Open |
| OQ-03 | For the ECG waveform viewer: use a Canvas-based library (LightningChart, ApexCharts) or build SVG renderer? Performance tradeoff on mobile? | Faz | Open |
| OQ-04 | Should the PDF export happen client-side (jsPDF in browser) or server-side (Convex Action + puppeteer)? Client-side is simpler but styling is harder. | Faz | Open |
| OQ-05 | Do we need vector search on scan history (semantic search by clinical description) or is Convex text search on `label` field sufficient for MVP? | Faz | Low priority, Phase 2 |
| OQ-06 | Should Phase 1 mock responses be pre-defined JSON fixtures (fast, consistent for UI dev) or a random-within-realistic-range generator? | Faz | Open |
| OQ-07 | Hono on Workers — using `@hono/vite-dev-server` locally or standard `vite dev` with Convex? Need to agree on dev setup. | Faz | Open |

---

*This PRD represents the complete specification for OpenCardio Phase 1 MVP and Phase 2. It is a living document. All implementation decisions that deviate from this spec should be recorded in the Open Questions Log.*

*Regulatory disclaimer: OpenCardio is intended for research and clinical decision support, not as a regulated medical device in Phase 1. Clinical decisions remain the responsibility of the treating clinician.*
