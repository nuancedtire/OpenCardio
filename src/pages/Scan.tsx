import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Camera, Upload, X, AlertCircle, Loader2 } from "lucide-react";
import ProcessingSteps from "../components/ProcessingSteps";
import { cn } from "../lib/utils";
import type { Id } from "../../convex/_generated/dataModel";

type PageState = "idle" | "uploading" | "processing" | "error";

export default function Scan() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [state, setState] = useState<PageState>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [label, setLabel] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const generateUploadUrl = useMutation(api.scans.generateUploadUrl);
  const createScan = useMutation(api.scans.createScan);

  function handleFileSelect(file: File) {
    if (!file.type.startsWith("image/")) {
      setErrorMsg("Please select an image file (JPEG, PNG, HEIC).");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setErrorMsg("Image too large. Maximum size is 20 MB.");
      return;
    }
    setSelectedFile(file);
    setErrorMsg("");
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  }

  async function handleSubmit() {
    if (!selectedFile) return;

    setState("uploading");
    setUploadProgress(0);
    setErrorMsg("");

    try {
      // 1. Get a short-lived upload URL from Convex
      const uploadUrl = await generateUploadUrl();

      // 2. Upload the image directly to Convex storage
      setUploadProgress(30);
      const uploadRes = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": selectedFile.type },
        body: selectedFile,
      });

      if (!uploadRes.ok) {
        throw new Error(`Upload failed: ${uploadRes.status}`);
      }

      const { storageId } = (await uploadRes.json()) as { storageId: string };
      setUploadProgress(70);

      // 3. Create the scan record (also schedules AI processing)
      const scanId = await createScan({
        storageId: storageId as Id<"_storage">,
        imageContentType: selectedFile.type,
        imageSizeBytes: selectedFile.size,
        label: label.trim() || undefined,
        capturedAt: Date.now(),
      });

      setUploadProgress(100);
      setState("processing");

      // Navigate to results — the reactive query will update when processing completes
      navigate(`/scan/${scanId}`);
    } catch (err) {
      setState("error");
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Upload failed. Please check your connection and try again."
      );
    }
  }

  function handleReset() {
    setState("idle");
    setErrorMsg("");
    setPreview(null);
    setSelectedFile(null);
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  if (state === "processing") {
    return (
      <div className="max-w-sm mx-auto px-4 py-12">
        <ProcessingSteps currentStep="digitising" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">New ECG Scan</h1>
        <p className="text-sm text-slate-400 mt-1">
          Photograph or upload a 12-lead ECG. No patient identifiers.
        </p>
      </div>

      {/* Upload area */}
      {!selectedFile ? (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          className="relative border-2 border-dashed border-slate-600 hover:border-red-500 rounded-2xl p-10 flex flex-col items-center gap-4 cursor-pointer transition-colors"
        >
          <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center">
            <Camera className="w-8 h-8 text-slate-400" />
          </div>
          <div className="text-center">
            <p className="text-white font-semibold">Take photo or upload image</p>
            <p className="text-sm text-slate-400 mt-1">JPEG, PNG, HEIC · max 20 MB</p>
          </div>
          <div className="flex gap-3">
            <span className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-xl transition-colors">
              <Camera className="w-4 h-4" /> Camera
            </span>
            <span className="flex items-center gap-1.5 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-xl transition-colors">
              <Upload className="w-4 h-4" /> Gallery
            </span>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleInputChange}
            className="sr-only"
            aria-label="Upload ECG image"
          />
        </div>
      ) : (
        /* Preview */
        <div className="rounded-2xl border border-slate-700 overflow-hidden">
          <div className="relative">
            <img
              src={preview!}
              alt="ECG preview"
              className="w-full max-h-64 object-contain bg-black"
            />
            <button
              onClick={handleReset}
              className="absolute top-2 right-2 w-8 h-8 bg-slate-900/80 rounded-full flex items-center justify-center text-white hover:bg-red-600 transition-colors"
              aria-label="Remove image"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-3 bg-slate-800/50 text-xs text-slate-400">
            {selectedFile.name} · {(selectedFile.size / 1024).toFixed(0)} KB
          </div>
        </div>
      )}

      {/* Label input */}
      <div className="mt-4">
        <label className="block text-sm font-medium text-slate-300 mb-1.5" htmlFor="scan-label">
          Clinical context <span className="text-slate-500 font-normal">(optional, no patient identifiers)</span>
        </label>
        <input
          id="scan-label"
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          maxLength={120}
          placeholder="e.g. Anterior chest pain, 62M"
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
        />
        <p className="text-xs text-slate-600 mt-1 text-right">{label.length}/120</p>
      </div>

      {/* Upload progress */}
      {state === "uploading" && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Uploading…</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-red-500 transition-all duration-300 rounded-full"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error */}
      {state === "error" && errorMsg && (
        <div className="mt-4 flex items-start gap-2 p-3 bg-red-950 border border-red-700 rounded-xl text-sm text-red-300">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Upload failed</p>
            <p className="text-xs mt-0.5 text-red-400">{errorMsg}</p>
            <p className="text-xs mt-1 text-slate-400">
              Tips: Ensure good lighting, straight orientation, and avoid shadows.
            </p>
          </div>
        </div>
      )}

      {/* Submit button */}
      <button
        onClick={handleSubmit}
        disabled={!selectedFile || state === "uploading"}
        className={cn(
          "mt-6 w-full py-3.5 rounded-xl font-semibold text-sm transition-colors btn-touch",
          selectedFile && state !== "uploading"
            ? "bg-red-600 hover:bg-red-500 text-white"
            : "bg-slate-700 text-slate-500 cursor-not-allowed"
        )}
      >
        {state === "uploading" ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Uploading…
          </span>
        ) : (
          "Analyse ECG"
        )}
      </button>

      <p className="text-xs text-slate-600 text-center mt-3">
        Results typically available in 6–10 seconds
      </p>
    </div>
  );
}
