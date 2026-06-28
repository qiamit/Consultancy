import type { TopManagementStored } from "@/lib/top-management";
import { resolvePrimaryTopManagementPerson } from "@/lib/top-management";

export type Cmpf310Stored = {
  reference_letter_no: string;
  reference_letter_date: string;
  unit: string;
  firm_scale: string;
  unit_rate_rs: string;
  marking_fee_rs: string;
  signatory_name: string;
  signatory_designation: string;
};

export type IsCodeMarkingFeeSource = {
  unit_of_is: string | null;
  mmf_large_scale: number | null;
  mmf_medium_scale: number | null;
  mmf_small_scale: number | null;
  mmf_micro_scale: number | null;
  slab_1_rate: number | null;
};

export function defaultCmpf310Document(): Cmpf310Stored {
  return {
    reference_letter_no: "",
    reference_letter_date: "",
    unit: "",
    firm_scale: "",
    unit_rate_rs: "",
    marking_fee_rs: "",
    signatory_name: "",
    signatory_designation: "",
  };
}

export function documentHasContent(doc: Cmpf310Stored): boolean {
  return (
    doc.reference_letter_no.trim().length > 0 ||
    doc.reference_letter_date.trim().length > 0 ||
    doc.unit.trim().length > 0 ||
    doc.firm_scale.trim().length > 0 ||
    doc.unit_rate_rs.trim().length > 0 ||
    doc.marking_fee_rs.trim().length > 0 ||
    doc.signatory_name.trim().length > 0 ||
    doc.signatory_designation.trim().length > 0
  );
}

export function parseCmpf310(raw: unknown): Cmpf310Stored {
  if (!raw || typeof raw !== "object") return defaultCmpf310Document();
  const r = raw as Record<string, unknown>;
  return {
    reference_letter_no: String(r.reference_letter_no ?? "").trim(),
    reference_letter_date: String(r.reference_letter_date ?? "").trim(),
    unit: String(r.unit ?? "").trim(),
    firm_scale: String(r.firm_scale ?? "").trim(),
    unit_rate_rs: String(r.unit_rate_rs ?? "").trim(),
    marking_fee_rs: String(r.marking_fee_rs ?? "").trim(),
    signatory_name: String(r.signatory_name ?? "").trim(),
    signatory_designation: String(r.signatory_designation ?? "").trim(),
  };
}

function mmfAmountForScale(scale: string, isCode: IsCodeMarkingFeeSource): number | null {
  const s = scale.trim().toLowerCase();
  if (!s) return null;
  if (s.includes("micro")) return isCode.mmf_micro_scale;
  if (s.includes("small")) return isCode.mmf_small_scale;
  if (s.includes("medium")) return isCode.mmf_medium_scale;
  if (s.includes("large")) return isCode.mmf_large_scale;
  return null;
}

function formatMoneyInput(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(Number(n))) return "";
  return String(Number(n));
}

function formatUnitDisplay(unitOfIs: string | null | undefined): string {
  const u = (unitOfIs ?? "").trim();
  if (!u) return "1 Tonne";
  if (/^\d/.test(u)) return u;
  return `1 ${u}`;
}

export function resolveCmpf310Defaults(input: {
  isCode: IsCodeMarkingFeeSource | null;
  companyScale: string | null;
  contactPerson: string | null;
  topManagement?: TopManagementStored[];
}): Partial<Cmpf310Stored> {
  const scale = (input.companyScale ?? "").trim();
  const isCode = input.isCode;
  const markingFee = isCode && scale ? mmfAmountForScale(scale, isCode) : null;
  const unitRate = isCode?.slab_1_rate ?? null;
  const primary = resolvePrimaryTopManagementPerson(input.topManagement ?? []);

  return {
    unit: isCode ? formatUnitDisplay(isCode.unit_of_is) : "",
    firm_scale: scale,
    unit_rate_rs: formatMoneyInput(unitRate),
    marking_fee_rs: formatMoneyInput(markingFee),
    signatory_name: primary.person_name || (input.contactPerson ?? "").trim(),
    signatory_designation: primary.designation,
  };
}

/** Build CMPF 310 document entirely from client, IS Code, and top management data. */
export function resolveCmpf310Document(input: {
  isCode: IsCodeMarkingFeeSource | null;
  companyScale: string | null;
  contactPerson: string | null;
  topManagement: TopManagementStored[];
}): Cmpf310Stored {
  const defaults = resolveCmpf310Defaults(input);
  return {
    reference_letter_no: "",
    reference_letter_date: "",
    unit: defaults.unit ?? "",
    firm_scale: defaults.firm_scale ?? "",
    unit_rate_rs: defaults.unit_rate_rs ?? "",
    marking_fee_rs: defaults.marking_fee_rs ?? "",
    signatory_name: defaults.signatory_name ?? "",
    signatory_designation: defaults.signatory_designation ?? "",
  };
}

export function mergeCmpf310WithDefaults(
  stored: Cmpf310Stored,
  defaults: Partial<Cmpf310Stored>,
): Cmpf310Stored {
  return {
    reference_letter_no: stored.reference_letter_no || defaults.reference_letter_no || "",
    reference_letter_date: stored.reference_letter_date || defaults.reference_letter_date || "",
    unit: stored.unit || defaults.unit || "",
    firm_scale: stored.firm_scale || defaults.firm_scale || "",
    unit_rate_rs: stored.unit_rate_rs || defaults.unit_rate_rs || "",
    marking_fee_rs: stored.marking_fee_rs || defaults.marking_fee_rs || "",
    signatory_name: stored.signatory_name || defaults.signatory_name || "",
    signatory_designation: stored.signatory_designation || defaults.signatory_designation || "",
  };
}

export function formatCmpf310RupeeDisplay(raw: string): string {
  const v = raw.trim().replace(/[^\d.]/g, "");
  if (!v) return "—";
  const n = Number(v);
  if (!Number.isFinite(n)) return raw.trim() || "—";
  return `₹ ${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatCmpf310RupeeInline(raw: string): string {
  const v = raw.trim().replace(/[^\d.]/g, "");
  if (!v) return "—";
  const n = Number(v);
  if (!Number.isFinite(n)) return raw.trim() || "—";
  return `Rs. ${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}/-`;
}
