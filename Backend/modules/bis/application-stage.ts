/** Workflow stages for pending BIS license applications (New Applications list). */
export const BIS_APPLICATION_STAGES = [
  "Under Preparation",
  "Test Request Done",
  "Report Uploaded",
  "Application Submitted",
  "Inspection Done",
] as const;

export type BisApplicationStage = (typeof BIS_APPLICATION_STAGES)[number];

export const DEFAULT_BIS_APPLICATION_STAGE: BisApplicationStage = "Under Preparation";

/** Map retired stage labels → current stages (DB / UI normalize). */
const LEGACY_BIS_APPLICATION_STAGE_MAP: Record<string, BisApplicationStage> = {
  Draft: "Under Preparation",
  Submitted: "Application Submitted",
  "Query Done": "Under Preparation",
  "Application Recorded": "Application Submitted",
  "Inspection Planned": "Under Preparation",
  "License Granted": "Inspection Done",
};

export function isBisApplicationStage(value: string): value is BisApplicationStage {
  return (BIS_APPLICATION_STAGES as readonly string[]).includes(value);
}

export function normalizeBisApplicationStage(
  value: string | null | undefined,
): BisApplicationStage {
  const trimmed = String(value ?? "").trim();
  if (isBisApplicationStage(trimmed)) return trimmed;
  const mapped = LEGACY_BIS_APPLICATION_STAGE_MAP[trimmed];
  if (mapped) return mapped;
  return DEFAULT_BIS_APPLICATION_STAGE;
}

export function bisApplicationStageIndex(stage: BisApplicationStage): number {
  return BIS_APPLICATION_STAGES.indexOf(stage);
}

/** Prefer the further-along stage (never go backwards). */
export function maxBisApplicationStage(
  a: BisApplicationStage,
  b: BisApplicationStage,
): BisApplicationStage {
  return bisApplicationStageIndex(a) >= bisApplicationStageIndex(b) ? a : b;
}
