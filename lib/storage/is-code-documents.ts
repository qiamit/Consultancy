/**
 * Helpers for the `is_code_documents` Storage bucket (see migration).
 */
export const IS_CODE_DOCUMENTS_BUCKET = "is_code_documents" as const;

export function isCodeDocumentStoragePath(
  userId: string,
  isCodeId: string,
  fileName: string,
) {
  const safe = fileName.replace(/[/\\]/g, "_");
  return `${userId}/${isCodeId}/${crypto.randomUUID()}_${safe}`;
}
