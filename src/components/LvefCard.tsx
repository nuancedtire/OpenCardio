import { useState } from "react";
import { Heart, Info, X } from "lucide-react";
import { cn } from "../lib/utils";
import type { LvefVerdict } from "../types";

interface Props {
  verdict: LvefVerdict;
  probability: number;
}

const VERDICT_STYLES = {
  likely_reduced: {
    card: "border-red-600 bg-red-950/50",
    icon: "text-red-400",
    text: "text-red-300",
    label: "LIKELY REDUCED LV FUNCTION",
    message: "Consider urgent echocardiogram",
  },
  borderline: {
    card: "border-amber-600 bg-amber-950/50",
    icon: "text-amber-400",
    text: "text-amber-300",
    label: "BORDERLINE LV FUNCTION",
    message: "Echo recommended for further assessment",
  },
  likely_normal: {
    card: "border-green-700 bg-green-950/50",
    icon: "text-green-400",
    text: "text-green-300",
    label: "NO ECG EVIDENCE OF REDUCED LVEF",
    message: "Low AI probability of LVEF < 40%",
  },
};

export default function LvefCard({ verdict, probability }: Props) {
  const [auroc, setAuroc] = useState(false);
  const style = VERDICT_STYLES[verdict];

  return (
    <div className={cn("rounded-xl border p-4", style.card)}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <Heart className={cn("w-5 h-5 mt-0.5 flex-shrink-0", style.icon)} />
          <div>
            <p className="text-xs text-slate-400 mb-0.5 font-semibold uppercase tracking-wider">
              LVEF Screening
            </p>
            <p className={cn("text-sm font-bold", style.text)}>{style.label}</p>
            <p className="text-xs text-slate-400 mt-0.5">{style.message}</p>
            <p className="text-xs font-mono text-slate-400 mt-1">
              P(LVEF&lt;40%) = {probability.toFixed(2)}
            </p>
          </div>
        </div>

        <button
          onClick={() => setAuroc(true)}
          className="flex-shrink-0 p-1 text-slate-500 hover:text-white transition-colors btn-touch"
          aria-label="Model accuracy info"
        >
          <Info className="w-4 h-4" />
        </button>
      </div>

      {/* AUROC modal */}
      {auroc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 max-w-sm w-full shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-white text-sm">LVEF Model Accuracy</h3>
              <button onClick={() => setAuroc(false)} className="btn-touch text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-slate-300">
              The ECG-based LVEF screening model has an <strong className="text-white">AUROC
              of 0.929</strong> in validation studies for detecting LVEF &lt; 40%.
            </p>
            <p className="text-sm text-slate-400 mt-2">
              This is a screening tool only. It is <strong className="text-amber-300">not a
              substitute for echocardiography</strong>. A normal result does not exclude
              reduced LV function.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
