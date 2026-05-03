/**
 * Helpers for the `documents` Storage bucket (see migration).
 * Upload/delete flows live in {@link ../actions/documents}.
 */
export const DOCUMENTS_BUCKET = "documents" as const;

export function documentsBucketPath(
  userId: string,
  scope: "bis" | "iso",
  projectId: string,
  fileName: string,
) {
  return `${userId}/${scope}/${projectId}/${crypto.randomUUID()}_${fileName}`;
}
