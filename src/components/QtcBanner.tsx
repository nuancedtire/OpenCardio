import { AlertTriangle, AlertOctagon } from "lucide-react";
import type { QtcAlertLevel } from "../types";

interface Props {
  qtcMs: number;
  alertLevel: QtcAlertLevel;
  sex?: "male" | "female" | "unspecified";
}

export default function QtcBanner({ qtcMs, alertLevel, sex }: Props) {
  if (alertLevel === "normal") return null;

  const sexLabel = sex === "male" ? " (male threshold)" : sex === "female" ? " (female threshold)" : "";

  if (alertLevel === "prolonged") {
    return (
      <div
        role="alert"
        aria-live="assertive"
        className="rounded-xl border-2 border-red-600 bg-red-950 p-4 pulse-critical"
      >
        <div className="flex items-start gap-3">
          <AlertOctagon className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5 animate-pulse" />
          <div>
            <p className="font-bold text-red-300 text-base">
              ⚠ PROLONGED QTc: {qtcMs} ms{sexLabel}
            </p>
            <p className="text-sm text-red-400 mt-0.5">
              Seek senior review NOW. Review all QT-prolonging medications. Consider electrolytes.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Borderline
  return (
    <div
      role="alert"
      aria-live="polite"
      className="rounded-xl border border-amber-600 bg-amber-950/60 p-4"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-amber-300">
            Borderline QTc: {qtcMs} ms{sexLabel}
          </p>
          <p className="text-sm text-amber-400 mt-0.5">
            Monitor. Review QT-prolonging medications. Recheck after electrolyte correction.
          </p>
        </div>
      </div>
    </div>
  );
}
