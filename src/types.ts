// TypeScript types matching the Convex schema

export type OmiTier = "low" | "intermediate" | "high";
export type QtcAlertLevel = "normal" | "borderline" | "prolonged";
export type DiagnosisCategory = "rhythm" | "conduction" | "ischaemia" | "structural" | "other";
export type DiagnosisSeverity = "info" | "warning" | "critical";
export type ScanStatus = "uploading" | "processing" | "complete" | "failed";
export type LvefVerdict = "likely_reduced" | "borderline" | "likely_normal";
export type SgarbossaResult = "positive" | "negative" | "indeterminate";

export interface Diagnosis {
  label: string;
  code: string;
  category: DiagnosisCategory;
  confidence: number;
  severity: DiagnosisSeverity;
  leadsAffected?: string[];
  explanation?: string;
}

export interface PatternFlag {
  pattern: string;
  leads: string[];
  description: string;
  severity: "warning" | "critical";
}

export interface Measurements {
  heartRateBpm?: number;
  rrIntervalMs?: number;
  prIntervalMs?: number;
  qrsWidthMs?: number;
  qtIntervalMs?: number;
  qtcFridericia?: number;
  qtcBazett?: number;
  cardiacAxisDegrees?: number;
  pWaveDurationMs?: number;
}

export interface AiResult {
  _id: string;
  scanId: string;
  userId: string;

  signalData?: Record<string, number[]>;
  digitisationQuality?: "good" | "acceptable" | "poor";
  leadLayoutDetected?: string;

  // Measurements
  heartRateBpm?: number;
  rrIntervalMs?: number;
  prIntervalMs?: number;
  qrsWidthMs?: number;
  qtIntervalMs?: number;
  qtcFridericia?: number;
  qtcBazett?: number;
  cardiacAxisDegrees?: number;
  pWaveDurationMs?: number;

  qtcAlertLevel?: QtcAlertLevel;

  primaryRhythm?: string;
  primaryRhythmCode?: string;
  primaryRhythmConfidence?: number;

  diagnoses?: Diagnosis[];

  omiProbability?: number;
  omiTier?: OmiTier;
  stemiCriteriaMet?: boolean;
  stemiCriteriaLeads?: string[];
  sgarbossaActivated?: boolean;
  sgarbossaOriginalScore?: number;
  sgarbossaSmithModified?: SgarbossaResult;
  patternFlags?: PatternFlag[];
  omiHeatmapData?: Record<string, number[]>;

  lvefProbabilityReduced?: number;
  lvefVerdict?: LvefVerdict;

  modelVersionDigitiser?: string;
  modelVersionCoreDx?: string;
  modelVersionOmi?: string;
  modelVersionLvef?: string;
  inferenceTimestampMs?: number;
  inferenceLatencyMs?: number;
}

export interface EcgScan {
  _id: string;
  _creationTime: number;
  userId: string;
  storageId: string;
  imageContentType: string;
  imageSizeBytes?: number;
  label?: string;
  capturedAt: number;
  status: ScanStatus;
  failureReason?: string;
  retryCount?: number;
  aiResultId?: string;
}

export interface UserProfile {
  _id: string;
  userId: string;
  qtcSex?: "male" | "female" | "unspecified";
  onboardingComplete: boolean;
  role?: "clinician" | "researcher" | "admin";
}
