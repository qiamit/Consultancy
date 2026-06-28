"use server";

import { sendAiMessage, type ChatMessage } from "@/lib/actions/ai-chat";
import { rowHasContent, type Cmpf305MachineryStored } from "@/lib/cmpf-305";
import { extractDocumentText } from "@/lib/is-code/extract-document-text";
import type { LicenseScopeFormat } from "@/lib/license-scope-format";
import { IS_CODE_DOCUMENTS_BUCKET } from "@/lib/storage/is-code-documents";
import { createClient } from "@/lib/supabase/server";

const CMPF305_SYSTEM = `You are QE Assistant for BIS CMPF 305 — Declaration Regarding Manufacturing Machinery (Form I).

You help with:
- Plant and machinery typically required for BIS licence applications under a given Indian Standard
- Filling machinery name, make, production capacity, number, and remarks for CMPF 305
- Reviewing the user's machinery list for completeness and BIS factory inspection readiness
- Clarifying what BIS expects in the Plant & Machinery declaration

When suggesting machinery, relate it to the product scope under the IS standard when context is available.
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

function buildCmpf305Context(payload: {
  companyName: string;
  isReference: string;
  isTitle: string;
  applicationNumber: string;
  firmRepName: string;
  firmRepDesignation: string;
  rows: Cmpf305MachineryStored[];
}): string {
  const lines = [
    `Company: ${payload.companyName || "—"}`,
    `IS Code: ${payload.isReference || "—"}`,
    `IS Title: ${payload.isTitle || "—"}`,
    `Application No.: ${payload.applicationNumber || "—"}`,
    `Firm Representative: ${payload.firmRepName || "—"} (${payload.firmRepDesignation || "—"})`,
    "",
    "Plant & machinery entries:",
  ];

  const visible = payload.rows.filter(rowHasContent);
  if (visible.length === 0) {
    lines.push("(none entered yet)");
  } else {
    for (const row of visible) {
      lines.push(
        `- ${row.machinery_name || "—"} | Make: ${row.make || "—"} | Capacity/day: ${row.production_capacity_per_day || "—"} | No.: ${row.number || "—"}${row.remarks ? ` | Remarks: ${row.remarks}` : ""}`,
      );
    }
  }

  return lines.join("\n");
}

export async function getCmpf305AssistantIsCodeStatus(isCodeId: string | null): Promise<{
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

export async function handleCmpf305AssistantMessage(
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
    rows: Cmpf305MachineryStored[];
  },
): Promise<{ ok: true; reply: string } | { ok: false; error: string }> {
  const contextBlock = buildCmpf305Context(payload);

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
    ? `[CMPF 305 Plant & Machinery + IS Standard Context]\n${contextBlock}${isDocBlock}\n\n[Question]\n`
    : `[CMPF 305 Context (updated)]\n${contextBlock}\n\n[Question]\n`;

  const augmented: ChatMessage[] = messages.map((m, i) =>
    i === messages.length - 1 && m.role === "user"
      ? { role: "user", content: contextHeader + text }
      : m,
  );

  return sendAiMessage(augmented, CMPF305_SYSTEM, modelId, 4096);
}

export type Cmpf305ScopeSuggestedMachinery = {
  machinery_name: string;
  make: string;
  production_capacity_per_day: string;
  number: string;
  remarks: string;
};

const SCOPE_MACHINERY_SUGGEST_SYSTEM = `You are a BIS quality engineering assistant for CMPF 305 (Declaration Regarding Manufacturing Machinery).

Given an Indian Standard document excerpt and the applicant's license / manufacturing scope, list ALL plant and manufacturing machinery required in a BIS factory to manufacture products covered by that scope.

Return ONLY a JSON array. No markdown, no explanation.

Each object must use exactly these keys:
{
  "machinery_name": "string",
  "make": "string (empty if unknown)",
  "production_capacity_per_day": "string with units e.g. 50 MT/day (empty if not applicable)",
  "number": "string e.g. 1 Nos",
  "remarks": "string (empty if not applicable)"
}

Rules:
- Cover machinery needed for the full manufacturing process under the license scope.
- Return one object per distinct machinery item.
- Use practical BIS factory defaults when the IS does not specify exact values.
- Prefer machinery names used in Indian BIS/ISI context.
- Deduplicate only identical rows.`;

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

function parseScopeMachinerySuggestions(raw: string): Cmpf305ScopeSuggestedMachinery[] {
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
      const machineryName = String(
        row.machinery_name ?? row.machinery ?? row.name ?? row.equipment ?? "",
      ).trim();
      if (!machineryName) return null;
      return {
        machinery_name: machineryName,
        make: String(row.make ?? row.manufacturer ?? "").trim(),
        production_capacity_per_day: String(
          row.production_capacity_per_day ??
            row.production_capacity ??
            row.capacity ??
            "",
        ).trim(),
        number: String(row.number ?? row.qty ?? row.quantity ?? "1 Nos").trim() || "1 Nos",
        remarks: String(row.remarks ?? row.remark ?? "").trim(),
      };
    })
    .filter((row): row is Cmpf305ScopeSuggestedMachinery => row !== null);
}

export async function suggestCmpf305MachineryFromLicenseScope(payload: {
  isCodeId: string;
  isReference: string;
  isTitle: string;
  licenseScopeFormat: LicenseScopeFormat;
  licenseScope: string;
  licenseScopeRows: { component: string; value: string }[];
}): Promise<
  { ok: true; machinery: Cmpf305ScopeSuggestedMachinery[] } | { ok: false; error: string }
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

Based on the license scope and IS document above, list every plant & machinery item required for CMPF 305. Return JSON array only.`;

  const result = await sendAiMessage(
    [{ role: "user", content: userPrompt }],
    SCOPE_MACHINERY_SUGGEST_SYSTEM,
    undefined,
    8192,
  );

  if (!result.ok) return result;

  const machinery = parseScopeMachinerySuggestions(result.reply);
  if (machinery.length === 0) {
    return {
      ok: false,
      error:
        "Could not extract machinery from IS code and license scope. Try again or enter machinery manually.",
    };
  }

  return { ok: true, machinery };
}
