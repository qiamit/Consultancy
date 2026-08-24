export type TechnicalStaffTableColumnKey =
  | "sr_no"
  | "person_name"
  | "designation"
  | "educational_qualification"
  | "experience_years"
  | "appointment_letter"
  | "educational_certificate"
  | "photo"
  | "seal_sign";

export const TECHNICAL_STAFF_TABLE_COLUMN_ORDER: TechnicalStaffTableColumnKey[] = [
  "sr_no",
  "person_name",
  "designation",
  "educational_qualification",
  "experience_years",
  "appointment_letter",
  "educational_certificate",
  "photo",
  "seal_sign",
];

/** Columns shown in print preview and exported letter table (no document attachments). */
export const DEFAULT_TECHNICAL_STAFF_TABLE_COLUMNS: TechnicalStaffTableColumnKey[] = [
  "sr_no",
  "person_name",
  "designation",
  "educational_qualification",
  "experience_years",
];

export const TECHNICAL_STAFF_TABLE_COLUMN_OPTIONS: {
  key: TechnicalStaffTableColumnKey;
  label: string;
  headerHtml: string;
  widthWeight?: number;
}[] = [
  { key: "sr_no", label: "Sr No", headerHtml: "Sr<br/>No", widthWeight: 5 },
  { key: "person_name", label: "Name of Person", headerHtml: "Name of Person", widthWeight: 14 },
  { key: "designation", label: "Designation", headerHtml: "Designation", widthWeight: 12 },
  {
    key: "educational_qualification",
    label: "Educational Qualification",
    headerHtml: "Educational<br/>Qualification",
    widthWeight: 14,
  },
  {
    key: "experience_years",
    label: "Experience in Year",
    headerHtml: "Experience<br/>in Year",
    widthWeight: 10,
  },
  {
    key: "appointment_letter",
    label: "Appointment Letter",
    headerHtml: "Appointment<br/>Letter",
    widthWeight: 12,
  },
  {
    key: "educational_certificate",
    label: "Educational Certificate",
    headerHtml: "Educational<br/>Certificate",
    widthWeight: 12,
  },
  { key: "photo", label: "Photo", headerHtml: "Photo", widthWeight: 8 },
  {
    key: "seal_sign",
    label: "Seal & Sign",
    headerHtml: "Seal &amp;<br/>Sign",
    widthWeight: 10,
  },
];

export function technicalStaffColumnWidthPct(
  key: TechnicalStaffTableColumnKey,
  visibleKeys: TechnicalStaffTableColumnKey[],
): string {
  const defs = TECHNICAL_STAFF_TABLE_COLUMN_OPTIONS.filter((c) =>
    visibleKeys.includes(c.key),
  );
  const total = defs.reduce((sum, c) => sum + (c.widthWeight ?? 10), 0);
  const def = defs.find((c) => c.key === key);
  const weight = def?.widthWeight ?? 10;
  return `${((weight / total) * 100).toFixed(2)}%`;
}
