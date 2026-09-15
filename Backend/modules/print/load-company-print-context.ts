"use client";

import { createClient } from "@backend/db/client/client";
import { printSettingsFromRow, type PrintCompanyInfo, type PrintSettings } from "@backend/modules/print/types";
import { defaultOslSamplePrintSettings } from "@backend/modules/print/osl-sample-requirements";

/**
 * Load print defaults for Client Application documents (OSL, Top Management, CMPF, …).
 *
 * Page style (fonts, margins, colours) may come from consultancy `company_settings`,
 * but letterhead / footer branding must never use the consultant firm — those
 * documents are printed on the applicant (client) letterhead built from letter data.
 */
export async function loadCompanyPrintContext(): Promise<{
  printSettings: PrintSettings;
  assetUrls: Pick<
    PrintCompanyInfo,
    "logo_url" | "letterhead_upper_url" | "letterhead_lower_url" | "seal_sign_url"
  >;
}> {
  const defaults = defaultOslSamplePrintSettings();
  const emptyAssets = {
    logo_url: null,
    letterhead_upper_url: null,
    letterhead_lower_url: null,
    seal_sign_url: null,
  } as const;

  const supabase = createClient();
  const { data } = await supabase.from("company_settings").select("*").eq("id", 1).maybeSingle();
  const row = (data ?? null) as Record<string, unknown> | null;

  if (!row) {
    return {
      printSettings: defaults,
      assetUrls: { ...emptyAssets },
    };
  }

  const fromDb = printSettingsFromRow(row);
  const printSettings: PrintSettings = {
    ...defaults,
    ...fromDb,
    font_family: fromDb.font_family || defaults.font_family,
    show_letterhead: fromDb.show_letterhead ?? defaults.show_letterhead,
    letterhead_layout: fromDb.letterhead_layout || defaults.letterhead_layout,
    letterhead_show_mobile:
      fromDb.letterhead_show_mobile ?? fromDb.letterhead_show_contact,
    letterhead_show_email:
      fromDb.letterhead_show_email ?? fromDb.letterhead_show_contact,
    show_footer_line: defaults.show_footer_line,
    show_page_numbers: fromDb.show_page_numbers ?? defaults.show_page_numbers,
    // Strip consultant firm branding — applicant name/GST/address come from letter data.
    letterhead_tagline: "",
    footer_left: "",
    footer_center: "",
    footer_right: "",
  };

  return {
    printSettings,
    assetUrls: { ...emptyAssets },
  };
}
