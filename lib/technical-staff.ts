export type TechnicalStaffStored = {
  person_name: string;
  designation: string;
  educational_qualification: string;
  experience_years: string;
  appointment_letter: string;
  educational_certificate: string;
  photo: string;
  seal_sign: string;
};

export type TechnicalStaffRow = TechnicalStaffStored & { id: string };

export function defaultTechnicalStaffEntry(): TechnicalStaffStored {
  return {
    person_name: "",
    designation: "",
    educational_qualification: "",
    experience_years: "",
    appointment_letter: "",
    educational_certificate: "",
    photo: "",
    seal_sign: "",
  };
}

let techStaffRowSeq = 0;

export function createTechnicalStaffRow(): TechnicalStaffRow {
  techStaffRowSeq += 1;
  return {
    id: `tech-staff-${Date.now()}-${techStaffRowSeq}`,
    ...defaultTechnicalStaffEntry(),
  };
}

export function defaultTechnicalStaffRows(): TechnicalStaffRow[] {
  return [createTechnicalStaffRow()];
}

export function rowHasContent(row: TechnicalStaffStored): boolean {
  return (
    row.person_name.trim().length > 0 ||
    row.designation.trim().length > 0 ||
    row.educational_qualification.trim().length > 0 ||
    row.experience_years.trim().length > 0 ||
    row.appointment_letter.trim().length > 0 ||
    row.educational_certificate.trim().length > 0 ||
    row.photo.trim().length > 0 ||
    row.seal_sign.trim().length > 0
  );
}

export function parseTechnicalStaff(raw: unknown): TechnicalStaffStored[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const r = item as Record<string, unknown>;
      return {
        person_name: String(r.person_name ?? "").trim(),
        designation: String(r.designation ?? "").trim(),
        educational_qualification: String(r.educational_qualification ?? "").trim(),
        experience_years: String(r.experience_years ?? "").trim(),
        appointment_letter: String(r.appointment_letter ?? "").trim(),
        educational_certificate: String(r.educational_certificate ?? "").trim(),
        photo: String(r.photo ?? "").trim(),
        seal_sign: String(r.seal_sign ?? "").trim(),
      };
    })
    .filter((r): r is TechnicalStaffStored => r !== null);
}

export function editorRowsFromStored(
  stored: TechnicalStaffStored[],
): TechnicalStaffRow[] {
  return stored.filter(rowHasContent).map((r, i) => ({
    id: `tech-staff-loaded-${i}`,
    ...r,
  }));
}

export function storedFromEditor(rows: TechnicalStaffRow[]): TechnicalStaffStored[] {
  return rows
    .map(
      ({
        person_name,
        designation,
        educational_qualification,
        experience_years,
        appointment_letter,
        educational_certificate,
        photo,
        seal_sign,
      }) => ({
        person_name,
        designation,
        educational_qualification,
        experience_years,
        appointment_letter,
        educational_certificate,
        photo,
        seal_sign,
      }),
    )
    .filter(rowHasContent);
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

/** First technical staff row whose designation matches Quality Control Incharge. */
export function resolveQualityControlIncharge(staff: TechnicalStaffStored[]): {
  name: string;
  designation: string;
} {
  const match = staff
    .filter(rowHasContent)
    .find((row) => isQualityControlInchargeDesignation(row.designation));
  if (!match) return { name: "", designation: "" };
  return {
    name: match.person_name.trim(),
    designation: match.designation.trim(),
  };
}
