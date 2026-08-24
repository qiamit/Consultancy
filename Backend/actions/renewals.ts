"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@backend/db/supabase/server";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ClientDetail = {
  id: string;
  name: string;
  company_name: string | null;
  contact_person_name: string | null;
  email: string | null;
  phone: string | null;
  gst_number: string | null;
  company_type: string | null;
  company_scale: string | null;
  company_status: string;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string;
  pin_code: string | null;
  payment_term: string | null;
  opening_balance: number;
  balance_type: string;
  notes: string | null;
};

export type ProjectDetail = {
  id: string;
  title: string;
  status: string;
  cm_l_digits: string | null;
  license_number: string | null;
  license_validity_date: string | null;
  is_code_number: string | null;
  is_code_title: string | null;
  case_handled_by: string;
  case_referred_by: string;
  billing_amount: number;
  billing_frequency: string;
  portal_user_id: string | null;
  portal_password: string | null;
  start_date: string | null;
  notes: string | null;
};

export type RenewalApplication = {
  id?: string;
  project_id: string;
  client_id: string | null;
  application_date: string | null;
  submission_mode: string | null;
  acknowledgment_number: string | null;
  bis_office: string | null;
  bis_desk_officer: string | null;
  marking_fee_rate: number | null;
  marking_fee_quantity: number | null;
  marking_fee_total: number | null;
  fee_challan_number: string | null;
  fee_payment_date: string | null;
  fee_payment_mode: string | null;
  test_report_number: string | null;
  test_report_date: string | null;
  test_lab_name: string | null;
  test_lab_nabl_no: string | null;
  test_result: string | null;
  inspection_notice_date: string | null;
  inspection_date: string | null;
  bis_inspector_name: string | null;
  inspection_result: string | null;
  renewal_granted_date: string | null;
  new_validity_from: string | null;
  new_validity_to: string | null;
  renewal_status: string;
  notes: string | null;
};

// ─── Client actions ───────────────────────────────────────────────────────────

export async function fetchClientDetail(
  clientId: string,
): Promise<ClientDetail | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("clients")
    .select(
      "id, name, company_name, contact_person_name, email, phone, gst_number, company_type, company_scale, company_status, address, city, state, country, pin_code, payment_term, opening_balance, balance_type, notes",
    )
    .eq("id", clientId)
    .single();
  return data as ClientDetail | null;
}

export async function updateClientDetail(
  clientId: string,
  data: Partial<ClientDetail>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("clients")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", clientId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/clients");
  return { ok: true };
}

// ─── Project/License actions ──────────────────────────────────────────────────

export async function fetchProjectDetail(
  projectId: string,
): Promise<ProjectDetail | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("bis_projects")
    .select(
      "id, title, status, cm_l_digits, license_number, license_validity_date, case_handled_by, case_referred_by, billing_amount, billing_frequency, portal_user_id, portal_password, start_date, notes, is_codes(is_number, title)",
    )
    .eq("id", projectId)
    .single();
  if (!data) return null;
  const ic = (
    Array.isArray(data.is_codes) ? data.is_codes[0] : data.is_codes
  ) as { is_number?: string; title?: string } | null;
  return {
    id: data.id as string,
    title: data.title as string,
    status: data.status as string,
    cm_l_digits: data.cm_l_digits as string | null,
    license_number: data.license_number as string | null,
    license_validity_date: data.license_validity_date as string | null,
    is_code_number: ic?.is_number ?? null,
    is_code_title: ic?.title ?? null,
    case_handled_by: (data.case_handled_by as string) ?? "",
    case_referred_by: (data.case_referred_by as string) ?? "",
    billing_amount: (data.billing_amount as number) ?? 0,
    billing_frequency: (data.billing_frequency as string) ?? "",
    portal_user_id: data.portal_user_id as string | null,
    portal_password: data.portal_password as string | null,
    start_date: data.start_date as string | null,
    notes: data.notes as string | null,
  };
}

export async function updateLicenseValidity(
  projectId: string,
  newDate: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("bis_projects")
    .update({ license_validity_date: newDate, updated_at: new Date().toISOString() })
    .eq("id", projectId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/bis-projects");
  return { ok: true };
}

// ─── Renewal application actions ──────────────────────────────────────────────

export async function fetchRenewalApplication(
  projectId: string,
): Promise<RenewalApplication | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("bis_renewal_applications")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as RenewalApplication | null;
}

export async function upsertRenewalApplication(
  app: RenewalApplication,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const supabase = await createClient();

  // Also update project's license_validity_date if new_validity_to was set
  if (app.new_validity_to) {
    await supabase
      .from("bis_projects")
      .update({
        license_validity_date: app.new_validity_to,
        status: "completed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", app.project_id);
  }

  const { id, ...rest } = app;
  const payload = { ...rest, updated_at: new Date().toISOString() };
  if (id) {
    const { error } = await supabase
      .from("bis_renewal_applications")
      .update(payload)
      .eq("id", id);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/bis-projects");
    return { ok: true, id };
  }

  const { data, error } = await supabase
    .from("bis_renewal_applications")
    .insert(payload)
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/bis-projects");
  return { ok: true, id: data.id as string };
}
