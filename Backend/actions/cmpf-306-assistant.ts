"use server";

import { sendAiMessage, type ChatMessage } from "@backend/actions/ai-chat";
import { equipmentRowHasContent, type Cmpf306EquipmentStored } from "@backend/modules/bis/cmpf-306";
import { extractDocumentText } from "@backend/modules/is-code/extract-document-text";
import type { LicenseScopeFormat } from "@backend/modules/bis/license-scope-format";
import { IS_CODE_DOCUMENTS_BUCKET } from "@backend/modules/storage/is-code-documents";
import { createClient } from "@backend/db/supabase/server";

const CMPF306_SYSTEM = `You are QE Assistant for BIS CMPF 306 — Declaration Regarding Testing Equipments (Form II).

You help with:
- Test equipment and chemicals typically required for BIS licence applications under a given Indian Standard
- Filling equipment name, make, least count, range, calibration details, clause number, and remarks for CMPF 306
- Reviewing the user's testing equipment list for completeness and BIS factory inspection readiness
- Clarifying what BIS expects in the Testing Equipments declaration

When suggesting equipment, relate it to the product scope and relevant IS clauses when context is available.
Be concise, practical, and use Indian BIS/ISI certification context.`;

async function loadIsDocumentText(
  supabase: Awaited<ReturnType<typeof createClient>>,
  isCodeId: string,
): Promise<{ text: string; fileName: string }> {
  const { data: files, error } = await supabase
    .from("is_code_files")
    .select("id, file_name, storage_path, created_at")
    .eq("is_code_id", isCodeId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  if (!files?.length) {
    throw new Error(
      "No IS document uploaded. Upload the IS PDF in IS Code Master first.",
    );
  }

  const preferred =
    files.find((f) => /\.pdf$/i.test(f.file_name ?? "")) ?? files[0]!;

  const { data: blob, error: dlErr } = await supabase.storage
    .from(IS_CODE_DOCUMENTS_BUCKET)
    .download(preferred.storage_path);

  if (dlErr || !blob) {
    throw new Error(dlErr?.message ?? "Could not download IS document.");
  }

  const buffer = Buffer.from(await blob.arrayBuffer());
  const text = await extractDocumentText(
    buffer,
    preferred.file_name ?? "document.pdf",
  );

  if (!text.trim()) {
    throw new Error("The IS document has no readable text. Try a text-based PDF.");
  }

  return {
    text: text.slice(0, 100_000),
    fileName: preferred.file_name ?? "document",
  };
}

function buildCmpf306Context(payload: {
  companyName: string;
  isReference: string;
  isTitle: string;
  applicationNumber: string;
  firmRepName: string;
  firmRepDesignation: string;
  equipment: Cmpf306EquipmentStored[];
}): string {
  const lines = [
    `Company: ${payload.companyName || "—"}`,
    `IS Code: ${payload.isReference || "—"}`,
    `IS Title: ${payload.isTitle || "—"}`,
    `Application No.: ${payload.applicationNumber || "—"}`,
    `Firm Representative: ${payload.firmRepName || "—"} (${payload.firmRepDesignation || "—"})`,
    "",
    "Testing equipment entries:",
  ];

  const visible = payload.equipment.filter(equipmentRowHasContent);
  if (visible.length === 0) {
    lines.push("(none entered yet)");
  } else {
    for (const row of visible) {
      lines.push(
        `- ${row.equipment_name || "—"} | Make: ${row.make || "—"} | Least count: ${row.least_count || "—"} | Range: ${row.range || "—"} | Calibration: ${row.calibration_details || "—"} | Quantity: ${row.quantity || "—"} | Clause: ${row.clause_number || "—"} | Method: ${row.test_method || "—"}${row.remarks ? ` | Test: ${row.remarks}` : ""}`,
      );
    }
  }

  return lines.join("\n");
}

export async function getCmpf306AssistantIsCodeStatus(isCodeId: string | null): Promise<{
  hasFiles: boolean;
  fileCount: number;
  fileName: string | null;
}> {
  if (!isCodeId?.trim()) {
    return { hasFiles: false, fileCount: 0, fileName: null };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("is_code_files")
    .select("file_name")
    .eq("is_code_id", isCodeId);

  if (error || !data?.length) {
    return { hasFiles: false, fileCount: 0, fileName: null };
  }

  const preferred =
    data.find((f) => /\.pdf$/i.test(f.file_name ?? "")) ?? data[0]!;

  return {
    hasFiles: true,
    fileCount: data.length,
    fileName: preferred.file_name ?? null,
  };
}

export async function handleCmpf306AssistantMessage(
  text: string,
  messages: ChatMessage[],
  modelId: string | undefined,
  payload: {
    isCodeId: string | null;
    isReference: string;
    isTitle: string;
    companyName: string;
    applicationNumber: string;
    firmRepName: string;
    firmRepDesignation: string;
    equipment: Cmpf306EquipmentStored[];
  },
): Promise<{ ok: true; reply: string } | { ok: false; error: string }> {
  const contextBlock = buildCmpf306Context(payload);

  let isDocBlock = "";
  if (payload.isCodeId?.trim()) {
    try {
      const supabase = await createClient();
      const { text: docText, fileName } = await loadIsDocumentText(
        supabase,
        payload.isCodeId,
      );
      isDocBlock = `\n\n--- IS Document (${fileName}) ---\n${docText}`;
    } catch (err) {
      isDocBlock = `\n\n[IS document: ${err instanceof Error ? err.message : "not available"}]`;
    }
  } else {
    isDocBlock = "\n\n[No IS code linked to this application.]";
  }

  const userTurnCount = messages.filter((m) => m.role === "user").length;
  const includeIsDoc = userTurnCount <= 1;

  const contextHeader = includeIsDoc
    ? `[CMPF 306 Testing Equipments + IS Standard Context]\n${contextBlock}${isDocBlock}\n\n[Question]\n`
    : `[CMPF 306 Context (updated)]\n${contextBlock}\n\n[Question]\n`;

  const augmented: ChatMessage[] = messages.map((m, i) =>
    i === messages.length - 1 && m.role === "user"
      ? { role: "user", content: contextHeader + text }
      : m,
  );

  return sendAiMessage(augmented, CMPF306_SYSTEM, modelId, 4096);
}

export type Cmpf306SuggestedEquipment = {
  equipment_name: string;
  least_count: string;
  range: string;
  calibration_required: boolean;
  quantity: string;
};

const EQUIPMENT_SUGGEST_SYSTEM = `You are a BIS quality engineering assistant for CMPF 306 (Testing Equipments declaration).

Given an Indian Standard document excerpt and ONE specific test parameter, list the test equipment, instruments, or chemicals required to perform that test in a BIS factory laboratory.

Return ONLY a JSON array. No markdown, no explanation.

Each object must use exactly these keys:
{
  "equipment_name": "string",
  "least_count": "string (empty if not applicable)",
  "range": "string (empty if not applicable)",
  "calibration_required": true or false,
  "quantity": "string e.g. 1 Nos"
}

Rules:
- Return one object per distinct equipment item.
- If multiple equipments are needed for the test, return multiple array elements.
- Use practical BIS factory lab defaults when the IS does not specify exact values.
- Prefer equipment names used in Indian BIS/ISI context.
- calibration_required should be true for measuring instruments unless clearly not needed.`;

function parseBool(value: unknown, defaultValue = true): boolean {
  if (typeof value === "boolean") return value;
  const text = String(value ?? "").trim().toLowerCase();
  if (["yes", "y", "true", "1", "required"].includes(text)) return true;
  if (["no", "n", "false", "0", "not required"].includes(text)) return false;
  return defaultValue;
}

function parseEquipmentSuggestions(raw: string): Cmpf306SuggestedEquipment[] {
  const trimmed = raw.trim();
  const fenced =
    /```(?:json)?\s*([\s\S]*?)```/i.exec(trimmed)?.[1]?.trim() ?? trimmed;
  const arrayStart = fenced.indexOf("[");
  const arrayEnd = fenced.lastIndexOf("]");
  const jsonSlice =
    arrayStart >= 0 && arrayEnd > arrayStart
      ? fenced.slice(arrayStart, arrayEnd + 1)
      : fenced;

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonSlice);
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) return [];

  return parsed
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const equipmentName = String(
        row.equipment_name ?? row.equipment ?? row.name ?? row.instrument ?? "",
      ).trim();
      if (!equipmentName) return null;
      return {
        equipment_name: equipmentName,
        least_count: String(row.least_count ?? row.leastCount ?? row.resolution ?? "").trim(),
        range: String(row.range ?? "").trim(),
        calibration_required: parseBool(
          row.calibration_required ?? row.calibration ?? row.calibrationRequired,
          true,
        ),
        quantity: String(row.quantity ?? row.qty ?? "1 Nos").trim() || "1 Nos",
      };
    })
    .filter((row): row is Cmpf306SuggestedEquipment => row !== null);
}

export async function suggestCmpf306EquipmentForTestParameter(payload: {
  isCodeId: string;
  testName: string;
  clauseNo: string;
  testMethod: string;
  isReference: string;
  isTitle: string;
}): Promise<
  { ok: true; equipment: Cmpf306SuggestedEquipment[] } | { ok: false; error: string }
> {
  const testName = payload.testName.trim();
  if (!testName) {
    return { ok: false, error: "Select or enter a test parameter first." };
  }
  if (!payload.isCodeId?.trim()) {
    return { ok: false, error: "No IS code linked to this application." };
  }

  let isDocBlock = "";
  try {
    const supabase = await createClient();
    const { text: docText, fileName } = await loadIsDocumentText(
      supabase,
      payload.isCodeId,
    );
    isDocBlock = `--- IS Document (${fileName}) ---\n${docText}`;
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Could not read IS document.",
    };
  }

  const userPrompt = `[Context]
IS Code: ${payload.isReference || "—"}
IS Title: ${payload.isTitle || "—"}
Test Parameter: ${testName}
Clause No.: ${payload.clauseNo.trim() || "—"}
Test Method: ${payload.testMethod.trim() || "—"}

${isDocBlock}

List the test equipment required for the test parameter above based on the IS document. Return JSON array only.`;

  const result = await sendAiMessage(
    [{ role: "user", content: userPrompt }],
    EQUIPMENT_SUGGEST_SYSTEM,
    undefined,
    4096,
  );

  if (!result.ok) return result;

  const equipment = parseEquipmentSuggestions(result.reply);
  if (equipment.length === 0) {
    return {
      ok: false,
      error:
        "Could not extract equipment suggestions from the IS document. Try again or enter equipment manually.",
    };
  }

  return { ok: true, equipment };
}

export type Cmpf306ScopeSuggestedEquipment = Cmpf306SuggestedEquipment & {
  test_name: string;
  clause_no: string;
  test_method: string;
};

const SCOPE_EQUIPMENT_SUGGEST_SYSTEM = `You are a BIS quality engineering assistant for CMPF 306 (Testing Equipments declaration).

Given an Indian Standard document excerpt and the applicant's license / manufacturing scope, list ALL test equipment, instruments, and chemicals required in a BIS factory laboratory to test products covered by that scope.

Return ONLY a JSON array. No markdown, no explanation.

Each object must use exactly these keys:
{
  "test_name": "string — test parameter name from the IS",
  "clause_no": "string — relevant IS clause number",
  "test_method": "string — test method reference if known, else empty",
  "equipment_name": "string",
  "least_count": "string (empty if not applicable)",
  "range": "string (empty if not applicable)",
  "calibration_required": true or false,
  "quantity": "string e.g. 1 Nos"
}

Rules:
- Cover every test parameter applicable to the license scope under the IS.
- Return one object per distinct equipment item (duplicate equipment for different tests = separate rows with same equipment_name but different test_name/clause_no).
- Use practical BIS factory lab defaults when the IS does not specify exact values.
- Prefer equipment names used in Indian BIS/ISI context.
- calibration_required should be true for measuring instruments unless clearly not needed.
- Deduplicate only identical rows (same test + same equipment + same specs).`;

function buildLicenseScopeBlock(payload: {
  format: LicenseScopeFormat;
  plainScope: string;
  tableRows: { component: string; value: string }[];
}): string {
  const lines = ["License / Manufacturing Scope:"];

  if (payload.format === "table") {
    const rows = payload.tableRows.filter(
      (row) => row.component.trim() || row.value.trim(),
    );
    if (rows.length === 0) {
      lines.push("(empty)");
    } else {
      for (const row of rows) {
        lines.push(`- ${row.component.trim() || "—"} | ${row.value.trim() || "—"}`);
      }
    }
  } else {
    lines.push(payload.plainScope.trim() || "(empty)");
  }

  return lines.join("\n");
}

function licenseScopeHasContent(payload: {
  format: LicenseScopeFormat;
  plainScope: string;
  tableRows: { component: string; value: string }[];
}): boolean {
  if (payload.format === "table") {
    return payload.tableRows.some(
      (row) => row.component.trim().length > 0 || row.value.trim().length > 0,
    );
  }
  return payload.plainScope.trim().length > 0;
}

function parseScopeEquipmentSuggestions(raw: string): Cmpf306ScopeSuggestedEquipment[] {
  const trimmed = raw.trim();
  const fenced =
    /```(?:json)?\s*([\s\S]*?)```/i.exec(trimmed)?.[1]?.trim() ?? trimmed;
  const arrayStart = fenced.indexOf("[");
  const arrayEnd = fenced.lastIndexOf("]");
  const jsonSlice =
    arrayStart >= 0 && arrayEnd > arrayStart
      ? fenced.slice(arrayStart, arrayEnd + 1)
      : fenced;

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonSlice);
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) return [];

  return parsed
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const equipmentName = String(
        row.equipment_name ?? row.equipment ?? row.name ?? row.instrument ?? "",
      ).trim();
      if (!equipmentName) return null;
      return {
        test_name: String(row.test_name ?? row.testName ?? row.test_parameter ?? row.parameter ?? "").trim(),
        clause_no: String(row.clause_no ?? row.clauseNo ?? row.clause ?? "").trim(),
        test_method: String(row.test_method ?? row.testMethod ?? row.method ?? "").trim(),
        equipment_name: equipmentName,
        least_count: String(row.least_count ?? row.leastCount ?? row.resolution ?? "").trim(),
        range: String(row.range ?? "").trim(),
        calibration_required: parseBool(
          row.calibration_required ?? row.calibration ?? row.calibrationRequired,
          true,
        ),
        quantity: String(row.quantity ?? row.qty ?? "1 Nos").trim() || "1 Nos",
      };
    })
    .filter((row): row is Cmpf306ScopeSuggestedEquipment => row !== null);
}

export async function suggestCmpf306EquipmentFromLicenseScope(payload: {
  isCodeId: string;
  isReference: string;
  isTitle: string;
  licenseScopeFormat: LicenseScopeFormat;
  licenseScope: string;
  licenseScopeRows: { component: string; value: string }[];
}): Promise<
  { ok: true; equipment: Cmpf306ScopeSuggestedEquipment[] } | { ok: false; error: string }
> {
  if (!payload.isCodeId?.trim()) {
    return { ok: false, error: "No IS code linked to this application." };
  }

  if (
    !licenseScopeHasContent({
      format: payload.licenseScopeFormat,
      plainScope: payload.licenseScope,
      tableRows: payload.licenseScopeRows,
    })
  ) {
    return {
      ok: false,
      error: "License scope is empty. Fill License Scope in the application first.",
    };
  }

  let isDocBlock = "";
  try {
    const supabase = await createClient();
    const { text: docText, fileName } = await loadIsDocumentText(
      supabase,
      payload.isCodeId,
    );
    isDocBlock = `--- IS Document (${fileName}) ---\n${docText}`;
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Could not read IS document.",
    };
  }

  const scopeBlock = buildLicenseScopeBlock({
    format: payload.licenseScopeFormat,
    plainScope: payload.licenseScope,
    tableRows: payload.licenseScopeRows,
  });

  const userPrompt = `[Context]
IS Code: ${payload.isReference || "—"}
IS Title: ${payload.isTitle || "—"}

${scopeBlock}

${isDocBlock}

Based on the license scope and IS document above, list every test equipment item required for CMPF 306. Return JSON array only.`;

  const result = await sendAiMessage(
    [{ role: "user", content: userPrompt }],
    SCOPE_EQUIPMENT_SUGGEST_SYSTEM,
    undefined,
    8192,
  );

  if (!result.ok) return result;

  const equipment = parseScopeEquipmentSuggestions(result.reply);
  if (equipment.length === 0) {
    return {
      ok: false,
      error:
        "Could not extract equipment from IS code and license scope. Try again or enter equipment manually.",
    };
  }

  return { ok: true, equipment };
}
