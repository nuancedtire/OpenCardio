import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { ShieldCheck, AlertTriangle } from "lucide-react";

export default function OnboardingModal() {
  const completeOnboarding = useMutation(api.users.completeOnboarding);

  const handleDismiss = () => {
    void completeOnboarding();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="2,12 5,12 6.5,7 8,17 10,10 11.5,14 13,6 15.5,18 17,12 22,12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2 id="onboarding-title" className="text-lg font-bold text-white">
            Welcome to OpenCardio
          </h2>
        </div>

        {/* Data policy */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-300 mb-1">No Patient Identifiers</p>
              <p className="text-sm text-slate-300">
                This tool does <strong className="text-white">NOT</strong> store any patient
                identifiers. Do not enter patient names, MRNs, dates of birth, or any personally
                identifiable information.
              </p>
            </div>
          </div>
        </div>

        {/* Research disclaimer */}
        <div className="bg-slate-700/50 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-slate-300">
              OpenCardio is a <strong className="text-white">clinical decision support research
              tool</strong>, not a regulated medical device. It does not replace clinical
              judgement or specialist review. All clinical decisions remain the responsibility
              of the treating clinician.
            </p>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className="w-full bg-red-600 hover:bg-red-500 text-white font-semibold py-3 rounded-xl transition-colors btn-touch"
        >
          I understand — Continue
        </button>
      </div>
    </div>
  );
}
