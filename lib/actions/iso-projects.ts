"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function nullableStr(formData: FormData, key: string) {
  const s = str(formData, key);
  return s ? s : null;
}

function dateOrNull(formData: FormData, key: string) {
  const s = str(formData, key);
  return s ? s : null;
}

const kinds = new Set(["new_certification", "existing_certification"]);

const statuses = new Set([
  "lead",
  "in_progress",
  "submitted",
  "completed",
  "on_hold",
  "cancelled",
]);

export async function createIsoProject(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const title = str(formData, "title");
  const project_kind = str(formData, "project_kind");
  if (!title) redirect("/dashboard/iso-projects/new?error=title");
  if (!kinds.has(project_kind))
    redirect("/dashboard/iso-projects/new?error=kind");

  const status = str(formData, "status") || "lead";
  if (!statuses.has(status)) redirect("/dashboard/iso-projects/new?error=status");

  const client_id = nullableStr(formData, "client_id");

  const { error } = await supabase.from("iso_projects").insert({
    title,
    project_kind: project_kind as "new_certification" | "existing_certification",
    status: status as
      | "lead"
      | "in_progress"
      | "submitted"
      | "completed"
      | "on_hold"
      | "cancelled",
    client_id,
    accrediting_body: nullableStr(formData, "accrediting_body"),
    standard: nullableStr(formData, "standard"),
    certificate_number: nullableStr(formData, "certificate_number"),
    start_date: dateOrNull(formData, "start_date"),
    target_date: dateOrNull(formData, "target_date"),
    notes: nullableStr(formData, "notes"),
    created_by: user.id,
  });

  if (error) redirect("/dashboard/iso-projects/new?error=db");
  revalidatePath("/dashboard/iso-projects");
  redirect("/dashboard/iso-projects");
}

export async function updateIsoProject(id: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const title = str(formData, "title");
  const project_kind = str(formData, "project_kind");
  if (!title) redirect(`/dashboard/iso-projects/${id}?error=title`);
  if (!kinds.has(project_kind))
    redirect(`/dashboard/iso-projects/${id}?error=kind`);

  const status = str(formData, "status") || "lead";
  if (!statuses.has(status))
    redirect(`/dashboard/iso-projects/${id}?error=status`);

  const client_id = nullableStr(formData, "client_id");

  const { error } = await supabase
    .from("iso_projects")
    .update({
      title,
      project_kind: project_kind as "new_certification" | "existing_certification",
      status: status as
        | "lead"
        | "in_progress"
        | "submitted"
        | "completed"
        | "on_hold"
        | "cancelled",
      client_id,
      accrediting_body: nullableStr(formData, "accrediting_body"),
      standard: nullableStr(formData, "standard"),
      certificate_number: nullableStr(formData, "certificate_number"),
      start_date: dateOrNull(formData, "start_date"),
      target_date: dateOrNull(formData, "target_date"),
      notes: nullableStr(formData, "notes"),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) redirect(`/dashboard/iso-projects/${id}?error=db`);
  revalidatePath("/dashboard/iso-projects");
  revalidatePath(`/dashboard/iso-projects/${id}`);
}
