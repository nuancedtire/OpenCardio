import { usePaginatedQuery, useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Plus, ChevronDown, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ScanHistoryRow from "../components/ScanHistoryRow";
import type { Id } from "../../convex/_generated/dataModel";
import type { OmiTier } from "../types";

export default function History() {
  const navigate = useNavigate();

  const { results, status, loadMore } = usePaginatedQuery(
    api.scans.getMyScans,
    {},
    { initialNumItems: 10 }
  );

  const deleteScan = useMutation(api.scans.deleteScan).withOptimisticUpdate(
    (localStore, args) => {
      // Optimistically remove the scan from the list immediately
      const existing = localStore.getQuery(api.scans.getMyScans, {});
      if (existing) {
        localStore.setQuery(api.scans.getMyScans, {}, {
          ...existing,
          page: (existing as { page: Array<{ _id: string }> }).page.filter(
            (s) => s._id !== args.scanId
          ),
        });
      }
    }
  );

  // Fetch AI results for scans to show OMI tier / rhythm in rows
  // NOTE: In production, these fields would be denormalised onto ecg_scans for efficiency.
  // For Phase 1, we keep it simple.

  async function handleDelete(scanId: string) {
    if (!confirm("Delete this scan? This cannot be undone.")) return;
    await deleteScan({ scanId: scanId as Id<"ecg_scans"> });
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-white">Scan History</h1>
        <button
          onClick={() => navigate("/scan")}
          className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-xl transition-colors btn-touch"
        >
          <Plus className="w-4 h-4" />
          New Scan
        </button>
      </div>

      {/* Empty state */}
      {status === "LoadedAll" && results.length === 0 && (
        <div className="text-center py-16">
          <div className="w-14 h-14 rounded-2xl bg-slate-800 mx-auto flex items-center justify-center mb-4">
            <svg viewBox="0 0 24 24" className="w-7 h-7 text-slate-600" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="2,12 5,12 6.5,7 8,17 10,10 11.5,14 13,6 15.5,18 17,12 22,12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="text-slate-400 mb-1">No scans yet</p>
          <p className="text-slate-600 text-sm mb-5">Upload your first ECG to get started</p>
          <button
            onClick={() => navigate("/scan")}
            className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            New Scan
          </button>
        </div>
      )}

      {/* Scan list */}
      {results.length > 0 && (
        <div className="rounded-xl border border-slate-700 overflow-hidden">
          {results.map((scan) => (
            <ScanHistoryRow
              key={scan._id}
              scan={scan as any}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Loading state */}
      {status === "LoadingFirstPage" && (
        <div className="flex items-center justify-center py-12 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Loading history…
        </div>
      )}

      {/* Load more */}
      {status === "CanLoadMore" && (
        <button
          onClick={() => loadMore(10)}
          className="mt-4 w-full flex items-center justify-center gap-2 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-xl transition-colors btn-touch"
        >
          <ChevronDown className="w-4 h-4" />
          Load more
        </button>
      )}

      {status === "LoadingMore" && (
        <div className="flex items-center justify-center py-4 text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
          Loading…
        </div>
      )}

      {results.length > 0 && status === "LoadedAll" && (
        <p className="text-center text-xs text-slate-700 mt-4">
          {results.length} scan{results.length !== 1 ? "s" : ""} total
        </p>
      )}
    </div>
  );
}
