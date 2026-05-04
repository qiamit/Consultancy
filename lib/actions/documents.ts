"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { DOCUMENTS_BUCKET, documentsBucketPath } from "@/lib/storage/documents";
import { createClient } from "@/lib/supabase/server";

const bisProjectsListPath = "/dashboard/bis-projects";

function bisProjectEditQuery(bisProjectId: string) {
  return `${bisProjectsListPath}?id=${encodeURIComponent(bisProjectId)}`;
}

export async function uploadBisDocument(bisProjectId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const back = bisProjectEditQuery(bisProjectId);

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    redirect(`${back}&error=upload`);
  }

  const path = documentsBucketPath(user.id, "bis", bisProjectId, file.name);

  const { error: uploadError } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .upload(path, file, { upsert: false });

  if (uploadError) redirect(`${back}&error=upload`);

  const { error: dbError } = await supabase.from("project_documents").insert({
    bis_project_id: bisProjectId,
    storage_path: path,
    file_name: file.name,
    created_by: user.id,
  });

  if (dbError) redirect(`${back}&error=upload`);

  revalidatePath(bisProjectsListPath);
  redirect(back);
}

export async function signBisProjectDocumentDownload(
  fileId: string,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data: row, error } = await supabase
    .from("project_documents")
    .select("storage_path")
    .eq("id", fileId.trim())
    .maybeSingle();
  if (error || !row) return { ok: false, error: "File not found." };

  const { data: signed, error: signErr } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl((row as { storage_path: string }).storage_path, 3600);
  if (signErr || !signed?.signedUrl)
    return { ok: false, error: signErr?.message ?? "Could not sign URL." };
  return { ok: true, url: signed.signedUrl };
}

export async function deleteBisProjectDocument(fileId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const fid = fileId.trim();
  const { data: row, error: selErr } = await supabase
    .from("project_documents")
    .select("id,storage_path,bis_project_id")
    .eq("id", fid)
    .maybeSingle();
  if (selErr || !row) redirect(`${bisProjectsListPath}?error=db`);

  const r = row as {
    storage_path: string;
    bis_project_id: string | null;
  };
  if (!r.bis_project_id) redirect(`${bisProjectsListPath}?error=db`);

  await supabase.storage.from(DOCUMENTS_BUCKET).remove([r.storage_path]);

  const { error } = await supabase.from("project_documents").delete().eq("id", fid);
  if (error) redirect(`${bisProjectsListPath}?error=db`);

  revalidatePath(bisProjectsListPath);
  redirect(bisProjectEditQuery(r.bis_project_id));
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
