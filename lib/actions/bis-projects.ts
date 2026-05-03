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

const kinds = new Set([
  "new_license",
  "renewal",
  "inclusion",
  "maintenance",
]);

const statuses = new Set([
  "lead",
  "in_progress",
  "submitted",
  "completed",
  "on_hold",
  "cancelled",
]);

export async function createBisProject(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const title = str(formData, "title");
  const project_kind = str(formData, "project_kind");
  if (!title) redirect("/dashboard/bis-projects/new?error=title");
  if (!kinds.has(project_kind))
    redirect("/dashboard/bis-projects/new?error=kind");

  const status = str(formData, "status") || "lead";
  if (!statuses.has(status)) redirect("/dashboard/bis-projects/new?error=status");

  const client_id = nullableStr(formData, "client_id");

  const { error } = await supabase.from("bis_projects").insert({
    title,
    project_kind: project_kind as "new_license" | "renewal" | "inclusion" | "maintenance",
    status: status as
      | "lead"
      | "in_progress"
      | "submitted"
      | "completed"
      | "on_hold"
      | "cancelled",
    client_id,
    license_number: nullableStr(formData, "license_number"),
    start_date: dateOrNull(formData, "start_date"),
    target_date: dateOrNull(formData, "target_date"),
    notes: nullableStr(formData, "notes"),
    created_by: user.id,
  });

  if (error) redirect("/dashboard/bis-projects/new?error=db");
  revalidatePath("/dashboard/bis-projects");
  redirect("/dashboard/bis-projects");
}

export async function updateBisProject(id: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const title = str(formData, "title");
  const project_kind = str(formData, "project_kind");
  if (!title) redirect(`/dashboard/bis-projects/${id}?error=title`);
  if (!kinds.has(project_kind))
    redirect(`/dashboard/bis-projects/${id}?error=kind`);

  const status = str(formData, "status") || "lead";
  if (!statuses.has(status))
    redirect(`/dashboard/bis-projects/${id}?error=status`);

  const client_id = nullableStr(formData, "client_id");

  const { error } = await supabase
    .from("bis_projects")
    .update({
      title,
      project_kind: project_kind as "new_license" | "renewal" | "inclusion" | "maintenance",
      status: status as
        | "lead"
        | "in_progress"
        | "submitted"
        | "completed"
        | "on_hold"
        | "cancelled",
      client_id,
      license_number: nullableStr(formData, "license_number"),
      start_date: dateOrNull(formData, "start_date"),
      target_date: dateOrNull(formData, "target_date"),
      notes: nullableStr(formData, "notes"),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) redirect(`/dashboard/bis-projects/${id}?error=db`);
  revalidatePath("/dashboard/bis-projects");
  revalidatePath(`/dashboard/bis-projects/${id}`);
}
