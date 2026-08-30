"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@backend/db/client/server";
import {
  computeLicenseDisplayStatus,
  formatCmDisplay,
} from "@backend/modules/bis/bis-project-license-status";
import { sendSystemEmail } from "@backend/modules/email/resend";
import { formatDisplayDate } from "@backend/shared/format-date";

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
  const id = (projectId ?? "").trim();
  const date = (newDate ?? "").trim().slice(0, 10);
  if (!id) return { ok: false, error: "Missing project id." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { ok: false, error: "Enter a valid date (YYYY-MM-DD)." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("bis_projects")
    .update({ license_validity_date: date, updated_at: new Date().toISOString() })
    .eq("id", id);
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

function daysUntilValidity(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function buildRenewalReminderEmail(input: {
  clientName: string;
  cmL: string;
  isLabel: string;
  validityLabel: string;
  statusLabel: string;
  days: number | null;
  projectStatus: string;
}): { subject: string; text: string; html: string } {
  const { clientName, cmL, isLabel, validityLabel, statusLabel, days, projectStatus } =
    input;

  let urgency: string;
  let actionLine: string;
  if (projectStatus === "stop_marking" || statusLabel === "Stop Marking") {
    urgency = "your BIS licence is currently under Stop Marking";
    actionLine =
      "Please restore compliance and contact us so we can assist with resumption of marking and any renewal steps.";
  } else if (statusLabel === "Expired" || (days != null && days < -90)) {
    urgency = "your BIS licence has expired beyond the renewal grace period";
    actionLine =
      "A fresh application / revival process may be required. Please contact us promptly to discuss next steps.";
  } else if (days != null && days < 0) {
    urgency = `your BIS licence validity expired ${Math.abs(days)} day(s) ago (Deferred / grace window)`;
    actionLine =
      "Please complete renewal filing with BIS as soon as possible to avoid further compliance risk.";
  } else if (days === 0) {
    urgency = "your BIS licence expires today";
    actionLine =
      "Please initiate / complete the renewal application on Manak Online without delay.";
  } else if (days != null && days <= 30) {
    urgency = `your BIS licence expires in ${days} day(s)`;
    actionLine =
      "Please start the renewal process now so documents and portal filing can be completed in time.";
  } else if (days != null) {
    urgency = `your BIS licence expires in ${days} day(s)`;
    actionLine =
      "This is a courtesy reminder to plan renewal documents and Manak Online filing.";
  } else {
    urgency = "a BIS licence on your account needs attention";
    actionLine = "Please contact us for the current status and renewal guidance.";
  }

  const subject = `BIS Licence Reminder — ${cmL || "Licence"} (${statusLabel})`;
  const text = [
    `Dear ${clientName},`,
    "",
    `This is a reminder that ${urgency}.`,
    "",
    `Licence / CM/L : ${cmL || "—"}`,
    `IS Number      : ${isLabel || "—"}`,
    `Validity Date  : ${validityLabel || "—"}`,
    `Status         : ${statusLabel}`,
    "",
    actionLine,
    "",
    "If you have already renewed, please share the updated validity date with us.",
    "",
    "Regards,",
    "Quality Engineering Consultancy",
    "info@qengineering.in",
  ].join("\n");

  const html = `
    <p>Dear ${escapeHtml(clientName)},</p>
    <p>This is a reminder that <strong>${escapeHtml(urgency)}</strong>.</p>
    <table style="border-collapse:collapse;margin:16px 0;font-size:14px">
      <tr><td style="padding:4px 12px 4px 0;color:#666">Licence / CM/L</td><td style="padding:4px 0"><strong>${escapeHtml(cmL || "—")}</strong></td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#666">IS Number</td><td style="padding:4px 0">${escapeHtml(isLabel || "—")}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#666">Validity Date</td><td style="padding:4px 0">${escapeHtml(validityLabel || "—")}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#666">Status</td><td style="padding:4px 0">${escapeHtml(statusLabel)}</td></tr>
    </table>
    <p>${escapeHtml(actionLine)}</p>
    <p>If you have already renewed, please share the updated validity date with us.</p>
    <p>Regards,<br/>Quality Engineering Consultancy<br/><a href="mailto:info@qengineering.in">info@qengineering.in</a></p>
  `.trim();

  return { subject, text, html };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Email the client a licence-status reminder (Operative / Deferred / Expired / Stop Marking).
 */
export async function sendRenewalReminder(
  projectId: string,
): Promise<{ ok: true; to: string } | { ok: false; error: string }> {
  const id = (projectId ?? "").trim();
  if (!id) return { ok: false, error: "Missing project id." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bis_projects")
    .select(
      "id, status, project_kind, cm_l_digits, license_validity_date, client_id, clients(name, company_name, email), is_codes(is_number, revision_year)",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Project not found." };

  const clientsRaw = data.clients as
    | { name?: string | null; company_name?: string | null; email?: string | null }
    | { name?: string | null; company_name?: string | null; email?: string | null }[]
    | null;
  const client = Array.isArray(clientsRaw) ? clientsRaw[0] : clientsRaw;
  const to = (client?.email ?? "").trim();
  if (!to) {
    return {
      ok: false,
      error: "No email address on this client. Add an email in Client Master first.",
    };
  }

  const isCodesRaw = data.is_codes as
    | { is_number?: string | null; revision_year?: number | null }
    | { is_number?: string | null; revision_year?: number | null }[]
    | null;
  const isCode = Array.isArray(isCodesRaw) ? isCodesRaw[0] : isCodesRaw;
  const isLabel = isCode?.is_number
    ? isCode.revision_year
      ? `${isCode.is_number}: ${isCode.revision_year}`
      : String(isCode.is_number)
    : "—";

  const projectKind = (data.project_kind as string | null) ?? "licence";
  const validity = (data.license_validity_date as string | null) ?? null;
  const projectStatus = (data.status as string | null) ?? "";

  const cmL = formatCmDisplay(projectKind, data.cm_l_digits as string | null);
  const statusLabel = computeLicenseDisplayStatus(projectKind, validity, projectStatus);
  const days = daysUntilValidity(validity);
  const clientName =
    (client?.company_name ?? client?.name ?? "Sir/Madam").trim() || "Sir/Madam";

  const mail = buildRenewalReminderEmail({
    clientName,
    cmL,
    isLabel,
    validityLabel: formatDisplayDate(validity),
    statusLabel,
    days,
    projectStatus,
  });

  try {
    await sendSystemEmail({
      to,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    });
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to send email.",
    };
  }

  return { ok: true, to };
}
