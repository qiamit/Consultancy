"use server";

import { createClient } from "@backend/db/client/server";
import { extractDocumentText } from "@backend/modules/is-code/extract-document-text";
import { IS_CODE_DOCUMENTS_BUCKET } from "@backend/modules/storage/is-code-documents";
import { sendAiMessage } from "@backend/actions/ai-chat";
import {
  emptySitTestRow,
  type SitTestRow,
  type SitTestRowKind,
  type UpdatedSchemeOfInspectionStored,
} from "@backend/modules/bis/updated-scheme-of-inspection";

export type UsitImportFileOption = {
  id: string;
  file_name: string;
  storage_path: string;
};

export type UsitAnnexPatch = Pick<
  UpdatedSchemeOfInspectionStored,
  | "laboratory_text"
  | "test_records_text"
  | "labelling_marking_text"
  | "control_unit_text"
  | "levels_of_control_text"
  | "standard_mark_text"
  | "rejections_text"
  | "note_1"
  | "note_2"
  | "note_3"
>;

export type UsitExtractSuccess = {
  ok: true;
  fileName: string;
  annexPatch: UsitAnnexPatch;
  testRows: SitTestRow[];
  pm_reference: string;
  filled: { annex: boolean; table: boolean; notes: boolean };
};

export type UsitExtractFailure = { ok: false; error: string };

const TEXT_CAP = 120_000;

const ANNEX_KEYS = [
  "laboratory_text",
  "test_records_text",
  "labelling_marking_text",
  "control_unit_text",
  "levels_of_control_text",
  "standard_mark_text",
  "rejections_text",
] as const;

const NOTE_KEYS = ["note_1", "note_2", "note_3"] as const;

const emptyAnnexPatch = (): UsitAnnexPatch => ({
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
});

function str(v: unknown): string {
  return String(v ?? "").trim();
}

function parseJsonObject(raw: string): Record<string, unknown> | null {
  const trimmed = raw.trim();
  const fenced =
    /```(?:json)?\s*([\s\S]*?)```/i.exec(trimmed)?.[1]?.trim() ?? trimmed;
  const objStart = fenced.indexOf("{");
  const objEnd = fenced.lastIndexOf("}");
  const jsonSlice =
    objStart >= 0 && objEnd > objStart
      ? fenced.slice(objStart, objEnd + 1)
      : fenced;

  try {
    const parsed: unknown = JSON.parse(jsonSlice);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

function parseRowKind(v: unknown): SitTestRowKind {
  return v === "section" || v === "group" || v === "data" ? v : "data";
}

function parseSitRows(raw: unknown): SitTestRow[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const mapped: SitTestRow = {
        row_kind: parseRowKind(row.row_kind ?? row.kind),
        clause_no: str(row.clause_no ?? row.clause),
        requirement: str(row.requirement ?? row.requirement_text),
        test_methods_ref: str(
          row.test_methods_ref ?? row.test_method ?? row.test_methods,
        ),
        equipment_req: str(
          row.equipment_req ?? row.rs ?? row.r_s ?? row.equipment,
        ),
        sample_count: str(row.sample_count ?? row.sample ?? row.samples),
        frequency: str(row.frequency),
        remarks: str(row.remarks ?? row.remark),
      };
      const hasContent =
        mapped.clause_no ||
        mapped.requirement ||
        mapped.test_methods_ref ||
        mapped.equipment_req ||
        mapped.sample_count ||
        mapped.frequency ||
        mapped.remarks ||
        mapped.row_kind === "section" ||
        mapped.row_kind === "group";
      return hasContent ? mapped : null;
    })
    .filter((r): r is SitTestRow => r !== null);
}

function annexHasContent(patch: UsitAnnexPatch): boolean {
  return ANNEX_KEYS.some((k) => patch[k].trim().length > 0);
}

function notesHaveContent(patch: UsitAnnexPatch): boolean {
  return NOTE_KEYS.some((k) => patch[k].trim().length > 0);
}

function tableHasContent(rows: SitTestRow[]): boolean {
  return rows.some(
    (r) =>
      r.clause_no ||
      r.requirement ||
      r.test_methods_ref ||
      r.frequency ||
      r.equipment_req ||
      r.sample_count ||
      r.remarks ||
      r.row_kind === "section" ||
      r.row_kind === "group",
  );
}

function instructionBlock(instruction: string): string {
  return instruction
    ? `\nUser instructions (MUST follow — e.g. subcontracting, remarks, S vs R):\n${instruction}\n`
    : "";
}

const ANNEX_SYSTEM = `You extract Annex C (Scheme of Inspection and Testing) text from a BIS Product Manual / IS document.
Return ONLY one JSON object. No markdown fences, no explanation.

Required keys (ALL must be non-empty strings when the manual has Annex C / Scheme content; paraphrase from Product Manual if headings differ):
{
  "pm_reference": "string",
  "laboratory_text": "string",
  "test_records_text": "string",
  "labelling_marking_text": "string",
  "control_unit_text": "string",
  "levels_of_control_text": "string",
  "standard_mark_text": "string",
  "rejections_text": "string"
}

RULES:
1. Fill EVERY annex field. Do not leave blanks if related content exists anywhere in the document.
2. Preserve Product Manual wording where possible.
3. Apply user instructions when they affect annex wording (laboratory / subcontracting / levels of control).`;

const TABLE_SYSTEM = `You extract Table 1 — Test Details from a BIS Product Manual / Scheme of Inspection.
Return ONLY one JSON object. No markdown fences, no explanation.

{
  "test_rows": [
    {
      "row_kind": "data",
      "clause_no": "string",
      "requirement": "string",
      "test_methods_ref": "string",
      "equipment_req": "R or S",
      "sample_count": "string",
      "frequency": "string",
      "remarks": "string"
    }
  ]
}

RULES:
1. Extract ALL test rows from Levels of Control / Table 1 / test schedule. Prefer completeness over brevity.
2. equipment_req: use "R" (in-house) or "S" (subcontracted) from the manual. Apply user instructions (e.g. mark Impact test as S / subcontract BIS-ISO 17025 labs) in equipment_req and remarks.
3. row_kind is always "data" unless a clear section heading row is needed ("section" / "group").
4. Never return an empty test_rows array if any tests exist in the document.`;

const NOTES_SYSTEM = `You extract Table 1 Notes (Note-1, Note-2, Note-3) from a BIS Product Manual / Scheme of Inspection.
Return ONLY one JSON object. No markdown fences, no explanation.

{
  "note_1": "string",
  "note_2": "string",
  "note_3": "string"
}

RULES:
1. Fill note_1, note_2, note_3 from Product Manual notes under Table 1 / Scheme of Inspection.
2. If the manual has fewer than 3 notes, still fill available notes; for missing ones write a short BIS-appropriate note consistent with the manual and user instructions.
3. Apply user instructions (e.g. subcontracting Impact test to BIS / ISO 17025 recognized laboratories) into the most relevant note (usually note_2 about subcontracting).
4. Prefer non-empty strings for all three notes.`;

async function aiJson(
  system: string,
  user: string,
  modelId: string | undefined,
  maxTokens: number,
): Promise<Record<string, unknown> | null> {
  const res = await sendAiMessage(
    [{ role: "user", content: user }],
    system,
    modelId,
    maxTokens,
  );
  if (!res.ok) return null;
  return parseJsonObject(res.reply);
}

/** List IS code uploaded files for Product Manual picker (PDFs first). */
export async function listIsCodeFilesForUsitImport(
  isCodeId: string | null,
): Promise<
  | { ok: true; files: UsitImportFileOption[]; productManualNumber: string }
  | { ok: false; error: string }
> {
  const id = (isCodeId ?? "").trim();
  if (!id) {
    return {
      ok: false,
      error: "No IS Code linked to this application. Link an IS Code first.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const [{ data: isCode }, { data: files, error }] = await Promise.all([
    supabase
      .from("is_codes")
      .select("product_manual_number")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("is_code_files")
      .select("id, file_name, storage_path, created_at")
      .eq("is_code_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (error) return { ok: false, error: error.message };
  if (!files?.length) {
    return {
      ok: false,
      error:
        "No files uploaded for this IS Code. Upload the Product Manual PDF in IS Code Master first.",
    };
  }

  const mapped: UsitImportFileOption[] = files.map((f) => ({
    id: String(f.id),
    file_name: String(f.file_name ?? "document"),
    storage_path: String(f.storage_path ?? ""),
  }));

  mapped.sort((a, b) => {
    const aPdf = /\.pdf$/i.test(a.file_name) ? 0 : 1;
    const bPdf = /\.pdf$/i.test(b.file_name) ? 0 : 1;
    if (aPdf !== bPdf) return aPdf - bPdf;
    const aPm = /product\s*manual|pm\b|annex/i.test(a.file_name) ? 0 : 1;
    const bPm = /product\s*manual|pm\b|annex/i.test(b.file_name) ? 0 : 1;
    return aPm - bPm;
  });

  return {
    ok: true,
    files: mapped,
    productManualNumber: String(
      (isCode as { product_manual_number?: string } | null)?.product_manual_number ??
        "",
    ).trim(),
  };
}

async function loadFileText(
  supabase: Awaited<ReturnType<typeof createClient>>,
  isCodeId: string,
  fileId: string,
): Promise<{ text: string; fileName: string }> {
  const { data: file, error } = await supabase
    .from("is_code_files")
    .select("id, file_name, storage_path, is_code_id")
    .eq("id", fileId)
    .eq("is_code_id", isCodeId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!file?.storage_path) {
    throw new Error("Selected file was not found for this IS Code.");
  }

  const { data: blob, error: dlErr } = await supabase.storage
    .from(IS_CODE_DOCUMENTS_BUCKET)
    .download(file.storage_path);

  if (dlErr || !blob) {
    throw new Error(dlErr?.message ?? "Could not download the selected file.");
  }

  const buffer = Buffer.from(await blob.arrayBuffer());
  const fileName = String(file.file_name ?? "document.pdf");
  const text = await extractDocumentText(buffer, fileName);
  if (!text.trim()) {
    throw new Error(
      "The selected document has no readable text. Try a text-based PDF.",
    );
  }

  return { text: text.slice(0, TEXT_CAP), fileName };
}

function buildDocPreamble(opts: {
  isLabel: string;
  isTitle: string;
  pmNumber: string;
  fileName: string;
  instruction: string;
  documentText: string;
}): string {
  return `Product IS: ${opts.isLabel}
Title: ${opts.isTitle}
Known Product Manual number (if any): ${opts.pmNumber || "(not set)"}
Selected file: ${opts.fileName}
${instructionBlock(opts.instruction)}
Document text:
${opts.documentText}`;
}

/** AI-extract Annexure + Table 1 + Notes (3 focused calls, then merge). */
export async function extractUpdatedSitFromIsCodeFile(opts: {
  isCodeId: string | null;
  fileId: string;
  modelId?: string;
  instruction?: string;
}): Promise<UsitExtractSuccess | UsitExtractFailure> {
  const isCodeId = (opts.isCodeId ?? "").trim();
  const fileId = (opts.fileId ?? "").trim();
  if (!isCodeId) {
    return {
      ok: false,
      error: "No IS Code linked to this application. Link an IS Code first.",
    };
  }
  if (!fileId) return { ok: false, error: "Select a Product Manual / IS PDF file." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data: isCode } = await supabase
    .from("is_codes")
    .select("is_number, revision_year, is_code_title, product_manual_number")
    .eq("id", isCodeId)
    .maybeSingle();

  let doc: { text: string; fileName: string };
  try {
    doc = await loadFileText(supabase, isCodeId, fileId);
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not read the selected file.",
    };
  }

  const isLabel = isCode
    ? `IS ${String((isCode as { is_number?: string }).is_number ?? "").trim()}: ${String((isCode as { revision_year?: number }).revision_year ?? "").trim()}`
    : "IS Code";
  const isTitle = String(
    (isCode as { is_code_title?: string } | null)?.is_code_title ?? "",
  ).trim();
  const pmNumber = String(
    (isCode as { product_manual_number?: string } | null)?.product_manual_number ??
      "",
  ).trim();
  const instruction = (opts.instruction ?? "").trim();

  const preamble = buildDocPreamble({
    isLabel,
    isTitle,
    pmNumber,
    fileName: doc.fileName,
    instruction,
    documentText: doc.text,
  });

  const [annexObj, tableObj, notesObj] = await Promise.all([
    aiJson(
      ANNEX_SYSTEM,
      `${preamble}

Extract COMPLETE Annex C fields as JSON. Every annex key must be filled.`,
      opts.modelId,
      4096,
    ),
    aiJson(
      TABLE_SYSTEM,
      `${preamble}

Extract COMPLETE Table 1 test_rows as JSON. Include every test from the Product Manual.`,
      opts.modelId,
      8192,
    ),
    aiJson(
      NOTES_SYSTEM,
      `${preamble}

Extract COMPLETE note_1, note_2, note_3 as JSON. All three notes must be filled.`,
      opts.modelId,
      2048,
    ),
  ]);

  const annexPatch = emptyAnnexPatch();
  let pm_reference = pmNumber;

  if (annexObj) {
    annexPatch.laboratory_text = str(
      annexObj.laboratory_text ?? annexObj.laboratory,
    );
    annexPatch.test_records_text = str(
      annexObj.test_records_text ?? annexObj.test_records,
    );
    annexPatch.labelling_marking_text = str(
      annexObj.labelling_marking_text ??
        annexObj.labelling_marking ??
        annexObj.labeling_marking_text,
    );
    annexPatch.control_unit_text = str(
      annexObj.control_unit_text ?? annexObj.control_unit,
    );
    annexPatch.levels_of_control_text = str(
      annexObj.levels_of_control_text ?? annexObj.levels_of_control,
    );
    annexPatch.standard_mark_text = str(
      annexObj.standard_mark_text ?? annexObj.standard_mark,
    );
    annexPatch.rejections_text = str(
      annexObj.rejections_text ?? annexObj.rejections,
    );
    const pm = str(
      annexObj.pm_reference ?? annexObj.pm_ref ?? annexObj.product_manual_reference,
    );
    if (pm) pm_reference = pm;
  }

  if (notesObj) {
    annexPatch.note_1 = str(notesObj.note_1 ?? notesObj.note1);
    annexPatch.note_2 = str(notesObj.note_2 ?? notesObj.note2);
    annexPatch.note_3 = str(notesObj.note_3 ?? notesObj.note3);
  }

  const testRows = tableObj
    ? parseSitRows(tableObj.test_rows ?? tableObj.table_rows ?? tableObj.rows)
    : [];

  const filled = {
    annex: annexHasContent(annexPatch),
    table: tableHasContent(testRows),
    notes: notesHaveContent(annexPatch),
  };

  if (!filled.annex && !filled.table && !filled.notes) {
    return {
      ok: false,
      error:
        "AI could not extract Annexure, Table, or Notes from this file. Select the Product Manual PDF and try again.",
    };
  }

  // Soft retry for any missing part (sequential, focused)
  if (!filled.annex) {
    const retry = await aiJson(
      ANNEX_SYSTEM,
      `${preamble}\n\nRETRY: Previous attempt missed Annex C. Return ALL annex fields now.`,
      opts.modelId,
      4096,
    );
    if (retry) {
      for (const key of ANNEX_KEYS) {
        const v = str(retry[key]);
        if (v) annexPatch[key] = v;
      }
      filled.annex = annexHasContent(annexPatch);
    }
  }

  if (!filled.table) {
    const retry = await aiJson(
      TABLE_SYSTEM,
      `${preamble}\n\nRETRY: Previous attempt missed Table 1. Return full test_rows now.`,
      opts.modelId,
      8192,
    );
    if (retry) {
      const rows = parseSitRows(retry.test_rows ?? retry.table_rows ?? retry.rows);
      if (tableHasContent(rows)) {
        testRows.splice(0, testRows.length, ...rows);
        filled.table = true;
      }
    }
  }

  if (!filled.notes) {
    const retry = await aiJson(
      NOTES_SYSTEM,
      `${preamble}\n\nRETRY: Previous attempt missed Notes. Return note_1, note_2, note_3 now. Apply user subcontracting instructions into note_2 if relevant.`,
      opts.modelId,
      2048,
    );
    if (retry) {
      for (const key of NOTE_KEYS) {
        const v = str(retry[key]);
        if (v) annexPatch[key] = v;
      }
      filled.notes = notesHaveContent(annexPatch);
    }
  }

  if (!filled.annex || !filled.table || !filled.notes) {
    const missing = [
      !filled.annex ? "Annexure" : null,
      !filled.table ? "Table" : null,
      !filled.notes ? "Notes" : null,
    ]
      .filter(Boolean)
      .join(", ");
    // Still return partial success if anything filled — frontend will warn
    if (!filled.annex && !filled.table && !filled.notes) {
      return {
        ok: false,
        error: `Could not fill ${missing}. Try again or pick another Product Manual PDF.`,
      };
    }
  }

  return {
    ok: true,
    fileName: doc.fileName,
    annexPatch,
    testRows: tableHasContent(testRows) ? testRows : [emptySitTestRow()],
    pm_reference: pm_reference || pmNumber,
    filled: {
      annex: annexHasContent(annexPatch),
      table: tableHasContent(testRows),
      notes: notesHaveContent(annexPatch),
    },
  };
}
