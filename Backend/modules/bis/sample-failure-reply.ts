export const SAMPLE_FAILURE_TYPES = [
  "pi_sample",
  "market_sample",
  "surveillance_sample",
] as const;

export type SampleFailureType = (typeof SAMPLE_FAILURE_TYPES)[number];

export const SAMPLE_FAILURE_TYPE_LABELS: Record<SampleFailureType, string> = {
  pi_sample: "PI Sample",
  market_sample: "Market Sample",
  surveillance_sample: "Surveillance Sample",
};

export const SAMPLE_FAILURE_STATUSES = [
  "open",
  "drafted",
  "submitted",
  "closed",
] as const;

export type SampleFailureStatus = (typeof SAMPLE_FAILURE_STATUSES)[number];

export function isSampleFailureType(value: string): value is SampleFailureType {
  return (SAMPLE_FAILURE_TYPES as readonly string[]).includes(value);
}

export function sampleFailureTypeLabel(type: string): string {
  if (isSampleFailureType(type)) return SAMPLE_FAILURE_TYPE_LABELS[type];
  return type || "—";
}
