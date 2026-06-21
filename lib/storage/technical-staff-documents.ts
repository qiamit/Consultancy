import { DOCUMENTS_BUCKET } from "@/lib/storage/documents";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Stored in DB / form state — not a public URL. */
export const TECH_STAFF_STORAGE_PREFIX = "doc://" as const;

export function technicalStaffDocumentPath(
  projectId: string,
  rowId: string,
  field: string,
  fileName: string,
): string {
  const safeName = fileName.replace(/[^\w.\-]+/g, "-").slice(0, 120);
  return `bis-projects/${projectId}/technical-staff/${rowId}/${field}/${safeName}`;
}

export function encodeStoredDocumentRef(storagePath: string): string {
  return `${TECH_STAFF_STORAGE_PREFIX}${storagePath}`;
}

export function decodeStoredDocumentRef(value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  if (v.startsWith(TECH_STAFF_STORAGE_PREFIX)) {
    return v.slice(TECH_STAFF_STORAGE_PREFIX.length);
  }
  if (v.startsWith("bis-projects/")) return v;
  return null;
}

export function isDirectDocumentUrl(value: string): boolean {
  const v = value.trim();
  return v.startsWith("http://") || v.startsWith("https://");
}

export async function uploadTechnicalStaffDocument(
  supabase: SupabaseClient,
  path: string,
  file: File | Blob,
  contentType?: string,
): Promise<{ ref: string } | { error: string }> {
  const { data, error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .upload(path, file, {
      upsert: true,
      contentType:
        contentType ?? (file instanceof File ? file.type || undefined : undefined),
    });

  if (error) return { error: error.message };
  return { ref: encodeStoredDocumentRef(data.path) };
}

export async function resolveDocumentRef(
  supabase: SupabaseClient,
  value: string,
  expiresInSeconds = 3600,
): Promise<string | null> {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (isDirectDocumentUrl(trimmed)) return trimmed;

  const path = decodeStoredDocumentRef(trimmed);
  if (!path) return null;

  const { data, error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(path, expiresInSeconds);

  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
