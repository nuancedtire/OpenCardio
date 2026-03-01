import { useState } from "react";
import { HelpCircle, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "../lib/utils";
import type { Diagnosis } from "../types";

interface Props {
  diagnosis: Diagnosis;
}

const SEVERITY_STYLES = {
  critical: "border-red-600 bg-red-950/50",
  warning: "border-amber-600 bg-amber-950/50",
  info: "border-slate-600 bg-slate-800/50",
};

const BADGE_STYLES = {
  critical: "bg-red-700 text-red-100",
  warning: "bg-amber-700 text-amber-100",
  info: "bg-slate-700 text-slate-300",
};

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const colour =
    confidence >= 0.8
      ? "text-green-400"
      : confidence >= 0.6
      ? "text-amber-400"
      : "text-slate-400";
  const label =
    confidence >= 0.8
      ? `${pct}%`
      : confidence >= 0.6
      ? `${pct}% (moderate)`
      : `${pct}% (low)`;

  return <span className={cn("text-xs font-mono", colour)}>{label}</span>;
}

export default function DiagnosisCard({ diagnosis }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={cn(
        "rounded-xl border p-3",
        SEVERITY_STYLES[diagnosis.severity]
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={cn(
                "px-2 py-0.5 rounded-md text-xs font-bold font-mono",
                BADGE_STYLES[diagnosis.severity]
              )}
            >
              {diagnosis.code}
            </span>
            <span className="text-sm font-medium text-white truncate">
              {diagnosis.label}
            </span>
          </div>

          <div className="mt-1.5 flex items-center gap-2 flex-wrap">
            <ConfidenceBadge confidence={diagnosis.confidence} />
            {diagnosis.leadsAffected && diagnosis.leadsAffected.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                {diagnosis.leadsAffected.map((lead) => (
                  <span
                    key={lead}
                    className="px-1.5 py-0.5 bg-slate-700 text-slate-300 text-xs rounded font-mono"
                  >
                    {lead}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Explanation toggle */}
        {diagnosis.explanation && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex-shrink-0 p-1 text-slate-400 hover:text-white transition-colors btn-touch"
            aria-label={expanded ? "Hide explanation" : "Show explanation"}
          >
            {expanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <HelpCircle className="w-4 h-4" />
            )}
          </button>
        )}
      </div>

      {/* Expanded explanation */}
      {expanded && diagnosis.explanation && (
        <div className="mt-2 pt-2 border-t border-white/10">
          <p className="text-sm text-slate-300 italic">{diagnosis.explanation}</p>
        </div>
      )}
    </div>
  );
}
