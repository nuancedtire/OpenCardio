import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { ArrowLeft, Download, Trash2, Edit3, Check, X } from "lucide-react";
import { cn, formatTimestamp } from "../lib/utils";
import type { Id } from "../../convex/_generated/dataModel";

import OmiScoreCard from "../components/OmiScoreCard";
import QtcBanner from "../components/QtcBanner";
import MeasurementsTable from "../components/MeasurementsTable";
import DiagnosisCard from "../components/DiagnosisCard";
import LvefCard from "../components/LvefCard";
import PatternFlagsCard from "../components/PatternFlagsCard";
import EcgWaveformViewer from "../components/EcgWaveformViewer";
import ProcessingSteps from "../components/ProcessingSteps";
import ResultsSkeleton from "../components/ResultsSkeleton";
import type { AiResult, Diagnosis } from "../types";

// Group diagnoses by category
function groupDiagnoses(diagnoses: Diagnosis[]) {
  const groups: Record<string, Diagnosis[]> = {
    rhythm: [],
    conduction: [],
    ischaemia: [],
    structural: [],
    other: [],
  };
  for (const d of diagnoses) {
    groups[d.category].push(d);
  }
  return groups;
}

const CATEGORY_LABELS: Record<string, string> = {
  rhythm: "Rhythm",
  conduction: "Conduction",
  ischaemia: "Ischaemia",
  structural: "Structural",
  other: "Other",
};

export default function Results() {
  const { scanId } = useParams<{ scanId: string }>();
  const navigate = useNavigate();

  const scan = useQuery(api.scans.getScanById, {
    scanId: scanId as Id<"ecg_scans">,
  });
  const aiResult = useQuery(api.scans.getAiResult, {
    scanId: scanId as Id<"ecg_scans">,
  }) as AiResult | null | undefined;
  const imageUrl = useQuery(
    api.scans.getEcgImageUrl,
    scan?.storageId ? { storageId: scan.storageId as Id<"_storage"> } : "skip"
  );
  const currentUser = useQuery(api.users.getCurrentUser);

  const deleteScan = useMutation(api.scans.deleteScan);
  const updateLabel = useMutation(api.scans.updateScanLabel);

  const [editingLabel, setEditingLabel] = useState(false);
  const [labelDraft, setLabelDraft] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (scan === undefined) return <ResultsSkeleton />;

  if (scan === null) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center">
        <p className="text-slate-400">Scan not found or access denied.</p>
        <button onClick={() => navigate("/history")} className="mt-4 text-sm text-red-400 hover:underline">
          Back to history
        </button>
      </div>
    );
  }

  // ── Processing state ─────────────────────────────────────────────────────
  if (scan.status === "processing" || scan.status === "uploading") {
    return (
      <div className="max-w-sm mx-auto px-4 py-8">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-slate-400 hover:text-white mb-6 btn-touch">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <ProcessingSteps currentStep={scan.status === "uploading" ? "uploading" : "analysing"} />
        <p className="text-xs text-slate-500 text-center mt-2">
          This page will update automatically when analysis is complete.
        </p>
      </div>
    );
  }

  // ── Failed state ─────────────────────────────────────────────────────────
  if (scan.status === "failed") {
    return (
      <div className="max-w-lg mx-auto px-4 py-8">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-slate-400 hover:text-white mb-6 btn-touch">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="rounded-xl border border-red-700 bg-red-950 p-5">
          <p className="font-semibold text-red-300 mb-1">Analysis failed</p>
          <p className="text-sm text-red-400">{scan.failureReason ?? "Unknown error"}</p>
          <p className="text-xs text-slate-400 mt-3">
            Tips: Ensure good lighting, straight orientation, and avoid shadows or glare.
          </p>
        </div>
        <button onClick={() => navigate("/scan")} className="mt-4 w-full py-3 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl transition-colors text-sm">
          Try again
        </button>
      </div>
    );
  }

  // ── Awaiting AI result ────────────────────────────────────────────────────
  if (!aiResult) return <ResultsSkeleton />;

  const qtcSex = currentUser?.profile?.qtcSex ?? "unspecified";
  const diagnoses = aiResult.diagnoses ?? [];
  const diagnosisGroups = groupDiagnoses(diagnoses);

  // Label editing helpers
  function startEditLabel() {
    setLabelDraft(scan?.label ?? "");
    setEditingLabel(true);
  }
  async function saveLabel() {
    if (!scan) return;
    await updateLabel({ scanId: scan._id as Id<"ecg_scans">, label: labelDraft });
    setEditingLabel(false);
  }

  async function handleDelete() {
    await deleteScan({ scanId: scan!._id as Id<"ecg_scans"> });
    navigate("/history");
  }

  // ── PDF export ───────────────────────────────────────────────────────────
  async function handleExportPdf() {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    const margin = 15;
    let y = margin;

    // Title
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("OpenCardio ECG Analysis Report", margin, y);
    y += 8;

    // Metadata
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated: ${formatTimestamp(Date.now())}`, margin, y);
    y += 4;
    if (scan.label) doc.text(`Label: ${scan.label}`, margin, y);
    y += 4;
    doc.text(`Scan ID: ${scan._id}`, margin, y);
    y += 10;

    // OMI
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("OMI Risk Assessment", margin, y);
    y += 6;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Tier: ${(aiResult.omiTier ?? "—").toUpperCase()}  |  Probability: ${Math.round((aiResult.omiProbability ?? 0) * 100)}%`, margin, y);
    y += 4;
    doc.text(`Standard STEMI Criteria: ${aiResult.stemiCriteriaMet ? "MET" : "NOT MET"}`, margin, y);
    y += 10;

    // Measurements
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Measurements", margin, y);
    y += 6;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");

    const measRows = [
      ["Heart Rate", `${aiResult.heartRateBpm ?? "—"} bpm`],
      ["PR Interval", `${aiResult.prIntervalMs ?? "—"} ms`],
      ["QRS Duration", `${aiResult.qrsWidthMs ?? "—"} ms`],
      ["QTc (Fridericia)", `${aiResult.qtcFridericia ?? "—"} ms`],
      ["QTc (Bazett)", `${aiResult.qtcBazett ?? "—"} ms`],
      ["Cardiac Axis", `${aiResult.cardiacAxisDegrees ?? "—"}°`],
    ];

    for (const [label, value] of measRows) {
      doc.text(`${label}: ${value}`, margin, y);
      y += 5;
    }
    y += 5;

    // Rhythm
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Primary Rhythm", margin, y);
    y += 6;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(
      `${aiResult.primaryRhythm ?? "—"}  (confidence: ${Math.round((aiResult.primaryRhythmConfidence ?? 0) * 100)}%)`,
      margin, y
    );
    y += 10;

    // Diagnoses
    if (diagnoses.length > 0) {
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Diagnoses", margin, y);
      y += 6;
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      for (const d of diagnoses) {
        doc.text(`• [${d.code}] ${d.label}  (${Math.round(d.confidence * 100)}% confidence, ${d.severity})`, margin, y);
        y += 4;
      }
      y += 6;
    }

    // LVEF
    if (aiResult.lvefVerdict) {
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("LVEF Screening", margin, y);
      y += 6;
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`Verdict: ${aiResult.lvefVerdict}  |  P(LVEF<40%): ${aiResult.lvefProbabilityReduced?.toFixed(2) ?? "—"}`, margin, y);
      y += 10;
    }

    // Model versions
    doc.setFontSize(8);
    doc.setTextColor(130, 130, 130);
    doc.text([
      `Digitiser: ${aiResult.modelVersionDigitiser ?? "—"}`,
      `Core Dx: ${aiResult.modelVersionCoreDx ?? "—"}`,
      `OMI: ${aiResult.modelVersionOmi ?? "—"}`,
      `Inference: ${aiResult.inferenceTimestampMs ? formatTimestamp(aiResult.inferenceTimestampMs) : "—"}`,
    ].join("  |  "), margin, 270);

    // Disclaimer
    doc.setFontSize(7.5);
    doc.setTextColor(100, 100, 100);
    const disclaimer =
      "This report was generated by OpenCardio AI decision support tool (non-regulated research use). " +
      "Clinical decisions remain the responsibility of the treating clinician.";
    doc.text(doc.splitTextToSize(disclaimer, 180), margin, 278);

    doc.save(`opencardio-ecg-${scan._id.slice(-8)}.pdf`);
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Breadcrumb / back */}
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <button
          onClick={() => navigate("/history")}
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white btn-touch"
        >
          <ArrowLeft className="w-4 h-4" />
          History
        </button>

        {/* Label display / edit */}
        <div className="flex items-center gap-2 flex-1 min-w-0 justify-center md:justify-start">
          {editingLabel ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={labelDraft}
                onChange={(e) => setLabelDraft(e.target.value)}
                maxLength={120}
                className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-red-500 w-64"
                autoFocus
              />
              <button onClick={saveLabel} className="p-1.5 text-green-400 hover:text-green-300 btn-touch">
                <Check className="w-4 h-4" />
              </button>
              <button onClick={() => setEditingLabel(false)} className="p-1.5 text-slate-400 hover:text-white btn-touch">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <p className="text-sm text-slate-300 truncate">
                {scan.label ?? <span className="text-slate-600 italic">No label</span>}
              </p>
              <button onClick={startEditLabel} className="p-1.5 text-slate-500 hover:text-white btn-touch">
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportPdf}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-xl transition-colors btn-touch"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export PDF</span>
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-950/40 rounded-xl transition-colors btn-touch"
            aria-label="Delete scan"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Results layout: desktop 3-col, mobile stacked */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr_auto] gap-6">
        {/* LEFT: ECG waveform viewer */}
        <div className="lg:col-span-1 order-3 lg:order-1">
          {aiResult.signalData ? (
            <EcgWaveformViewer
              signal={aiResult.signalData as Record<string, number[]>}
              heatmapData={aiResult.omiHeatmapData as Record<string, number[]> | undefined}
              sampleRateHz={500}
            />
          ) : imageUrl ? (
            <div className="rounded-xl border border-slate-700 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-700">
                <h3 className="text-sm font-semibold text-slate-200">ECG Image</h3>
              </div>
              <img src={imageUrl} alt="ECG scan" className="w-full object-contain bg-black" />
            </div>
          ) : null}
        </div>

        {/* MIDDLE: Results panels */}
        <div className="space-y-4 order-1 lg:order-2">
          {/* 1. OMI card — MOST PROMINENT, always first */}
          {aiResult.omiTier && (
            <OmiScoreCard
              omiTier={aiResult.omiTier}
              probability={aiResult.omiProbability ?? 0}
              stemiCriteriaMet={aiResult.stemiCriteriaMet ?? false}
              stemiCriteriaLeads={aiResult.stemiCriteriaLeads}
              sgarbossaActivated={aiResult.sgarbossaActivated}
              sgarbossaOriginalScore={aiResult.sgarbossaOriginalScore}
              sgarbossaSmithModified={aiResult.sgarbossaSmithModified}
            />
          )}

          {/* 2. QTc alert banner */}
          {aiResult.qtcAlertLevel && aiResult.qtcAlertLevel !== "normal" && aiResult.qtcFridericia && (
            <QtcBanner
              qtcMs={aiResult.qtcFridericia}
              alertLevel={aiResult.qtcAlertLevel}
              sex={qtcSex as "male" | "female" | "unspecified"}
            />
          )}

          {/* 3. Measurements table */}
          <MeasurementsTable
            measurements={{
              heartRateBpm: aiResult.heartRateBpm,
              rrIntervalMs: aiResult.rrIntervalMs,
              prIntervalMs: aiResult.prIntervalMs,
              qrsWidthMs: aiResult.qrsWidthMs,
              qtIntervalMs: aiResult.qtIntervalMs,
              qtcFridericia: aiResult.qtcFridericia,
              qtcBazett: aiResult.qtcBazett,
              cardiacAxisDegrees: aiResult.cardiacAxisDegrees,
              pWaveDurationMs: aiResult.pWaveDurationMs,
            }}
            qtcAlertLevel={aiResult.qtcAlertLevel}
            qtcSex={qtcSex as "male" | "female" | "unspecified"}
          />

          {/* 4. Primary rhythm */}
          {aiResult.primaryRhythm && (
            <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-1 font-semibold">
                Primary Rhythm
              </p>
              <div className="flex items-center justify-between">
                <p className="text-white font-semibold">{aiResult.primaryRhythm}</p>
                {aiResult.primaryRhythmConfidence !== undefined && (
                  <span
                    className={cn(
                      "px-2 py-1 rounded-lg text-xs font-mono",
                      aiResult.primaryRhythmConfidence >= 0.8
                        ? "bg-green-900 text-green-300"
                        : aiResult.primaryRhythmConfidence >= 0.6
                        ? "bg-amber-900 text-amber-300"
                        : "bg-slate-700 text-slate-400"
                    )}
                  >
                    {Math.round(aiResult.primaryRhythmConfidence * 100)}%
                  </span>
                )}
              </div>
              {aiResult.primaryRhythmCode && (
                <p className="text-xs font-mono text-slate-500 mt-1">{aiResult.primaryRhythmCode}</p>
              )}
            </div>
          )}

          {/* 5. Diagnoses grid (grouped by category) */}
          {diagnoses.length > 0 && (
            <div className="space-y-3">
              {Object.entries(diagnosisGroups).map(([category, items]) => {
                if (items.length === 0) return null;
                return (
                  <div key={category}>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      {CATEGORY_LABELS[category]}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {items.map((d) => (
                        <DiagnosisCard key={d.code} diagnosis={d} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 6. LVEF card */}
          {aiResult.lvefVerdict && aiResult.lvefProbabilityReduced !== undefined && (
            <LvefCard
              verdict={aiResult.lvefVerdict}
              probability={aiResult.lvefProbabilityReduced}
            />
          )}

          {/* 7. Pattern flags */}
          {aiResult.patternFlags && aiResult.patternFlags.length > 0 && (
            <PatternFlagsCard flags={aiResult.patternFlags} />
          )}

          {/* Provenance / model info */}
          {aiResult.inferenceTimestampMs && (
            <div className="text-xs text-slate-600 border-t border-slate-800 pt-3 space-y-0.5">
              <p>Analysed: {formatTimestamp(aiResult.inferenceTimestampMs)}</p>
              {aiResult.inferenceLatencyMs && (
                <p>Latency: {(aiResult.inferenceLatencyMs / 1000).toFixed(1)}s</p>
              )}
              <p>Model: {aiResult.modelVersionCoreDx ?? "—"}</p>
            </div>
          )}
        </div>

        {/* RIGHT: side actions (desktop only) */}
        <div className="hidden lg:flex flex-col gap-2 order-2 lg:order-3 w-36">
          <button
            onClick={handleExportPdf}
            className="flex flex-col items-center gap-1.5 p-3 bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium rounded-xl transition-colors"
          >
            <Download className="w-5 h-5 text-slate-300" />
            Export PDF
          </button>
          <button
            onClick={startEditLabel}
            className="flex flex-col items-center gap-1.5 p-3 bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium rounded-xl transition-colors"
          >
            <Edit3 className="w-5 h-5 text-slate-300" />
            Edit Label
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex flex-col items-center gap-1.5 p-3 bg-slate-800 hover:bg-red-950 text-red-400 text-xs font-medium rounded-xl transition-colors"
          >
            <Trash2 className="w-5 h-5" />
            Delete
          </button>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 max-w-sm w-full">
            <h3 className="font-semibold text-white mb-2">Delete this scan?</h3>
            <p className="text-sm text-slate-400 mb-5">
              This will permanently delete the ECG image and all analysis results. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
