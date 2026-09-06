/** Workflow stages for pending BIS license applications (New Applications list). */
export const BIS_APPLICATION_STAGES = [
  "Draft",
  "Submitted",
  "Query Done",
  "Application Recorded",
  "Inspection Planned",
  "Inspection Done",
  "License Granted",
] as const;

export type BisApplicationStage = (typeof BIS_APPLICATION_STAGES)[number];

export const DEFAULT_BIS_APPLICATION_STAGE: BisApplicationStage = "Draft";

export function isBisApplicationStage(value: string): value is BisApplicationStage {
  return (BIS_APPLICATION_STAGES as readonly string[]).includes(value);
}

export function normalizeBisApplicationStage(
  value: string | null | undefined,
): BisApplicationStage {
  const trimmed = String(value ?? "").trim();
  if (isBisApplicationStage(trimmed)) return trimmed;
  return DEFAULT_BIS_APPLICATION_STAGE;
}
