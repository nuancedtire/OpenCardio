import { useConvexAuth } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { Navigate } from "react-router-dom";
import { Activity, ShieldCheck, Zap, Brain } from "lucide-react";

export default function Landing() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signIn } = useAuthActions();

  // Redirect already-authenticated users to the scan page
  if (isAuthenticated) {
    return <Navigate to="/scan" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12 text-center">
        {/* Logo */}
        <div className="mb-6 flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-red-600/20 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="2,12 5,12 6.5,7 8,17 10,10 11.5,14 13,6 15.5,18 17,12 22,12"
                strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white">OpenCardio</h1>
        </div>

        <p className="text-xl text-slate-300 mb-2 font-medium">
          AI-powered ECG analysis for emergency medicine
        </p>
        <p className="text-slate-500 max-w-md mb-10 text-sm leading-relaxed">
          Photograph any 12-lead ECG and receive AI-interpreted measurements, rhythm
          classification, OMI probability, and automated QTc alerts in under 10 seconds.
          Free, open-source, no patient identifiers stored.
        </p>

        {/* Sign in button */}
        <button
          onClick={() => void signIn("google", { redirectTo: "/scan" })}
          disabled={isLoading}
          className="flex items-center gap-3 bg-white hover:bg-gray-100 text-gray-900 font-semibold px-6 py-3.5 rounded-xl shadow-lg transition-colors disabled:opacity-50 text-sm btn-touch"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Sign in with Google
        </button>

        <p className="text-xs text-slate-600 mt-4 max-w-xs">
          Use your NHS / trust Google account. No separate password required.
        </p>
      </main>

      {/* Features */}
      <section className="border-t border-slate-800 py-10 px-4">
        <div className="max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
          {[
            {
              icon: Zap,
              title: "Results in < 10s",
              desc: "Heart rate, QTc, rhythms, OMI risk — instantly.",
            },
            {
              icon: Brain,
              title: "AI OMI Detection",
              desc: "ECG-FM model with Sgarbossa, Wellens, and de Winter pattern recognition.",
            },
            {
              icon: ShieldCheck,
              title: "Zero PHI",
              desc: "No patient names, MRNs, or dates of birth. Ever.",
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center">
                <Icon className="w-5 h-5 text-red-400" />
              </div>
              <p className="font-semibold text-slate-200 text-sm">{title}</p>
              <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Disclaimer */}
      <footer className="py-4 px-4 text-center">
        <p className="text-xs text-slate-700 max-w-lg mx-auto">
          OpenCardio is a research and clinical decision support tool. It is not a regulated
          medical device. Clinical decisions remain the responsibility of the treating clinician.
        </p>
      </footer>
    </div>
  );
}
