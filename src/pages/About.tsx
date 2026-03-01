import { ShieldCheck, Github, Heart } from "lucide-react";
import { Link } from "react-router-dom";

export default function About() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Logo + title */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-red-600/20 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="2,12 5,12 6.5,7 8,17 10,10 11.5,14 13,6 15.5,18 17,12 22,12" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">OpenCardio</h1>
          <p className="text-xs text-slate-500 font-mono">v0.1.0 · Phase 1 MVP</p>
        </div>
      </div>

      {/* Mission */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Mission</h2>
        <p className="text-sm text-slate-300 leading-relaxed">
          OpenCardio is a free, open-source, emergency-medicine-first ECG analysis tool. A clinician
          photographs any 12-lead ECG and within 10 seconds receives AI-interpreted measurements,
          rhythm classification, OMI/STEMI probability, and automated QTc alerts — all without
          recording a single patient identifier.
        </p>
      </section>

      {/* Clinical Disclaimer */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Clinical Disclaimer
        </h2>
        <div className="bg-amber-950/30 border border-amber-700/40 rounded-xl p-4">
          <div className="flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-amber-200 leading-relaxed">
              <strong>OpenCardio is a clinical decision support research tool — it is NOT a
              regulated medical device in Phase 1.</strong> It does not replace clinical judgement,
              senior review, or specialist cardiology opinion. All clinical decisions remain the
              responsibility of the treating clinician.
            </p>
          </div>
        </div>
      </section>

      {/* Privacy */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Privacy &amp; Data
        </h2>
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 space-y-2 text-sm text-slate-300">
          <p>Zero patient identifiers stored — no names, MRNs, or dates of birth.</p>
          <p>ECG images stored in your private Convex account only. Deleted on your request.</p>
          <p>GDPR legal basis: Legitimate interests (clinical decision support research).</p>
          <p>Convex EU region deployment for data residency compliance.</p>
        </div>
      </section>

      {/* AI models */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
          AI Models (Phase 2)
        </h2>
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 space-y-1.5 text-sm text-slate-400">
          <p><span className="text-slate-300 font-medium">Digitisation:</span> felixkrones/ECG-Digitiser</p>
          <p><span className="text-slate-300 font-medium">Core Dx:</span> ECG-FM fine-tuned on PTB-XL</p>
          <p><span className="text-slate-300 font-medium">OMI:</span> ECG-FM-OMI-v1</p>
          <p><span className="text-slate-300 font-medium">LVEF:</span> ECG-FM-LVEF-v1 (AUROC 0.929)</p>
          <p><span className="text-slate-300 font-medium">Measurements:</span> NeuroKit2</p>
          <p className="text-xs text-slate-600 mt-2">Phase 1 uses mock AI responses. Real models in Phase 2.</p>
        </div>
      </section>

      {/* Stack */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Stack</h2>
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 font-mono text-xs text-slate-400 leading-relaxed">
          <p>Hono + Vite + React → Cloudflare Workers</p>
          <p>Convex (DB · Auth · Files · Real-time)</p>
          <p>Google SSO via @convex-dev/auth</p>
          <p>Python VPS (FastAPI + GPU) → AI Inference</p>
        </div>
      </section>

      {/* Links */}
      <section className="flex gap-3">
        <a
          href="https://github.com/nuancedtire/OpenCardio"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-xl transition-colors btn-touch"
        >
          <Github className="w-4 h-4" />
          GitHub
        </a>
        <Link
          to="/scan"
          className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-xl transition-colors btn-touch"
        >
          <Heart className="w-4 h-4" />
          New Scan
        </Link>
      </section>
    </div>
  );
}
