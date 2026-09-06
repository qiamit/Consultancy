/** Query keys for deep-linking Preparation modal + nested document editors. */
export const PREPARATION_QUERY = "preparation" as const;
export const PREPARATION_DOC_QUERY = "doc" as const;

export const PREPARATION_DOC_KEYS = [
  "license-scope",
  "osl-sample",
  "pi-sample",
  "application-details",
  "top-management",
  "technical-staff",
  "location-map",
  "plant-layout",
  "process-flow-chart",
  "process-description",
  "cmpf-305",
  "cmpf-306",
  "cmpf-307",
  "cmpf-310",
  "cmpf-311",
  "raw-material",
  "certified-reference-materials",
  "undertaking-option-2",
  "undertaking-general-iss",
  "self-evaluation",
  "authorization-letter",
  "factory-test-report",
  "updated-sit",
  "undertaking-long-duration",
  "undertaking-mmf",
  "subcontracted-tests",
  "client-edit",
  "is-code-edit",
  "bulk-print",
] as const;

export type PreparationDocKey = (typeof PREPARATION_DOC_KEYS)[number];

export function isPreparationDocKey(
  value: string | null | undefined,
): value is PreparationDocKey {
  return (
    typeof value === "string" &&
    (PREPARATION_DOC_KEYS as readonly string[]).includes(value)
  );
}
