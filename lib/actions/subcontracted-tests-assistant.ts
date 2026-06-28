"use server";

import { sendAiMessage, type ChatMessage } from "@/lib/actions/ai-chat";
import { extractDocumentText } from "@/lib/is-code/extract-document-text";
import { IS_CODE_DOCUMENTS_BUCKET } from "@/lib/storage/is-code-documents";
import { createClient } from "@/lib/supabase/server";
import { rowHasContent, type SubcontractedTestStored, type SubcontractedTestsDocumentStored } from "@/lib/subcontracted-tests";

const SUBCONTRACTED_TESTS_SYSTEM = `You are QE Assistant for BIS Test Parameters Subcontracted declarations.

You help with:
- Which test parameters are typically subcontracted vs in-house for a given Indian Standard
- Drafting and refining declaration language for BIS
- BIS Recognized / ISO/IEC 17025 laboratory requirements for subcontracted tests
- Reviewing the user's list of subcontracted tests for completeness

When the user asks which tests to subcontract, suggest parameters from the IS standard context when available.
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

function buildSubcontractedTestsContext(payload: {
  companyName: string;
  isReference: string;
  isTitle: string;
  rows: SubcontractedTestStored[];
  document: SubcontractedTestsDocumentStored;
}): string {
  const lines = [
    `Company: ${payload.companyName || "—"}`,
    `IS Code: ${payload.isReference || "—"}`,
    `IS Title: ${payload.isTitle || "—"}`,
    `Signatory: ${payload.document.signatory_name || "—"} (${payload.document.signatory_designation || "—"})`,
    "",
    "Subcontracted test parameters:",
  ];

  const visible = payload.rows.filter(rowHasContent);
  if (visible.length === 0) {
    lines.push("(none entered yet)");
  } else {
    for (const row of visible) {
      lines.push(
        `- ${row.test_name || "—"}${row.clause_no ? ` (${row.clause_no})` : ""} → ${row.laboratory_name || "lab not set"}`,
      );
    }
  }

  return lines.join("\n");
}

export async function getSubcontractedTestsAssistantIsCodeStatus(isCodeId: string | null): Promise<{
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

export async function handleSubcontractedTestsAssistantMessage(
  text: string,
  messages: ChatMessage[],
  modelId: string | undefined,
  payload: {
    isCodeId: string | null;
    isReference: string;
    isTitle: string;
    companyName: string;
    rows: SubcontractedTestStored[];
    document: SubcontractedTestsDocumentStored;
  },
): Promise<{ ok: true; reply: string } | { ok: false; error: string }> {
  const contextBlock = buildSubcontractedTestsContext(payload);

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
    ? `[Subcontracted Tests + IS Standard Context]\n${contextBlock}${isDocBlock}\n\n[Question]\n`
    : `[Subcontracted Tests Context (updated)]\n${contextBlock}\n\n[Question]\n`;

  const augmented: ChatMessage[] = messages.map((m, i) =>
    i === messages.length - 1 && m.role === "user"
      ? { role: "user", content: contextHeader + text }
      : m,
  );

  return sendAiMessage(augmented, SUBCONTRACTED_TESTS_SYSTEM, modelId, 4096);
}
