function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-700 rounded-xl ${className ?? ""}`} />;
}

export default function ResultsSkeleton() {
  return (
    <div className="space-y-4 p-4 max-w-4xl mx-auto">
      {/* OMI card skeleton */}
      <SkeletonBlock className="h-36" />

      {/* QTc banner skeleton */}
      <SkeletonBlock className="h-16" />

      {/* Measurements table */}
      <SkeletonBlock className="h-56" />

      {/* Rhythm card */}
      <SkeletonBlock className="h-20" />

      {/* Diagnoses */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <SkeletonBlock className="h-20" />
        <SkeletonBlock className="h-20" />
        <SkeletonBlock className="h-20" />
      </div>

      {/* LVEF card */}
      <SkeletonBlock className="h-20" />

      {/* Waveform viewer */}
      <SkeletonBlock className="h-64" />
    </div>
  );
}
