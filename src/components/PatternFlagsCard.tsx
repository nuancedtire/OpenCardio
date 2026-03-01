import { Flag, AlertTriangle } from "lucide-react";
import { cn } from "../lib/utils";
import type { PatternFlag } from "../types";

interface Props {
  flags: PatternFlag[];
}

export default function PatternFlagsCard({ flags }: Props) {
  if (!flags || flags.length === 0) return null;

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/50 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-700">
        <Flag className="w-4 h-4 text-slate-400" />
        <h3 className="text-sm font-semibold text-slate-200">Pattern Flags</h3>
      </div>
      <div className="divide-y divide-slate-700/50">
        {flags.map((flag, i) => (
          <div key={i} className="px-4 py-3">
            <div className="flex items-start gap-2">
              <AlertTriangle
                className={cn(
                  "w-4 h-4 mt-0.5 flex-shrink-0",
                  flag.severity === "critical" ? "text-red-400" : "text-amber-400"
                )}
              />
              <div>
                <p className="text-sm font-semibold text-white">{flag.pattern}</p>
                <div className="flex gap-1 mt-1 flex-wrap">
                  {flag.leads.map((lead) => (
                    <span
                      key={lead}
                      className="px-1.5 py-0.5 bg-slate-700 text-slate-300 text-xs rounded font-mono"
                    >
                      {lead}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-slate-400 mt-1">{flag.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
