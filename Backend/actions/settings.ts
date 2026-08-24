"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  DOCUMENTS_BUCKET,
  companyAssetBucketPath,
} from "@backend/modules/storage/documents";
import { createClient } from "@backend/db/supabase/server";

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function nullableStr(formData: FormData, key: string) {
  const s = str(formData, key);
  return s ? s : null;
}

type ExistingCompany = Record<string, unknown>;

function prevPath(prev: ExistingCompany, key: string): string | null {
  const v = prev[key];
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s : null;
}

async function uploadIfPresent(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  formData: FormData,
  fieldName: string,
  slug: string,
): Promise<{ ok: true; path: string } | { ok: false; message: string } | null> {
  const file = formData.get(fieldName);
  if (!(file instanceof File) || file.size === 0) return null;
  const path = companyAssetBucketPath(userId, slug, file.name);
  const { error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .upload(path, file, { upsert: true });
  if (error) return { ok: false, message: error.message };
  return { ok: true, path };
}

async function maybeRemovePath(
  supabase: Awaited<ReturnType<typeof createClient>>,
  oldPath: string | null | undefined,
  newPath: string | null | undefined,
) {
  if (!oldPath || !newPath || oldPath === newPath) return;
  await supabase.storage.from(DOCUMENTS_BUCKET).remove([oldPath]).catch(() => undefined);
}

export async function updateCompanySettings(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: existing } = await supabase
    .from("company_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();
  const prev = (existing ?? {}) as ExistingCompany;

  const uploads: [string, string, string][] = [
    ["file_company_logo", "logo", "logo_path"],
    ["file_letterhead_upper", "letterhead_upper", "letterhead_upper_path"],
    ["file_letterhead_lower", "letterhead_lower", "letterhead_lower_path"],
    ["file_seal_sign", "seal_sign", "seal_sign_image_path"],
    ["file_bank_upi_qr", "bank_upi_qr", "bank_upi_qr_path"],
    ["file_bank_cheque", "bank_cheque", "bank_cheque_image_path"],
  ];

  let logo_path = nullableStr(formData, "logo_path") ?? prevPath(prev, "logo_path");
  let letterhead_upper_path =
    nullableStr(formData, "letterhead_upper_path") ?? prevPath(prev, "letterhead_upper_path");
  let letterhead_lower_path =
    nullableStr(formData, "letterhead_lower_path") ?? prevPath(prev, "letterhead_lower_path");
  let seal_sign_image_path =
    nullableStr(formData, "seal_sign_image_path") ?? prevPath(prev, "seal_sign_image_path");
  let bank_upi_qr_path =
    nullableStr(formData, "bank_upi_qr_path") ?? prevPath(prev, "bank_upi_qr_path");
  let bank_cheque_image_path =
    nullableStr(formData, "bank_cheque_image_path") ?? prevPath(prev, "bank_cheque_image_path");

  for (const [field, slug, key] of uploads) {
    const res = await uploadIfPresent(supabase, user.id, formData, field, slug);
    if (res === null) continue;
    if (!res.ok) redirect("/dashboard/settings/company?error=upload");
    const old = prev[key] as string | null | undefined;
    if (key === "logo_path") {
      await maybeRemovePath(supabase, old, res.path);
      logo_path = res.path;
    } else if (key === "letterhead_upper_path") {
      await maybeRemovePath(supabase, old, res.path);
      letterhead_upper_path = res.path;
    } else if (key === "letterhead_lower_path") {
      await maybeRemovePath(supabase, old, res.path);
      letterhead_lower_path = res.path;
    } else if (key === "seal_sign_image_path") {
      await maybeRemovePath(supabase, old, res.path);
      seal_sign_image_path = res.path;
    } else if (key === "bank_upi_qr_path") {
      await maybeRemovePath(supabase, old, res.path);
      bank_upi_qr_path = res.path;
    } else if (key === "bank_cheque_image_path") {
      await maybeRemovePath(supabase, old, res.path);
      bank_cheque_image_path = res.path;
    }
  }

  const { error } = await supabase.from("company_settings").upsert(
    {
      id: 1,
      company_name: nullableStr(formData, "company_name"),
      address: nullableStr(formData, "address"),
      gst_number: nullableStr(formData, "gst_number"),
      contact_person_name: nullableStr(formData, "contact_person_name"),
      email: nullableStr(formData, "email"),
      phone: nullableStr(formData, "phone"),
      company_city: str(formData, "company_city") || "Raipur",
      company_pin_code: str(formData, "company_pin_code") || "493221",
      company_state: str(formData, "company_state") || "Chhattisgarh",
      company_country: str(formData, "company_country") || "India",
      bank_account_holder_name: nullableStr(formData, "bank_account_holder_name"),
      bank_account_number: nullableStr(formData, "bank_account_number"),
      bank_branch_name: nullableStr(formData, "bank_branch_name"),
      bank_ifsc: nullableStr(formData, "bank_ifsc"),
      bank_swift: nullableStr(formData, "bank_swift"),
      bank_upi_id: nullableStr(formData, "bank_upi_id"),
      bank_upi_qr_path,
      bank_cheque_image_path,
      letterhead_upper_path,
      letterhead_lower_path,
      seal_sign_image_path,
      logo_path,
      website: nullableStr(formData, "website"),
      // Print & page settings
      print_paper_size: str(formData, "print_paper_size") || "A4",
      print_orientation: str(formData, "print_orientation") || "portrait",
      print_margin_top: Number(str(formData, "print_margin_top")) || 12,
      print_margin_bottom: Number(str(formData, "print_margin_bottom")) || 12,
      print_margin_left: Number(str(formData, "print_margin_left")) || 12,
      print_margin_right: Number(str(formData, "print_margin_right")) || 12,
      print_font_family: str(formData, "print_font_family") || "Arial",
      print_primary_color: str(formData, "print_primary_color") || "#1e3a8a",
      print_show_letterhead: formData.get("print_show_letterhead") === "on" || str(formData, "print_show_letterhead") === "true",
      print_letterhead_layout: str(formData, "print_letterhead_layout") || "logo-left",
      print_letterhead_tagline: nullableStr(formData, "print_letterhead_tagline"),
      print_letterhead_show_address: formData.get("print_letterhead_show_address") === "on" || str(formData, "print_letterhead_show_address") === "true",
      print_letterhead_show_contact: formData.get("print_letterhead_show_contact") === "on" || str(formData, "print_letterhead_show_contact") === "true",
      print_letterhead_show_gst: formData.get("print_letterhead_show_gst") === "on" || str(formData, "print_letterhead_show_gst") === "true",
      print_footer_left: nullableStr(formData, "print_footer_left"),
      print_footer_center: nullableStr(formData, "print_footer_center"),
      print_footer_right: str(formData, "print_footer_right") || "Page {page} of {total}",
      print_show_page_numbers: formData.get("print_show_page_numbers") === "on" || str(formData, "print_show_page_numbers") === "true",
      print_show_footer_line: formData.get("print_show_footer_line") === "on" || str(formData, "print_show_footer_line") === "true",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (error) redirect("/dashboard/settings/company?error=db");
  revalidatePath("/dashboard/settings/company");
  revalidatePath("/dashboard/finance", "layout");
  redirect("/dashboard/settings/company");
}

const APP_THEMES = new Set(["light", "dark", "system"]);
const TIME_FORMATS = new Set(["12h", "24h"]);
const DATE_FORMATS = new Set(["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD", "DD-MM-YYYY"]);

export async function updateAppSettings(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const site_title = str(formData, "site_title") || "Technical Consultancy";
  const document_number_prefix = str(formData, "document_number_prefix");
  const document_number_suffix = str(formData, "document_number_suffix");
  const reference_prefix = str(formData, "reference_prefix");
  const reference_suffix = str(formData, "reference_suffix");

  const themeRaw = str(formData, "app_theme") || "system";
  const app_theme = APP_THEMES.has(themeRaw) ? themeRaw : "system";

  const currencyCustom = str(formData, "app_currency_custom");
  const currencySelect = str(formData, "app_currency") || "INR";
  const app_currency = (currencyCustom || currencySelect).slice(0, 12).toUpperCase();

  const dateRaw = str(formData, "date_format") || "DD/MM/YYYY";
  const date_format = DATE_FORMATS.has(dateRaw) ? dateRaw : "DD/MM/YYYY";

  const timeRaw = str(formData, "time_format") || "24h";
  const time_format = TIME_FORMATS.has(timeRaw) ? timeRaw : "24h";

  const { error } = await supabase.from("app_settings").upsert(
    {
      id: 1,
      site_title,
      document_number_prefix: document_number_prefix,
      document_number_suffix: document_number_suffix,
      reference_prefix: reference_prefix,
      reference_suffix: reference_suffix,
      app_theme,
      app_currency: app_currency,
      date_format,
      time_format,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (error) redirect("/dashboard/settings/app?error=db");

  // Save the theme preference in a cookie so the server and head script can read it instantly on every page load
  try {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    cookieStore.set("theme", app_theme, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  } catch (cookieError) {
    console.error("Failed to set theme cookie:", cookieError);
  }

  revalidatePath("/dashboard/settings/app");
  revalidatePath("/");
  redirect("/dashboard/settings/app");
}

export async function updateServiceOffering(
  id: string,
  formData: FormData,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const name = str(formData, "name");
  if (!name) redirect("/dashboard/products?error=name");

  const { error } = await supabase
    .from("service_offerings")
    .update({
      name,
      category: nullableStr(formData, "category"),
      description: nullableStr(formData, "description"),
      is_active: formData.get("is_active") === "on",
      sort_order: Number(str(formData, "sort_order")) || 0,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) redirect("/dashboard/products?error=db");
  revalidatePath("/dashboard/products");
}
