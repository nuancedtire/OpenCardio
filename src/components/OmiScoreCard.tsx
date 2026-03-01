import { AlertTriangle, CheckCircle, Activity, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { cn } from "../lib/utils";
import type { OmiTier, SgarbossaResult } from "../types";

interface Props {
  omiTier: OmiTier;
  probability: number;
  stemiCriteriaMet: boolean;
  stemiCriteriaLeads?: string[];
  sgarbossaActivated?: boolean;
  sgarbossaOriginalScore?: number;
  sgarbossaSmithModified?: SgarbossaResult;
}

const TIER_STYLES = {
  high: {
    card: "bg-red-950 border-red-600 pulse-critical",
    badge: "bg-red-600 text-white",
    icon: "text-red-400",
    label: "HIGH OMI PROBABILITY",
    message: "Consider urgent catheter lab activation",
    textColour: "text-red-300",
  },
  intermediate: {
    card: "bg-amber-950 border-amber-600",
    badge: "bg-amber-600 text-white",
    icon: "text-amber-400",
    label: "INTERMEDIATE OMI RISK",
    message: "Clinical correlation required",
    textColour: "text-amber-300",
  },
  low: {
    card: "bg-green-950 border-green-700",
    badge: "bg-green-700 text-white",
    icon: "text-green-400",
    label: "LOW OMI PROBABILITY",
    message: "No high-risk OMI features detected",
    textColour: "text-green-300",
  },
};

export default function OmiScoreCard({
  omiTier,
  probability,
  stemiCriteriaMet,
  stemiCriteriaLeads = [],
  sgarbossaActivated,
  sgarbossaOriginalScore,
  sgarbossaSmithModified,
}: Props) {
  const [sgarbossaExpanded, setSgarbossaExpanded] = useState(false);
  const style = TIER_STYLES[omiTier];

  return (
    <article
      className={cn("rounded-2xl border-2 p-4 md:p-5", style.card)}
      aria-live={omiTier === "high" ? "assertive" : "polite"}
      aria-label={`OMI risk: ${style.label}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          {omiTier === "high" ? (
            <AlertTriangle className={cn("w-6 h-6 flex-shrink-0 animate-pulse", style.icon)} />
          ) : omiTier === "intermediate" ? (
            <AlertTriangle className={cn("w-6 h-6 flex-shrink-0", style.icon)} />
          ) : (
            <CheckCircle className={cn("w-6 h-6 flex-shrink-0", style.icon)} />
          )}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              OMI Risk Assessment
            </p>
            <h2 className={cn("text-xl font-bold", style.textColour)}>
              {omiTier === "high" && "⚠ "}
              {style.label}
            </h2>
          </div>
        </div>
        <span className={cn("px-3 py-1 rounded-full text-sm font-bold flex-shrink-0", style.badge)}>
          {Math.round(probability * 100)}%
        </span>
      </div>

      {/* Message */}
      <p className={cn("text-sm mb-4", style.textColour)}>{style.message}</p>

      {/* Sub-rows */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {/* Standard STEMI criteria */}
        <div className="bg-black/20 rounded-xl p-3">
          <p className="text-xs text-slate-400 mb-1">Standard STEMI Criteria</p>
          <div className="flex items-center gap-1.5">
            {stemiCriteriaMet ? (
              <>
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span className="text-sm font-semibold text-red-300">MET</span>
                {stemiCriteriaLeads.length > 0 && (
                  <span className="text-xs text-slate-400">
                    ({stemiCriteriaLeads.join(", ")})
                  </span>
                )}
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span className="text-sm font-semibold text-green-300">NOT MET</span>
              </>
            )}
          </div>
        </div>

        {/* AI OMI probability */}
        <div className="bg-black/20 rounded-xl p-3">
          <p className="text-xs text-slate-400 mb-1">AI OMI Probability</p>
          <div className="flex items-center gap-1.5">
            <Activity className={cn("w-4 h-4", style.icon)} />
            <span className={cn("text-sm font-semibold", style.textColour)}>
              {style.label}
            </span>
          </div>
        </div>
      </div>

      {/* Sgarbossa section (Phase 1: activated when LBBB detected) */}
      {sgarbossaActivated && (
        <div className="mt-3">
          <button
            onClick={() => setSgarbossaExpanded((v) => !v)}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors btn-touch"
          >
            {sgarbossaExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            Sgarbossa Criteria
          </button>
          {sgarbossaExpanded && (
            <div className="mt-2 bg-black/20 rounded-xl p-3 text-sm">
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Original Score</span>
                <span className="font-mono">{sgarbossaOriginalScore ?? "—"} / 5</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Smith-Modified</span>
                <span
                  className={cn(
                    "font-semibold",
                    sgarbossaSmithModified === "positive" && "text-red-400",
                    sgarbossaSmithModified === "negative" && "text-green-400",
                    sgarbossaSmithModified === "indeterminate" && "text-amber-400"
                  )}
                >
                  {sgarbossaSmithModified?.toUpperCase() ?? "—"}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </article>
  );
}
