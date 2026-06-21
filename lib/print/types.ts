export interface PrintSettings {
  paper_size: "A4" | "A5" | "Letter" | "Legal";
  orientation: "portrait" | "landscape";
  margin_top: number;
  margin_bottom: number;
  margin_left: number;
  margin_right: number;
  font_family: string;
  primary_color: string;

  show_letterhead: boolean;
  letterhead_layout: "logo-left" | "logo-center" | "logo-right" | "logo-na";
  letterhead_tagline: string;
  letterhead_show_address: boolean;
  letterhead_show_contact: boolean;
  letterhead_show_gst: boolean;

  footer_left: string;
  footer_center: string;
  footer_right: string;
  show_page_numbers: boolean;
  show_footer_line: boolean;

  font_size: number;
  show_watermark: boolean;
  watermark_text: string;
  table_compact: boolean;
  table_show_description: boolean;
  title_font_size: number;
  accent_color: string;
}

export interface PrintCompanyInfo {
  name: string;
  address: string;
  city: string;
  state: string;
  pin_code: string;
  country: string;
  gst_number: string;
  email: string;
  phone: string;
  contact_person: string;
  logo_url: string | null;
  website: string;
  letterhead_upper_url: string | null;
  letterhead_lower_url: string | null;
  seal_sign_url: string | null;
}

export const DEFAULT_PRINT_SETTINGS: PrintSettings = {
  paper_size: "A4",
  orientation: "portrait",
  margin_top: 12,
  margin_bottom: 12,
  margin_left: 12,
  margin_right: 12,
  font_family: "Arial",
  primary_color: "#1e3a8a",
  show_letterhead: true,
  letterhead_layout: "logo-left",
  letterhead_tagline: "",
  letterhead_show_address: true,
  letterhead_show_contact: true,
  letterhead_show_gst: true,
  footer_left: "",
  footer_center: "",
  footer_right: "Page {page} of {total}",
  show_page_numbers: true,
  show_footer_line: true,
  font_size: 11,
  show_watermark: false,
  watermark_text: "DRAFT",
  table_compact: false,
  table_show_description: true,
  title_font_size: 30,
  accent_color: "",
};

/** Extract PrintSettings from the raw company_settings DB row */
export function printSettingsFromRow(
  r: Record<string, unknown> | null | undefined,
): PrintSettings {
  if (!r) return DEFAULT_PRINT_SETTINGS;
  const row = r;
  function s(k: string, fallback: string): string {
    const v = row[k];
    return v != null && String(v).trim() ? String(v).trim() : fallback;
  }
  function b(k: string, fallback: boolean): boolean {
    const v = row[k];
    if (v == null) return fallback;
    if (typeof v === "boolean") return v;
    return String(v) === "true";
  }
  function n(k: string, fallback: number): number {
    const v = Number(row[k]);
    return Number.isFinite(v) ? v : fallback;
  }
  return {
    paper_size: s("print_paper_size", "A4") as PrintSettings["paper_size"],
    orientation: s("print_orientation", "portrait") as PrintSettings["orientation"],
    margin_top: n("print_margin_top", 12),
    margin_bottom: n("print_margin_bottom", 12),
    margin_left: n("print_margin_left", 12),
    margin_right: n("print_margin_right", 12),
    font_family: s("print_font_family", "Arial"),
    primary_color: s("print_primary_color", "#1e3a8a"),
    show_letterhead: b("print_show_letterhead", true),
    letterhead_layout: s("print_letterhead_layout", "logo-left") as PrintSettings["letterhead_layout"],
    letterhead_tagline: s("print_letterhead_tagline", ""),
    letterhead_show_address: b("print_letterhead_show_address", true),
    letterhead_show_contact: b("print_letterhead_show_contact", true),
    letterhead_show_gst: b("print_letterhead_show_gst", true),
    footer_left: s("print_footer_left", ""),
    footer_center: s("print_footer_center", ""),
    footer_right: s("print_footer_right", "Page {page} of {total}"),
    show_page_numbers: b("print_show_page_numbers", true),
    show_footer_line: b("print_show_footer_line", true),
    font_size: n("print_font_size", 11),
    show_watermark: b("print_show_watermark", false),
    watermark_text: s("print_watermark_text", "DRAFT"),
    table_compact: b("print_table_compact", false),
    table_show_description: b("print_table_show_description", true),
    title_font_size: n("print_title_font_size", 30),
    accent_color: s("print_accent_color", ""),
  };
}
