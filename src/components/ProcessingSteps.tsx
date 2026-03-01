import { Check, Loader2, Upload, Cpu, Brain, CheckCircle2 } from "lucide-react";
import { cn } from "../lib/utils";

type Step = "uploading" | "digitising" | "analysing" | "done";

const STEPS: { id: Step; label: string; icon: typeof Upload }[] = [
  { id: "uploading", label: "Uploading image", icon: Upload },
  { id: "digitising", label: "Digitising ECG", icon: Cpu },
  { id: "analysing", label: "Analysing rhythms", icon: Brain },
  { id: "done", label: "Complete", icon: CheckCircle2 },
];

const STEP_ORDER: Step[] = ["uploading", "digitising", "analysing", "done"];

interface Props {
  currentStep: Step;
}

export default function ProcessingSteps({ currentStep }: Props) {
  const currentIdx = STEP_ORDER.indexOf(currentStep);

  return (
    <div
      className="flex flex-col items-center gap-6 py-8"
      aria-live="polite"
      aria-label={`Processing: ${currentStep}`}
    >
      {/* Animated ECG heartbeat indicator */}
      <div className="text-red-500">
        <svg viewBox="0 0 80 30" className="w-20 h-8" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="0,15 10,15 14,5 18,25 22,10 26,18 30,3 36,27 40,15 80,15"
            className="animate-pulse" />
        </svg>
      </div>

      {/* Step indicators */}
      <div className="flex flex-col gap-3 w-full max-w-xs">
        {STEPS.map((step, idx) => {
          const done = idx < currentIdx;
          const active = idx === currentIdx;
          const Icon = step.icon;

          return (
            <div
              key={step.id}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
                done && "bg-green-900/30 border border-green-700/40",
                active && "bg-slate-700/60 border border-slate-600",
                !done && !active && "opacity-40"
              )}
            >
              <div
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0",
                  done && "bg-green-600",
                  active && "bg-slate-600",
                  !done && !active && "bg-slate-700"
                )}
              >
                {done ? (
                  <Check className="w-4 h-4 text-white" />
                ) : active ? (
                  <Loader2 className="w-4 h-4 text-white animate-spin" />
                ) : (
                  <Icon className="w-4 h-4 text-slate-400" />
                )}
              </div>
              <span
                className={cn(
                  "text-sm font-medium",
                  done && "text-green-400",
                  active && "text-white",
                  !done && !active && "text-slate-500"
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-slate-500">Usually 6–10 seconds</p>
    </div>
  );
}
