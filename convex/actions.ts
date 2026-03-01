"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// Generate a realistic mock ECG signal for Phase 1 (mock mode)
function generateMockSignal(): Record<string, number[]> {
  const leads = ["I", "II", "III", "aVR", "aVL", "aVF", "V1", "V2", "V3", "V4", "V5", "V6"];
  const sampleRate = 500;
  const duration = 10;
  const samples = sampleRate * duration;

  // Heart rate ~72 bpm → RR ~833ms → ~416 samples
  const rrSamples = Math.round((833 / 1000) * sampleRate);

  // Lead-specific amplitude scaling
  const amplitudes: Record<string, number> = {
    I: 1.0, II: 1.2, III: 0.8, aVR: -0.9, aVL: 0.6, aVF: 1.0,
    V1: 0.3, V2: 0.5, V3: 0.8, V4: 1.2, V5: 1.1, V6: 0.9,
  };

  const signal: Record<string, number[]> = {};

  for (const lead of leads) {
    const data: number[] = [];
    const amp = amplitudes[lead] ?? 1.0;

    for (let i = 0; i < samples; i++) {
      const phase = (i % rrSamples) / rrSamples; // 0-1 within each beat
      let v = 0;

      // P wave (atrial depolarisation)
      if (phase >= 0.08 && phase < 0.18) {
        v = 0.2 * Math.sin(Math.PI * (phase - 0.08) / 0.10);
      }
      // Q wave (small negative deflection)
      else if (phase >= 0.27 && phase < 0.31) {
        v = -0.08 * Math.sin(Math.PI * (phase - 0.27) / 0.04);
      }
      // R wave (main ventricular depolarisation spike)
      else if (phase >= 0.31 && phase < 0.39) {
        v = 1.4 * Math.sin(Math.PI * (phase - 0.31) / 0.08);
      }
      // S wave
      else if (phase >= 0.39 && phase < 0.43) {
        v = -0.15 * Math.sin(Math.PI * (phase - 0.39) / 0.04);
      }
      // T wave (ventricular repolarisation)
      else if (phase >= 0.48 && phase < 0.68) {
        v = 0.35 * Math.sin(Math.PI * (phase - 0.48) / 0.20);
      }

      // Add small baseline noise
      v += (Math.random() - 0.5) * 0.015;

      data.push(Number((v * amp).toFixed(4)));
    }

    signal[lead] = data;
  }

  return signal;
}

// Build a mock AI result — realistic sinus rhythm, low OMI risk
function buildMockAiResult(): Record<string, unknown> {
  return {
    signalData: generateMockSignal(),
    digitisationQuality: "good",
    leadLayoutDetected: "standard_3x4_rhythm",

    // Measurements
    heartRateBpm: 72,
    rrIntervalMs: 833,
    prIntervalMs: 162,
    qrsWidthMs: 88,
    qtIntervalMs: 380,
    qtcFridericia: 420,
    qtcBazett: 435,
    cardiacAxisDegrees: 45,
    pWaveDurationMs: 96,

    qtcAlertLevel: "normal",

    // Rhythm
    primaryRhythm: "Sinus Rhythm",
    primaryRhythmCode: "SR",
    primaryRhythmConfidence: 0.97,

    // Diagnoses
    diagnoses: [
      {
        label: "Sinus Rhythm",
        code: "SR",
        category: "rhythm",
        confidence: 0.97,
        severity: "info",
        leadsAffected: [],
        explanation: "Normal regular rhythm originating from the sinoatrial node at 72 bpm.",
      },
    ],

    // OMI / STEMI
    omiProbability: 0.06,
    omiTier: "low",
    stemiCriteriaMet: false,
    stemiCriteriaLeads: [],
    sgarbossaActivated: false,
    sgarbossaOriginalScore: null,
    sgarbossaSmithModified: null,
    patternFlags: [],

    // LVEF
    lvefProbabilityReduced: 0.12,
    lvefVerdict: "likely_normal",

    // Provenance
    modelVersionDigitiser: "mock-1.0-phase1",
    modelVersionCoreDx: "mock-1.0-phase1",
    modelVersionOmi: "mock-1.0-phase1",
    modelVersionLvef: "mock-1.0-phase1",
  };
}

export const processEcgScan = internalAction({
  args: {
    scanId: v.id("ecg_scans"),
    storageId: v.id("_storage"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const VPS_URL = process.env.AI_VPS_URL;
    const VPS_SECRET = process.env.AI_VPS_SECRET ?? "";

    const startMs = Date.now();

    // ── MOCK MODE (no VPS configured) ─────────────────────────────────────
    if (!VPS_URL) {
      // Simulate a ~2 second processing delay
      await new Promise((resolve) => setTimeout(resolve, 2000));

      await ctx.runMutation(internal.internalFunctions.saveAiResult, {
        scanId: args.scanId,
        userId: args.userId,
        result: {
          ...buildMockAiResult(),
          inferenceTimestampMs: Date.now(),
          inferenceLatencyMs: Date.now() - startMs,
        },
      });
      return;
    }

    // ── REAL MODE (Python VPS configured) ─────────────────────────────────
    try {
      // Fetch image from Convex storage
      const imageUrl = await ctx.storage.getUrl(args.storageId);
      if (!imageUrl) {
        throw new Error("Image not found in storage");
      }

      const imageBlob = await fetch(imageUrl).then((r) => r.blob());

      // Step 1: Digitise
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

      const { signal, quality, layout } = (await digitiseRes.json()) as {
        signal: Record<string, number[]>;
        quality: string;
        layout: string;
      };

      // Step 2: Analyse
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

      const aiPayload = (await analyseRes.json()) as Record<string, unknown>;

      await ctx.runMutation(internal.internalFunctions.saveAiResult, {
        scanId: args.scanId,
        userId: args.userId,
        result: {
          ...aiPayload,
          signalData: signal,
          digitisationQuality: quality,
          leadLayoutDetected: layout,
          inferenceLatencyMs: Date.now() - startMs,
          inferenceTimestampMs: Date.now(),
        },
      });
    } catch (err) {
      const scanInfo = await ctx.runQuery(
        internal.internalFunctions.getScanRetryCount,
        { scanId: args.scanId }
      );
      const retryCount = (scanInfo?.retryCount ?? 0) + 1;

      if (retryCount < 3) {
        // Exponential backoff: 5s, 15s, 45s
        const delayMs = Math.pow(3, retryCount) * 5000;
        await ctx.scheduler.runAfter(delayMs, internal.actions.processEcgScan, {
          scanId: args.scanId,
          storageId: args.storageId,
          userId: args.userId,
        });
      }

      await ctx.runMutation(internal.internalFunctions.markScanFailed, {
        scanId: args.scanId,
        reason: String(err),
        retryCount,
      });
    }
  },
});
