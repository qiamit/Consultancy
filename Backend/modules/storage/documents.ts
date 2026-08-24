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

/** Company settings assets under the shared `documents` bucket (authenticated RLS). */
export function companyAssetBucketPath(
  userId: string,
  assetSlug: string,
  fileName: string,
) {
  const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  return `${userId}/company/${assetSlug}/${crypto.randomUUID()}_${safe}`;
}
