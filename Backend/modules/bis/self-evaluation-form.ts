import type { Cmpf307BrandStored, Cmpf307Stored } from "@backend/modules/bis/cmpf-307";
import { brandRowHasContent } from "@backend/modules/bis/cmpf-307";
import type { RawMaterialStored } from "@backend/modules/bis/raw-material-details";
import { rowHasContent as rawMaterialRowHasContent } from "@backend/modules/bis/raw-material-details";
import {
  rowHasContent as technicalStaffRowHasContent,
  type TechnicalStaffStored,
} from "@backend/modules/bis/technical-staff";
import type { TopManagementStored } from "@backend/modules/bis/top-management";
import { resolvePrimaryTopManagementPerson } from "@backend/modules/bis/top-management";
import { formatDisplayDate } from "@backend/shared/format-date";

export type SelfEvaluationFormStored = {
  signatory_name: string;
  signatory_designation: string;
  sign_place: string;
  sign_date: string;
  plant_layout: string;
  packaging_marking: SefPackagingMarkingRow[];
};

export type SefPackagingMarkingRow = {
  label: string;
  value: string;
};

export type SefQcStaffRow = {
  person_name: string;
  designation: string;
  qualification: string;
  experience: string;
};

export function defaultSelfEvaluationFormDocument(): SelfEvaluationFormStored {
  return {
    signatory_name: "",
    signatory_designation: "",
    sign_place: "",
    sign_date: "",
    plant_layout: "Enclosed",
    packaging_marking: [],
  };
}

function packagingMarkingRowHasContent(row: SefPackagingMarkingRow): boolean {
  return row.label.trim().length > 0 && row.value.trim().length > 0;
}

export function documentHasContent(doc: SelfEvaluationFormStored): boolean {
  return (
    doc.signatory_name.trim().length > 0 ||
    doc.signatory_designation.trim().length > 0 ||
    doc.sign_place.trim().length > 0 ||
    doc.sign_date.trim().length > 0 ||
    (doc.plant_layout.trim().length > 0 && doc.plant_layout.trim() !== "Enclosed") ||
    doc.packaging_marking.some(packagingMarkingRowHasContent)
  );
}

function parsePackagingMarkingRows(raw: unknown): SefPackagingMarkingRow[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      return {
        label: String(row.label ?? "").trim(),
        value: String(row.value ?? "").trim(),
      };
    })
    .filter((row): row is SefPackagingMarkingRow => row !== null && row.label.length > 0);
}

export function parseSelfEvaluationForm(raw: unknown): SelfEvaluationFormStored {
  if (!raw || typeof raw !== "object") return defaultSelfEvaluationFormDocument();
  const r = raw as Record<string, unknown>;
  const plant = String(r.plant_layout ?? "").trim();
  return {
    signatory_name: String(r.signatory_name ?? "").trim(),
    signatory_designation: String(r.signatory_designation ?? "").trim(),
    sign_place: String(r.sign_place ?? "").trim(),
    sign_date: String(r.sign_date ?? "").trim(),
    plant_layout: plant || "Enclosed",
    packaging_marking: parsePackagingMarkingRows(r.packaging_marking),
  };
}

function formatExperienceYears(years: string): string {
  const v = years.trim();
  if (!v) return "";
  if (/year/i.test(v)) return v;
  return `${v} Years`;
}

function isQualityControlInchargeDesignation(designation: string): boolean {
  const d = designation.trim().toLowerCase();
  if (!d) return false;
  return (
    d.includes("quality control") ||
    d.includes("qc incharge") ||
    d.includes("q.c. incharge") ||
    d === "qci"
  );
}

export function buildSefRawMaterialRows(rows: RawMaterialStored[]): RawMaterialStored[] {
  return rows.filter(rawMaterialRowHasContent);
}

function sefQcStaffRowHasContent(row: SefQcStaffRow): boolean {
  return (
    row.person_name.trim().length > 0 ||
    row.designation.trim().length > 0 ||
    row.qualification.trim().length > 0 ||
    row.experience.trim().length > 0
  );
}

export function buildSefQcStaffRows(staff: TechnicalStaffStored[]): SefQcStaffRow[] {
  const filled = staff.filter(technicalStaffRowHasContent);
  const ordered = [...filled];
  const qcIndex = ordered.findIndex((row) =>
    isQualityControlInchargeDesignation(row.designation),
  );
  if (qcIndex > 0) {
    const [qcRow] = ordered.splice(qcIndex, 1);
    ordered.unshift(qcRow);
  }

  const mapped: SefQcStaffRow[] = ordered.map((row) => ({
    person_name: row.person_name.trim(),
    designation: row.designation.trim(),
    qualification: row.educational_qualification.trim(),
    experience: formatExperienceYears(row.experience_years),
  }));

  return mapped.filter(sefQcStaffRowHasContent);
}

export function buildSefBrandRows(cmpf307: Cmpf307Stored): Cmpf307BrandStored[] {
  return cmpf307.brands.filter(brandRowHasContent);
}

export function resolvePackagingMarkingRows(markingClause: string): SefPackagingMarkingRow[] {
  const markingRef = markingClause.trim() || "Marking Clause";

  return [
    { label: "Nature of Packaging", value: "Pieces" },
    {
      label: "Quantity Per Package",
      value: "As per Customer Requirement after GOL",
    },
    {
      label: "Marking on Article",
      value: `As per ${markingRef} after GOL`,
    },
    { label: "Method of Marking", value: "Marking by Tag after GOL" },
    { label: "Form of Label(s)", value: "Attached after GOL" },
    {
      label: "Batch OR Code Number for Identification",
      value: "Batch Number Will be Provided After GOL",
    },
    {
      label:
        "In What Manner Marking Differs from the Provisions in the IS Specification",
      value:
        "Immediate Stop Marking & Take Corrective Action Intend to Follow All the Specific Requirements as per",
    },
  ];
}

export function resolveSelfEvaluationPackagingMarking(
  doc: SelfEvaluationFormStored,
  markingClause: string,
): SefPackagingMarkingRow[] {
  const defaults = resolvePackagingMarkingRows(markingClause);
  const stored = doc.packaging_marking ?? [];
  if (!stored.some((row) => row.value.trim().length > 0)) {
    return defaults;
  }

  return defaults.map((defaultRow, index) => {
    const byLabel = stored.find((row) => row.label === defaultRow.label);
    const byIndex = stored[index];
    const value = (byLabel?.value ?? byIndex?.value ?? defaultRow.value).trim();
    return {
      label: defaultRow.label,
      value: value || defaultRow.value,
    };
  });
}

export function resolveSelfEvaluationFormDocument(input: {
  contactPerson: string | null;
  topManagement: TopManagementStored[];
  city: string;
  dateOfApplication: string;
  plantLayout?: string;
}): SelfEvaluationFormStored {
  const primary = resolvePrimaryTopManagementPerson(input.topManagement);
  const signatory =
    primary.person_name || (input.contactPerson ?? "").trim();
  const signDate = input.dateOfApplication.trim()
    ? formatDisplayDate(input.dateOfApplication, "")
    : "";

  return {
    signatory_name: signatory,
    signatory_designation: primary.designation,
    sign_place: input.city.trim(),
    sign_date: signDate,
    plant_layout: input.plantLayout?.trim() || "Enclosed",
    packaging_marking: [],
  };
}

export const SEF_BRAND_DECLARATION_POINTS = [
  "Other Brand Names / Trade – Mark(s) used for the same product marketed without BIS Standard Mark. Give reasons.",
  "In case Brand Names / Trade – Mark(s) of any other party/manufacturer is being used for purposes of the above, give the design depiction of the Brand Names / Trade – Mark(s) and copy of the agreement authorizing the use of the same.",
  "We undertake to inform BIS in advance as and when we propose to use any other Brand Names / Trade – Mark(s) in conjunction with the operation of the BIS Certification Scheme.",
  "We also undertake that, as far as possible, the entire production which conforms to the ISS shall be marked with the BIS Mark, irrespective of the Brand Names / Trade – Mark(s) used.",
  "I / We understand that the above has been given only as information to BIS, that BIS has no role in permitting/approving of any Brand Name or Trade – Mark(s), that this is not in any way be interpreted to mean that BIS has permitted / approved the use of the Brand Names and Trade Marks listed above, and that the responsibility is entirely mine / ours.",
] as const;

export const SEF_FINAL_DECLARATION =
  "The information given in this report are true to the best of my knowledge and belief. I shall be responsible if any misleading information has been given in this report and the application shall be liable for rejection if wrong information has been given. If the licence is granted on the basis of information which is found to be incorrect later, the licence shall be liable for cancellation.";
