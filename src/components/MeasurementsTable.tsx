import { cn } from "../lib/utils";

interface Props {
  measurements: {
    heartRateBpm?: number;
    rrIntervalMs?: number;
    prIntervalMs?: number;
    qrsWidthMs?: number;
    qtIntervalMs?: number;
    qtcFridericia?: number;
    qtcBazett?: number;
    cardiacAxisDegrees?: number;
    pWaveDurationMs?: number;
  };
  qtcAlertLevel?: "normal" | "borderline" | "prolonged";
  qtcSex?: "male" | "female" | "unspecified";
}

type StatusDot = "normal" | "warning" | "critical" | "unknown";

interface MeasRow {
  label: string;
  value?: number;
  unit: string;
  normalRange: string;
  status: StatusDot;
  highlight?: boolean;
}

function dot(status: StatusDot) {
  return (
    <span
      className={cn(
        "inline-block w-2.5 h-2.5 rounded-full",
        status === "normal" && "bg-green-500",
        status === "warning" && "bg-amber-500",
        status === "critical" && "bg-red-500",
        status === "unknown" && "bg-slate-600"
      )}
      aria-label={status}
    />
  );
}

function fmt(v?: number, unit = ""): string {
  if (v === undefined || v === null) return "—";
  return `${Math.round(v)} ${unit}`.trim();
}

export default function MeasurementsTable({ measurements, qtcAlertLevel, qtcSex }: Props) {
  const {
    heartRateBpm,
    rrIntervalMs,
    prIntervalMs,
    qrsWidthMs,
    qtIntervalMs,
    qtcFridericia,
    qtcBazett,
    cardiacAxisDegrees,
    pWaveDurationMs,
  } = measurements;

  // QTc thresholds depend on sex
  const qtcUpperNormal = qtcSex === "female" ? 460 : 450;

  function qtcStatus(val?: number): StatusDot {
    if (val === undefined) return "unknown";
    if (val > 500) return "critical";
    if (val > qtcUpperNormal) return "warning";
    return "normal";
  }

  const rows: MeasRow[] = [
    {
      label: "Heart Rate",
      value: heartRateBpm,
      unit: "bpm",
      normalRange: "60–100 bpm",
      status: heartRateBpm === undefined ? "unknown" : heartRateBpm < 60 || heartRateBpm > 100 ? "warning" : "normal",
    },
    {
      label: "RR Interval",
      value: rrIntervalMs,
      unit: "ms",
      normalRange: "600–1000 ms",
      status: rrIntervalMs === undefined ? "unknown" : "normal",
    },
    {
      label: "PR Interval",
      value: prIntervalMs,
      unit: "ms",
      normalRange: "120–200 ms",
      status: prIntervalMs === undefined ? "unknown" : prIntervalMs < 120 || prIntervalMs > 200 ? "warning" : "normal",
    },
    {
      label: "QRS Duration",
      value: qrsWidthMs,
      unit: "ms",
      normalRange: "< 120 ms",
      status: qrsWidthMs === undefined ? "unknown" : qrsWidthMs >= 120 ? "warning" : "normal",
    },
    {
      label: "QT Interval",
      value: qtIntervalMs,
      unit: "ms",
      normalRange: "350–440 ms",
      status: "unknown",
    },
    {
      label: "QTc (Fridericia)",
      value: qtcFridericia,
      unit: "ms",
      normalRange: `< ${qtcUpperNormal} ms`,
      status: qtcStatus(qtcFridericia),
      highlight: qtcAlertLevel !== "normal" && qtcAlertLevel !== undefined,
    },
    {
      label: "QTc (Bazett)",
      value: qtcBazett,
      unit: "ms",
      normalRange: `< ${qtcUpperNormal} ms`,
      status: qtcStatus(qtcBazett),
    },
    {
      label: "Cardiac Axis",
      value: cardiacAxisDegrees,
      unit: "°",
      normalRange: "−30° to +90°",
      status:
        cardiacAxisDegrees === undefined
          ? "unknown"
          : cardiacAxisDegrees < -30 || cardiacAxisDegrees > 90
          ? "warning"
          : "normal",
    },
    {
      label: "P-wave Duration",
      value: pWaveDurationMs,
      unit: "ms",
      normalRange: "< 120 ms",
      status: pWaveDurationMs === undefined ? "unknown" : pWaveDurationMs >= 120 ? "warning" : "normal",
    },
  ];

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/50 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-700">
        <h3 className="text-sm font-semibold text-slate-200">ECG Measurements</h3>
      </div>
      <div className="divide-y divide-slate-700/50">
        {rows.map((row) => (
          <div
            key={row.label}
            className={cn(
              "grid grid-cols-[1fr_auto_auto_auto] gap-x-4 px-4 py-2.5 items-center text-sm",
              row.highlight && "bg-amber-950/40"
            )}
          >
            <span className="text-slate-300 font-medium">{row.label}</span>
            <span className="font-mono text-white text-right">
              {fmt(row.value, row.unit)}
            </span>
            <span className="text-slate-500 text-xs text-right hidden sm:block">
              {row.normalRange}
            </span>
            <span className="flex justify-end">{dot(row.status)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
