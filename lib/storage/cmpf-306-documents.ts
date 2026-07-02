import { decodeStoredDocumentRef } from "@/lib/storage/technical-staff-documents";

export type Cmpf306DocumentKind = "calibration-certificate" | "consent-letter";

export function cmpf306DocumentPath(
  projectId: string,
  kind: Cmpf306DocumentKind,
  fileName: string,
): string {
  const safeName = fileName.replace(/[^\w.\-]+/g, "-").slice(0, 120);
  return `bis-projects/${projectId}/cmpf-306/${kind}/${safeName}`;
}

export function fileNameFromStoredDocumentRef(ref: string): string {
  const path = decodeStoredDocumentRef(ref);
  if (!path) return "Document";
  const name = path.split("/").pop() ?? "Document";
  try {
    return decodeURIComponent(name);
  } catch {
    return name;
  }
}
