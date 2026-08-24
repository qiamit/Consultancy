"use client";

import { createClient } from "@backend/db/supabase/client";
import { DOCUMENTS_BUCKET } from "@backend/modules/storage/documents";
import { printSettingsFromRow, type PrintCompanyInfo, type PrintSettings } from "@backend/modules/print/types";
import { defaultOslSamplePrintSettings } from "@backend/modules/print/osl-sample-requirements";

function s(row: Record<string, unknown> | null | undefined, key: string): string {
  if (!row) return "";
  const v = row[key];
  return typeof v === "string" ? v.trim() : "";
}

async function signedImageUrl(
  supabase: ReturnType<typeof createClient>,
  path: string,
): Promise<string | null> {
  if (!path.trim()) return null;
  const { data, error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(path.trim(), 3600);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

/** Load company_settings print defaults and letterhead asset URLs for client-side print preview. */
export async function loadCompanyPrintContext(): Promise<{
  printSettings: PrintSettings;
  assetUrls: Pick<
    PrintCompanyInfo,
    "logo_url" | "letterhead_upper_url" | "letterhead_lower_url" | "seal_sign_url"
  >;
}> {
  const defaults = defaultOslSamplePrintSettings();
  const supabase = createClient();
  const { data } = await supabase.from("company_settings").select("*").eq("id", 1).maybeSingle();
  const row = (data ?? null) as Record<string, unknown> | null;

  if (!row) {
    return {
      printSettings: defaults,
      assetUrls: {
        logo_url: null,
        letterhead_upper_url: null,
        letterhead_lower_url: null,
        seal_sign_url: null,
      },
    };
  }

  const fromDb = printSettingsFromRow(row);
  const printSettings: PrintSettings = {
    ...defaults,
    ...fromDb,
    font_family: fromDb.font_family || defaults.font_family,
    show_letterhead: fromDb.show_letterhead ?? defaults.show_letterhead,
    letterhead_layout: fromDb.letterhead_layout || defaults.letterhead_layout,
    show_footer_line: defaults.show_footer_line,
    show_page_numbers: fromDb.show_page_numbers ?? defaults.show_page_numbers,
  };

  const [logo_url, letterhead_upper_url, letterhead_lower_url, seal_sign_url] = await Promise.all([
    signedImageUrl(supabase, s(row, "logo_path")),
    signedImageUrl(supabase, s(row, "letterhead_upper_path")),
    signedImageUrl(supabase, s(row, "letterhead_lower_path")),
    signedImageUrl(supabase, s(row, "seal_sign_image_path")),
  ]);

  return {
    printSettings,
    assetUrls: { logo_url, letterhead_upper_url, letterhead_lower_url, seal_sign_url },
  };
}
