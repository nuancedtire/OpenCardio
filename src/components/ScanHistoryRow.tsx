import { useNavigate } from "react-router-dom";
import { Trash2, Loader2, CheckCircle, XCircle, Clock } from "lucide-react";
import { cn, formatRelativeTime, formatTimestamp } from "../lib/utils";
import type { EcgScan, OmiTier, ScanStatus } from "../types";

interface Props {
  scan: EcgScan & {
    omiTier?: OmiTier;
    primaryRhythm?: string;
    qtcFridericia?: number;
  };
  onDelete: (scanId: string) => void;
}

function OmiDot({ tier }: { tier?: OmiTier }) {
  if (!tier) return <span className="w-2.5 h-2.5 rounded-full bg-slate-600 flex-shrink-0" />;
  return (
    <span
      className={cn(
        "w-2.5 h-2.5 rounded-full flex-shrink-0",
        tier === "high" && "bg-red-500",
        tier === "intermediate" && "bg-amber-500",
        tier === "low" && "bg-green-500"
      )}
      aria-label={`OMI risk: ${tier}`}
    />
  );
}

function StatusPill({ status }: { status: ScanStatus }) {
  const configs = {
    uploading: { icon: Loader2, label: "Uploading", class: "text-slate-400 bg-slate-700" },
    processing: { icon: Loader2, label: "Processing", class: "text-blue-400 bg-blue-950" },
    complete: { icon: CheckCircle, label: "Complete", class: "text-green-400 bg-green-950" },
    failed: { icon: XCircle, label: "Failed", class: "text-red-400 bg-red-950" },
  };
  const cfg = configs[status];
  const Icon = cfg.icon;

  return (
    <span
      className={cn(
        "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0",
        cfg.class
      )}
    >
      <Icon className={cn("w-3 h-3", status === "processing" || status === "uploading" ? "animate-spin" : "")} />
      {cfg.label}
    </span>
  );
}

export default function ScanHistoryRow({ scan, onDelete }: Props) {
  const navigate = useNavigate();

  return (
    <div
      className="group flex items-center gap-3 px-4 py-3 border-b border-slate-700/50 hover:bg-slate-800/50 transition-colors cursor-pointer"
      onClick={() => navigate(`/scan/${scan._id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && navigate(`/scan/${scan._id}`)}
      aria-label={`ECG scan: ${scan.label ?? "Unlabelled"}`}
    >
      {/* OMI indicator dot */}
      <OmiDot tier={scan.omiTier} />

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-sm font-medium text-white truncate">
            {scan.label ?? <span className="text-slate-500 italic">Unlabelled scan</span>}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-500 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span title={formatTimestamp(scan._creationTime)}>
              {formatRelativeTime(scan._creationTime)}
            </span>
          </span>
          {scan.primaryRhythm && (
            <span className="text-xs text-slate-400">{scan.primaryRhythm}</span>
          )}
          {scan.qtcFridericia && (
            <span className="text-xs font-mono text-slate-400">
              QTc {Math.round(scan.qtcFridericia)} ms
            </span>
          )}
        </div>
      </div>

      {/* Status + delete */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <StatusPill status={scan.status} />
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(scan._id);
          }}
          className={cn(
            "p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-950/40 transition-colors btn-touch",
            "opacity-0 group-hover:opacity-100 focus:opacity-100"
          )}
          aria-label="Delete scan"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
