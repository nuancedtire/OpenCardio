import { useMemo, useRef, useState } from "react";
import { cn } from "../lib/utils";

const LEAD_ORDER = ["I", "II", "III", "aVR", "aVL", "aVF", "V1", "V2", "V3", "V4", "V5", "V6"];

// Grid layout: 3 columns × 4 rows (standard 3×4 ECG layout)
const LEAD_GRID: [string, string, string, string][] = [
  ["I", "aVR", "V1", "V4"],
  ["II", "aVL", "V2", "V5"],
  ["III", "aVF", "V3", "V6"],
];

// Downsample data to at most `maxPoints` points for SVG performance
function downsample(data: number[], maxPoints: number): number[] {
  if (data.length <= maxPoints) return data;
  const step = data.length / maxPoints;
  const result: number[] = [];
  for (let i = 0; i < maxPoints; i++) {
    result.push(data[Math.floor(i * step)]);
  }
  return result;
}

// Build SVG polyline points string from signal data
function buildPoints(
  data: number[],
  width: number,
  height: number,
  padding: number
): string {
  if (!data || data.length === 0) return "";

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 0.001;
  const innerH = height - 2 * padding;

  return data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = padding + (1 - (v - min) / range) * innerH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

// Heatmap gradient: map 0→blue, 1→red via green
function heatmapColour(weight: number): string {
  const r = Math.round(weight * 255);
  const b = Math.round((1 - weight) * 255);
  return `rgb(${r},0,${b})`;
}

interface LeadPanelProps {
  leadName: string;
  data: number[];
  heatmap?: number[];
  width?: number;
  height?: number;
}

function LeadPanel({ leadName, data, heatmap, width = 240, height = 80 }: LeadPanelProps) {
  const padding = 6;
  const ds = useMemo(() => downsample(data, 300), [data]);
  const points = useMemo(() => buildPoints(ds, width, height, padding), [ds, width, height]);

  return (
    <div className="relative border border-pink-200/30 rounded overflow-hidden ecg-grid">
      {/* Lead label */}
      <span className="absolute top-0.5 left-1 text-[10px] font-mono text-slate-600 z-10 select-none">
        {leadName}
      </span>

      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="block w-full h-full"
        style={{ aspectRatio: `${width}/${height}` }}
      >
        {/* Heatmap segments (Phase 2 feature — renders when data provided) */}
        {heatmap && heatmap.length > 0 &&
          downsample(heatmap, 60).map((w, i, arr) => {
            const segW = width / arr.length;
            return (
              <rect
                key={i}
                x={i * segW}
                y={0}
                width={segW + 1}
                height={height}
                fill={heatmapColour(w)}
                opacity={0.25}
              />
            );
          })}

        {/* Waveform */}
        {points && (
          <polyline
            points={points}
            fill="none"
            stroke="#1a1a2e"
            strokeWidth="1.5"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>
    </div>
  );
}

interface Props {
  signal: Record<string, number[]>;
  heatmapData?: Record<string, number[]>;
  sampleRateHz?: number;
}

export default function EcgWaveformViewer({ signal, heatmapData, sampleRateHz = 500 }: Props) {
  const [zoom, setZoom] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Check which leads have data
  const availableLeads = LEAD_ORDER.filter((l) => signal[l] && signal[l].length > 0);

  if (availableLeads.length === 0) {
    return (
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6 text-center text-slate-400 text-sm">
        No digitised signal data available
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
        <h3 className="text-sm font-semibold text-slate-200">ECG Waveform</h3>
        <div className="flex items-center gap-1 text-xs text-slate-400">
          <span>{sampleRateHz} Hz</span>
          <span>·</span>
          <span>{(availableLeads.length > 0 ? signal[availableLeads[0]].length / sampleRateHz : 0).toFixed(0)}s</span>
          {heatmapData && (
            <span className="ml-2 px-1.5 py-0.5 bg-slate-700 rounded text-slate-300">
              Heatmap
            </span>
          )}
        </div>
      </div>

      {/* 3-column × 4-row standard ECG grid layout */}
      <div
        ref={containerRef}
        className="p-3 overflow-x-auto"
        style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}
      >
        <div className="grid grid-cols-4 gap-1 min-w-[600px]">
          {LEAD_GRID.map((row, ri) =>
            row.map((leadName) => (
              <LeadPanel
                key={`${ri}-${leadName}`}
                leadName={leadName}
                data={signal[leadName] ?? []}
                heatmap={heatmapData?.[leadName]}
              />
            ))
          )}
        </div>

        {/* Rhythm strip — Lead II full width */}
        <div className="mt-1">
          <LeadPanel
            leadName="II (rhythm strip)"
            data={signal["II"] ?? []}
            heatmap={heatmapData?.["II"]}
            width={960}
            height={60}
          />
        </div>
      </div>

      {/* Zoom controls */}
      <div className="flex items-center gap-2 px-4 py-2 border-t border-slate-700">
        <span className="text-xs text-slate-500">Zoom</span>
        <input
          type="range"
          min={0.5}
          max={2}
          step={0.1}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="w-24 accent-red-500"
        />
        <span className="text-xs text-slate-400 font-mono">{zoom.toFixed(1)}×</span>
        <button
          onClick={() => setZoom(1)}
          className="ml-1 text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-700 transition-colors"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
