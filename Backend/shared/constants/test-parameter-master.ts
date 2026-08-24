/** Canonical test method values (fallback when DB catalog is empty). */
export const TEST_METHODS = [
  "Visual Examination",
  "Chemical Analysis",
  "Physical Test",
  "Mechanical Test",
  "Electrical Test",
  "Microbiological Test",
  "Annex",
  "As per IS",
] as const;

export const DEFAULT_TEST_METHOD = TEST_METHODS[0];
