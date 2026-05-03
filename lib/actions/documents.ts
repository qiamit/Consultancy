"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { DOCUMENTS_BUCKET, documentsBucketPath } from "@/lib/storage/documents";
import { createClient } from "@/lib/supabase/server";

export async function uploadBisDocument(bisProjectId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    redirect(`/dashboard/bis-projects/${bisProjectId}?error=upload`);
  }

  const path = documentsBucketPath(user.id, "bis", bisProjectId, file.name);

  const { error: uploadError } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .upload(path, file, { upsert: false });

  if (uploadError)
    redirect(`/dashboard/bis-projects/${bisProjectId}?error=upload`);

  const { error: dbError } = await supabase.from("project_documents").insert({
    bis_project_id: bisProjectId,
    storage_path: path,
    file_name: file.name,
    created_by: user.id,
  });

  if (dbError) redirect(`/dashboard/bis-projects/${bisProjectId}?error=upload`);

  revalidatePath(`/dashboard/bis-projects/${bisProjectId}`);
}

export async function uploadIsoDocument(isoProjectId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    redirect(`/dashboard/iso-projects/${isoProjectId}?error=upload`);
  }

  const path = documentsBucketPath(user.id, "iso", isoProjectId, file.name);

  const { error: uploadError } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .upload(path, file, { upsert: false });

  if (uploadError)
    redirect(`/dashboard/iso-projects/${isoProjectId}?error=upload`);

  const { error: dbError } = await supabase.from("project_documents").insert({
    iso_project_id: isoProjectId,
    storage_path: path,
    file_name: file.name,
    created_by: user.id,
  });

  if (dbError) redirect(`/dashboard/iso-projects/${isoProjectId}?error=upload`);

  revalidatePath(`/dashboard/iso-projects/${isoProjectId}`);
}
