"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { formatIsCodeRevisionLabel } from "@/components/modules/test-parameter-master/constants";
import { extractDocumentText } from "@/lib/is-code/extract-document-text";
import {
  isTestParameterImportCommand,
  normalizeIsNumber,
  parseIsReferenceFromText,
} from "@/lib/is-code/parse-is-reference";
import { IS_CODE_DOCUMENTS_BUCKET } from "@/lib/storage/is-code-documents";
import { sendAiMessage } from "@/lib/actions/ai-chat";
import { dedupeExtractedParameters } from "@/lib/test-parameter/import-normalize";
import {
  ensureUnitInCatalog,
  resolveTestMethodLabel,
  type IsCodeRow,
} from "@/lib/test-parameter/import-resolve";

const BASE_PATH = "/dashboard/test-parameters";

export type ExtractedTestParameter = {
  test_name: string;
  clause_no: string;
  test_method: string;
  unit: string;
  specified_value: string;
};

type ImportSuccess = {
  ok: true;
  inserted: number;
  skipped: number;
  isLabel: string;
  fileName: string;
  sample: ExtractedTestParameter[];
  addedTestMethodIsCodes: string[];
  addedUnits: string[];
};

type ImportFailure = { ok: false; error: string };

function formatIsLabel(row: IsCodeRow): string {
  return `IS ${row.is_number}: ${row.revision_year}`;
}

function parseExtractedParameters(raw: string): ExtractedTestParameter[] {
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
      const testName = String(row.test_name ?? row.name ?? row.test ?? "").trim();
      if (!testName) return null;
      return {
        test_name: testName,
        clause_no: String(row.clause_no ?? row.clause ?? "").trim(),
        test_method: String(row.test_method ?? row.method ?? "").trim(),
        unit: String(row.unit ?? "").trim(),
        specified_value: String(
          row.specified_value ?? row.value ?? row.requirement ?? "",
        ).trim(),
      };
    })
    .filter((row): row is ExtractedTestParameter => row !== null);
}

async function findIsCode(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ref: ReturnType<typeof parseIsReferenceFromText>,
): Promise<IsCodeRow | null> {
  if (!ref) return null;

  const { data, error } = await supabase
    .from("is_codes")
    .select("id, is_number, revision_year, is_code_title")
    .order("revision_year", { ascending: false });

  if (error || !data?.length) return null;

  const target = normalizeIsNumber(ref.isNumber);
  let matches = (data as IsCodeRow[]).filter(
    (row) => normalizeIsNumber(row.is_number) === target,
  );

  if (ref.revisionYear != null) {
    const byYear = matches.filter((row) => row.revision_year === ref.revisionYear);
    if (byYear.length > 0) matches = byYear;
  }

  return matches[0] ?? null;
}

async function getIsCodeById(
  supabase: Awaited<ReturnType<typeof createClient>>,
  isCodeId: string,
): Promise<IsCodeRow | null> {
  const { data, error } = await supabase
    .from("is_codes")
    .select("id, is_number, revision_year, is_code_title")
    .eq("id", isCodeId.trim())
    .maybeSingle();
  if (error || !data) return null;
  return data as IsCodeRow;
}

async function loadAllIsCodes(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<IsCodeRow[]> {
  const { data, error } = await supabase
    .from("is_codes")
    .select("id, is_number, revision_year, is_code_title")
    .order("is_number", { ascending: true });
  if (error) return [];
  return (data ?? []) as IsCodeRow[];
}

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
      "No document uploaded for this IS code. Upload the IS PDF in IS Code Master first.",
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
    text: text.slice(0, 120_000),
    fileName: preferred.file_name ?? "document",
  };
}

const EXTRACTION_SYSTEM_PROMPT = `You extract laboratory test parameters from Indian Standard (IS) documents for a Test Parameter master database.
Return ONLY a JSON array. No markdown, no explanation.

Each item must use these keys:
- test_name (required): specific individual test or element name in proper text
- clause_no: ONE exact clause/table reference only (e.g. "6.1" or "Table 3") — never combine clauses like "6.1, 6.2"
- test_method: referenced test-method IS number exactly as in the document (e.g. "IS 1608 (Part 1): 2018"), or empty if same as product IS
- unit: unit of measure if stated, else empty string
- specified_value: ONE limit/requirement text only (include symbols like Ω, ≤, ≥). If multiple limits exist for the same test, output separate rows OR pick the primary product requirement only.

STRICT RULES:
1. test_name must be specific — NEVER use grouped headings like "Chemical Composition", "Mechanical Properties". Instead create separate rows: "Carbon", "Sulphur", "Phosphorus", "Manganese", "Nitrogen", "Carbon Equivalent", "Yield Strength", etc.
2. Do NOT repeat the same test_name twice for this IS — one row per distinct test/element.
3. clause_no must be a single reference — never dual or multiple clause numbers.
4. If one test has multiple specified values in the standard, include only ONE specified_value (prefer the main product limit).
5. test_method must be the exact referenced IS test method when stated (including Part numbers).
6. Use exact wording from the standard for test names and specified values where possible.`;

async function extractParametersWithAi(
  documentText: string,
  isLabel: string,
  isTitle: string,
  modelId?: string,
): Promise<ExtractedTestParameter[]> {
  const userContent = `Product IS Code: ${isLabel}
Title: ${isTitle}

Document text:
${documentText}

Extract all test parameters for ${isLabel} as JSON array following all rules.`;

  const res = await sendAiMessage(
    [{ role: "user", content: userContent }],
    EXTRACTION_SYSTEM_PROMPT,
    modelId,
    8192,
  );

  if (!res.ok) throw new Error(res.error);

  const raw = parseExtractedParameters(res.reply);
  const rows = dedupeExtractedParameters(raw);
  if (rows.length === 0) {
    throw new Error(
      "AI could not extract test parameters from the IS document. Try a clearer PDF or add parameters manually.",
    );
  }

  return rows;
}

async function importTestParametersForIsCode(
  isCode: IsCodeRow,
  modelId?: string,
): Promise<ImportSuccess | ImportFailure> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const isLabel = formatIsLabel(isCode);
  const parentProductLabel = formatIsCodeRevisionLabel(
    isCode.is_number,
    isCode.revision_year,
  );

  let doc: { text: string; fileName: string };
  try {
    doc = await loadIsDocumentText(supabase, isCode.id);
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not read IS document.",
    };
  }

  let extracted: ExtractedTestParameter[];
  try {
    extracted = await extractParametersWithAi(
      doc.text,
      isLabel,
      isCode.is_code_title,
      modelId,
    );
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "AI extraction failed.",
    };
  }

  const allIsCodes = await loadAllIsCodes(supabase);
  const addedTestMethodIsCodes = new Set<string>();
  const addedUnits = new Set<string>();

  const resolvedRows: ExtractedTestParameter[] = [];
  for (const row of extracted) {
    const methodResult = await resolveTestMethodLabel(
      supabase,
      user.id,
      row.test_method,
      isCode,
      allIsCodes,
    );
    for (const c of methodResult.created) addedTestMethodIsCodes.add(c);

    const unitResult = await ensureUnitInCatalog(supabase, row.unit);
    if (unitResult.created && unitResult.unit) addedUnits.add(unitResult.unit);

    resolvedRows.push({
      test_name: row.test_name,
      clause_no: row.clause_no,
      test_method: row.test_method
        ? methodResult.label
        : parentProductLabel,
      unit: unitResult.unit,
      specified_value: row.specified_value,
    });
  }

  const { data: existing } = await supabase
    .from("test_parameters")
    .select("test_name")
    .eq("is_code_id", isCode.id);

  const existingTestNames = new Set(
    (existing ?? []).map((row) =>
      String(row.test_name).trim().toLowerCase(),
    ),
  );

  const now = new Date().toISOString();
  const toInsert = resolvedRows.filter((row) => {
    const key = row.test_name.trim().toLowerCase();
    if (existingTestNames.has(key)) return false;
    existingTestNames.add(key);
    return true;
  });

  if (toInsert.length === 0) {
    return {
      ok: false,
      error: `All extracted test parameters for ${isLabel} already exist. Nothing new to add.`,
    };
  }

  const { error: insertErr } = await supabase.from("test_parameters").insert(
    toInsert.map((row) => ({
      is_code_id: isCode.id,
      test_name: row.test_name,
      clause_no: row.clause_no,
      test_method: row.test_method,
      unit: row.unit,
      specified_value: row.specified_value,
      created_by: user.id,
      updated_at: now,
    })),
  );

  if (insertErr) {
    return { ok: false, error: insertErr.message };
  }

  revalidatePath(BASE_PATH);
  if (addedTestMethodIsCodes.size > 0) {
    revalidatePath("/dashboard/is-code-master");
  }

  return {
    ok: true,
    inserted: toInsert.length,
    skipped: resolvedRows.length - toInsert.length,
    isLabel,
    fileName: doc.fileName,
    sample: toInsert.slice(0, 5),
    addedTestMethodIsCodes: [...addedTestMethodIsCodes],
    addedUnits: [...addedUnits],
  };
}

export async function importTestParametersFromIsCodeId(
  isCodeId: string,
  modelId?: string,
): Promise<ImportSuccess | ImportFailure> {
  const supabase = await createClient();
  const isCode = await getIsCodeById(supabase, isCodeId);
  if (!isCode) {
    return { ok: false, error: "IS code not found in IS Code Master." };
  }
  return importTestParametersForIsCode(isCode, modelId);
}

export async function importTestParametersFromIsCode(
  message: string,
  modelId?: string,
): Promise<ImportSuccess | ImportFailure> {
  const ref = parseIsReferenceFromText(message);
  if (!ref) {
    return {
      ok: false,
      error: "Could not find an IS number in your message. Example: IS 6988:2017",
    };
  }

  const supabase = await createClient();
  const isCode = await findIsCode(supabase, ref);
  if (!isCode) {
    return {
      ok: false,
      error: `IS code not found in master: IS ${ref.isNumber}${ref.revisionYear ? `:${ref.revisionYear}` : ""}. Add it in IS Code Master first.`,
    };
  }

  return importTestParametersForIsCode(isCode, modelId);
}

function formatImportReply(result: ImportSuccess): string {
  const sampleLines = result.sample
    .map(
      (row, i) =>
        `${i + 1}. ${row.test_name}${row.clause_no ? ` (Clause ${row.clause_no})` : ""}`,
    )
    .join("\n");

  const skippedNote =
    result.skipped > 0
      ? `\n\nSkipped ${result.skipped} duplicate test name(s) already in Test Parameter master.`
      : "";

  const testMethodNote =
    result.addedTestMethodIsCodes.length > 0
      ? `\n\nAdded to IS Code Master (Test Method): ${result.addedTestMethodIsCodes.join(", ")}`
      : "";

  const unitNote =
    result.addedUnits.length > 0
      ? `\n\nAdded new unit(s): ${result.addedUnits.join(", ")}`
      : "";

  return `Done. Added ${result.inserted} test parameter(s) for ${result.isLabel} from file "${result.fileName}".${skippedNote}${testMethodNote}${unitNote}

First entries:
${sampleLines}${result.inserted > 5 ? `\n… and ${result.inserted - 5} more.` : ""}`;
}

export async function handleTestParameterAssistantMessage(
  message: string,
  modelId?: string,
  selectedIsCodeId?: string,
): Promise<
  | { handled: true; reply: string; refreshPage: boolean }
  | { handled: false }
> {
  const importIntent = isTestParameterImportCommand(message);

  if (selectedIsCodeId && importIntent) {
    const result = await importTestParametersFromIsCodeId(
      selectedIsCodeId,
      modelId,
    );
    if (!result.ok) {
      return { handled: true, refreshPage: false, reply: result.error };
    }
    return {
      handled: true,
      refreshPage: true,
      reply: formatImportReply(result),
    };
  }

  if (!isTestParameterImportCommand(message)) {
    return { handled: false };
  }

  const result = await importTestParametersFromIsCode(message, modelId);
  if (!result.ok) {
    return { handled: true, refreshPage: false, reply: result.error };
  }

  return {
    handled: true,
    refreshPage: true,
    reply: formatImportReply(result),
  };
}

export async function runTestParameterImportForSelectedIsCode(
  isCodeId: string,
  modelId?: string,
): Promise<
  | { ok: true; reply: string; refreshPage: true }
  | { ok: false; reply: string }
> {
  const result = await importTestParametersFromIsCodeId(isCodeId, modelId);
  if (!result.ok) {
    return { ok: false, reply: result.error };
  }
  return {
    ok: true,
    refreshPage: true,
    reply: formatImportReply(result),
  };
}
