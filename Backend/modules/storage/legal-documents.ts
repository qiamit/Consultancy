export type LegalDocumentUploadField = "document";

export function legalDocumentPath(
  projectId: string,
  rowId: string,
  fileName: string,
): string {
  const safeName = fileName.replace(/[^\w.\-]+/g, "-").slice(0, 120);
  return `bis-projects/${projectId}/legal-documents/${rowId}/${safeName}`;
}
