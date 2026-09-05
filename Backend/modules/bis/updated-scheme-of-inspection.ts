export type SitTestRowKind = "data" | "section" | "group";

export type SitTestRow = {
  row_kind: SitTestRowKind;
  clause_no: string;
  requirement: string;
  test_methods_ref: string;
  equipment_req: string;
  sample_count: string;
  frequency: string;
  remarks: string;
};

export type UpdatedSchemeOfInspectionStored = {
  pm_reference: string;
  laboratory_text: string;
  test_records_text: string;
  labelling_marking_text: string;
  control_unit_text: string;
  levels_of_control_text: string;
  standard_mark_text: string;
  rejections_text: string;
  note_1: string;
  note_2: string;
  note_3: string;
  test_rows: SitTestRow[];
};

function sitDataRow(
  partial: Omit<SitTestRow, "row_kind"> & { row_kind?: SitTestRowKind },
): SitTestRow {
  return { row_kind: partial.row_kind ?? "data", ...partial };
}

/** One blank data row — default table seed for Updated Scheme of Inspection. */
export function emptySitTestRow(): SitTestRow {
  return sitDataRow({
    clause_no: "",
    requirement: "",
    test_methods_ref: "",
    equipment_req: "",
    sample_count: "",
    frequency: "",
    remarks: "",
  });
}

export function defaultSitTestRows(): SitTestRow[] {
  return [emptySitTestRow()];
}

/** @deprecated Use defaultSitTestRows() — sample IS 17631 seed removed. */
export function defaultSitTestRowsIs17631(): SitTestRow[] {
  return defaultSitTestRows();
}

export function defaultUpdatedSchemeOfInspectionDocument(): UpdatedSchemeOfInspectionStored {
  return {
    pm_reference: "",
    laboratory_text: "",
    test_records_text: "",
    labelling_marking_text: "",
    control_unit_text: "",
    levels_of_control_text: "",
    standard_mark_text: "",
    rejections_text: "",
    note_1: "",
    note_2: "",
    note_3: "",
    test_rows: defaultSitTestRows(),
  };
}

function sitRowHasContent(row: SitTestRow): boolean {
  return (
    row.clause_no.trim().length > 0 ||
    row.requirement.trim().length > 0 ||
    row.test_methods_ref.trim().length > 0 ||
    row.equipment_req.trim().length > 0 ||
    row.sample_count.trim().length > 0 ||
    row.frequency.trim().length > 0 ||
    row.remarks.trim().length > 0
  );
}

export function documentHasContent(doc: UpdatedSchemeOfInspectionStored): boolean {
  return (
    doc.pm_reference.trim().length > 0 ||
    doc.laboratory_text.trim().length > 0 ||
    doc.test_records_text.trim().length > 0 ||
    doc.labelling_marking_text.trim().length > 0 ||
    doc.control_unit_text.trim().length > 0 ||
    doc.levels_of_control_text.trim().length > 0 ||
    doc.standard_mark_text.trim().length > 0 ||
    doc.rejections_text.trim().length > 0 ||
    doc.note_1.trim().length > 0 ||
    doc.note_2.trim().length > 0 ||
    doc.note_3.trim().length > 0 ||
    doc.test_rows.some(sitRowHasContent)
  );
}

function parseSitTestRows(raw: unknown): SitTestRow[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const kind = row.row_kind;
      return {
        row_kind:
          kind === "section" || kind === "group" || kind === "data" ? kind : "data",
        clause_no: String(row.clause_no ?? "").trim(),
        requirement: String(row.requirement ?? "").trim(),
        test_methods_ref: String(row.test_methods_ref ?? "").trim(),
        equipment_req: String(row.equipment_req ?? "").trim(),
        sample_count: String(row.sample_count ?? "").trim(),
        frequency: String(row.frequency ?? "").trim(),
        remarks: String(row.remarks ?? "").trim(),
      } satisfies SitTestRow;
    })
    .filter((row): row is SitTestRow => row !== null);
}

export function parseUpdatedSchemeOfInspection(
  raw: unknown,
): UpdatedSchemeOfInspectionStored {
  if (!raw || typeof raw !== "object") return defaultUpdatedSchemeOfInspectionDocument();
  const r = raw as Record<string, unknown>;
  return {
    pm_reference: String(r.pm_reference ?? "").trim(),
    laboratory_text: String(r.laboratory_text ?? "").trim(),
    test_records_text: String(r.test_records_text ?? "").trim(),
    labelling_marking_text: String(r.labelling_marking_text ?? "").trim(),
    control_unit_text: String(r.control_unit_text ?? "").trim(),
    levels_of_control_text: String(r.levels_of_control_text ?? "").trim(),
    standard_mark_text: String(r.standard_mark_text ?? "").trim(),
    rejections_text: String(r.rejections_text ?? "").trim(),
    note_1: String(r.note_1 ?? "").trim(),
    note_2: String(r.note_2 ?? "").trim(),
    note_3: String(r.note_3 ?? "").trim(),
    test_rows: parseSitTestRows(r.test_rows),
  };
}

function formatIsStandardLabel(
  isNumber: string | null,
  isTitle: string | null,
  revisionYear: string | null,
): string {
  const num = (isNumber ?? "").trim();
  const year = (revisionYear ?? "").trim();
  if (num && year) return `IS ${num}:${year}`;
  const title = (isTitle ?? "").trim();
  if (num && title) return `IS ${num} — ${title}`;
  if (num) return `IS ${num}`;
  return "the applicable Indian Standard";
}

function formatPmReference(isNumber: string | null, revisionYear: string | null): string {
  const num = (isNumber ?? "").trim();
  const year = (revisionYear ?? "").trim();
  if (!num) return "PM/ IS __________/1/__________";
  return `PM/ IS ${num}/1/${year || "__________"}`;
}

export function resolveUpdatedSchemeOfInspectionDefaults(input: {
  isNumber: string | null;
  isTitle: string | null;
  revisionYear: string | null;
}): UpdatedSchemeOfInspectionStored {
  const isLabel = formatIsStandardLabel(input.isNumber, input.isTitle, input.revisionYear);
  const pmRef = formatPmReference(input.isNumber, input.revisionYear);

  return {
    pm_reference: pmRef,
    laboratory_text:
      "LABORATORY - A laboratory shall be maintained which shall be suitably equipped (as per the requirement given in column 2 of Table 1) and staffed, where different tests given in the specification shall be carried out in accordance with the methods given in the specification.\nThe manufacturer shall prepare a calibration plan for the test equipment.",
    test_records_text:
      "TEST RECORDS – The manufacturer shall maintain test records for the tests carried out to establish conformity.",
    labelling_marking_text: `LABELLING AND MARKING – As per the requirements of ${isLabel}.`,
    control_unit_text:
      "CONTROL UNIT – Work chair of the same design/model number manufactured from the same materials and same consignment of materials, in a week under similar conditions of manufacturing shall constitute a control unit.",
    levels_of_control_text:
      "LEVELS OF CONTROL - The tests as indicated in column 1 of Table 1 and the levels of control in column 3 of Table 1, shall be carried out on the whole production of the factory which is covered by this plan and appropriate records maintained in accordance with paragraph 2.0 above.",
    standard_mark_text:
      "All the production which conforms to the Indian Standard and covered by the licence should be marked with Standard Mark.",
    rejections_text:
      "REJECTIONS – Disposal of non-conforming product shall be done in such a way so as to ensure that there is no violation of provisions of BIS Act, 2016.",
    note_1: `Note-1: All applicable safety requirements as mentioned in clause 7 of ${isLabel} shall be carried out on the same sample and in the sequence as the clauses are numbered in this standard. Stability test shall be repeated also after durability test.`,
    note_2:
      "Note-2: Sub-contracting is permitted to a laboratory recognized by the Bureau or Government laboratories empanelled by the Bureau.",
    note_3:
      "Note-3: Levels of control given in column 3 are only recommendatory in nature. The manufacturer may define the control unit/batch/lot and submit his own levels of control in column 3 with proper justification for approval by BO Head.",
    test_rows: defaultSitTestRows(),
  };
}

export function mergeUpdatedSchemeOfInspectionWithDefaults(
  stored: UpdatedSchemeOfInspectionStored,
  defaults: UpdatedSchemeOfInspectionStored,
): UpdatedSchemeOfInspectionStored {
  return {
    pm_reference: stored.pm_reference || defaults.pm_reference,
    laboratory_text: stored.laboratory_text || defaults.laboratory_text,
    test_records_text: stored.test_records_text || defaults.test_records_text,
    labelling_marking_text: stored.labelling_marking_text || defaults.labelling_marking_text,
    control_unit_text: stored.control_unit_text || defaults.control_unit_text,
    levels_of_control_text: stored.levels_of_control_text || defaults.levels_of_control_text,
    standard_mark_text: stored.standard_mark_text || defaults.standard_mark_text,
    rejections_text: stored.rejections_text || defaults.rejections_text,
    note_1: stored.note_1 || defaults.note_1,
    note_2: stored.note_2 || defaults.note_2,
    note_3: stored.note_3 || defaults.note_3,
    test_rows:
      stored.test_rows.length > 0 && stored.test_rows.some(sitRowHasContent)
        ? stored.test_rows
        : defaultSitTestRows(),
  };
}

export function resolveUpdatedSchemeOfInspectionDocument(input: {
  isNumber: string | null;
  isTitle: string | null;
  revisionYear: string | null;
}): UpdatedSchemeOfInspectionStored {
  return resolveUpdatedSchemeOfInspectionDefaults(input);
}
