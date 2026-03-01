import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../convex/_generated/api";
import { Check, LogOut } from "lucide-react";
import { cn } from "../lib/utils";
import { useNavigate } from "react-router-dom";

type QtcSex = "male" | "female" | "unspecified";

export default function Settings() {
  const navigate = useNavigate();
  const { signOut } = useAuthActions();
  const currentUser = useQuery(api.users.getCurrentUser);
  const updateProfile = useMutation(api.users.updateUserProfile);
  const [saved, setSaved] = useState(false);

  const currentSex = currentUser?.profile?.qtcSex ?? "unspecified";
  const [qtcSex, setQtcSex] = useState<QtcSex>(currentSex as QtcSex);

  async function handleSave() {
    await updateProfile({ qtcSex });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleSignOut() {
    await signOut();
    navigate("/");
  }

  const sexOptions: { value: QtcSex; label: string; desc: string }[] = [
    { value: "male", label: "Male", desc: "Normal QTc < 450ms" },
    { value: "female", label: "Female", desc: "Normal QTc < 460ms" },
    { value: "unspecified", label: "Not specified", desc: "Both thresholds shown" },
  ];

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h1 className="text-xl font-bold text-white mb-6">Settings</h1>

      {/* Profile (read-only from Google) */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Profile
        </h2>
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 space-y-3">
          {currentUser && (
            <>
              {currentUser.name && (
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">Name</p>
                  <p className="text-sm text-white">{currentUser.name}</p>
                </div>
              )}
              {currentUser.email && (
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">Email</p>
                  <p className="text-sm text-white">{currentUser.email}</p>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* QTc sex preference */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-1">
          QTc Threshold
        </h2>
        <p className="text-xs text-slate-500 mb-3">
          Used to calibrate QTc alert thresholds. Does not store patient information.
        </p>
        <div className="space-y-2">
          {sexOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setQtcSex(opt.value)}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-colors btn-touch",
                qtcSex === opt.value
                  ? "border-red-500 bg-red-950/30"
                  : "border-slate-700 bg-slate-800/50 hover:border-slate-600"
              )}
            >
              <div>
                <p className="text-sm font-medium text-white">{opt.label}</p>
                <p className="text-xs text-slate-400">{opt.desc}</p>
              </div>
              {qtcSex === opt.value && <Check className="w-4 h-4 text-red-400 flex-shrink-0" />}
            </button>
          ))}
        </div>
        <button
          onClick={handleSave}
          className={cn(
            "mt-3 w-full py-3 rounded-xl text-sm font-semibold transition-colors btn-touch",
            saved
              ? "bg-green-700 text-white"
              : "bg-red-600 hover:bg-red-500 text-white"
          )}
        >
          {saved ? (
            <span className="flex items-center justify-center gap-2">
              <Check className="w-4 h-4" /> Saved
            </span>
          ) : (
            "Save preferences"
          )}
        </button>
      </section>

      {/* About */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
          About
        </h2>
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 space-y-2 text-sm text-slate-300">
          <p>
            <span className="text-slate-500">Version</span>{" "}
            <span className="font-mono">0.1.0 (Phase 1 MVP)</span>
          </p>
          <p>
            OpenCardio is a free, open-source emergency-medicine-first ECG analysis tool.
          </p>
          <a
            href="https://github.com/nuancedtire/OpenCardio"
            target="_blank"
            rel="noreferrer"
            className="text-red-400 hover:underline text-xs"
          >
            View on GitHub →
          </a>
        </div>

        {/* Disclaimer */}
        <div className="mt-3 bg-slate-800/30 border border-slate-700/50 rounded-xl p-4 text-xs text-slate-500 leading-relaxed">
          This tool is intended for research and clinical decision support only. It is not a
          regulated medical device. All clinical decisions remain the responsibility of the treating
          clinician. Zero patient identifiers are stored.
        </div>
      </section>

      {/* Sign out */}
      <section>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 py-3 border border-slate-700 hover:border-red-700 hover:bg-red-950/30 text-slate-300 hover:text-red-300 text-sm font-medium rounded-xl transition-colors btn-touch"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </section>
    </div>
  );
}
