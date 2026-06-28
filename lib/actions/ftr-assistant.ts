"use server";

import { sendAiMessage, type ChatMessage } from "@/lib/actions/ai-chat";
import {
  normalizeFtrRemark,
  sortFtrTestRowsByClause,
  type FactoryTestReportStored,
} from "@/lib/factory-test-report";
import { extractDocumentText } from "@/lib/is-code/extract-document-text";
import { IS_CODE_DOCUMENTS_BUCKET } from "@/lib/storage/is-code-documents";
import { createClient } from "@/lib/supabase/server";

const FTR_REVIEW_SYSTEM = `You are QE Assistant for Factory Test Report (FTR) compliance review in BIS certification applications.

You receive:
- The Indian Standard (IS) document text (when uploaded)
- The current Factory Test Report with test rows: test name, clause, specified requirements, observed values, and remarks (Confirm / Not Confirm)

Your job:
- Compare observed values against IS specified requirements
- Check whether each test passes or fails
- Identify missing tests, wrong units, blank observed values, or Remark = Not Confirm
- Give a clear overall verdict: OK for submission, or Needs correction (with reasons)

Structure your review clearly:
1. **Overall verdict** — OK / Needs correction
2. **Issues** — row-by-row problems (if any)
3. **Recommendations** — what to fix before submission

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

function buildReportContext(
  report: FactoryTestReportStored,
  isReference: string,
  isTitle: string,
  companyName: string,
): string {
  const tests = sortFtrTestRowsByClause(report.test_rows ?? []);
  const lines = [
    `Company: ${companyName || "—"}`,
    `IS Code: ${isReference || report.is_code || "—"}`,
    `IS Title: ${isTitle || "—"}`,
    `Sample: ${report.sample_label || "—"}`,
    `Product Title: ${report.product_title || "—"}`,
    `Sample Description: ${report.grade_type || "—"}`,
    `Batch / Heat: ${report.batch_heat_number || "—"}`,
    `Testing: ${report.date_of_testing_start || "—"} to ${report.date_of_testing_completion || "—"}`,
    "",
    "Test Results:",
  ];

  if (tests.length === 0) {
    lines.push("(No test parameters added yet)");
  } else {
    for (const row of tests) {
      lines.push(
        `- ${row.test_name}${row.clause_no ? ` (${row.clause_no})` : ""}`,
        `  Specified: ${row.specified_requirements || "—"}`,
        `  Observed: ${row.observed_value || "—"}`,
        `  Remark: ${normalizeFtrRemark(row.remark)}`,
      );
    }
  }

  return lines.join("\n");
}

export async function getFtrAssistantIsCodeStatus(isCodeId: string | null): Promise<{
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

export async function handleFtrAssistantMessage(
  text: string,
  messages: ChatMessage[],
  modelId: string | undefined,
  payload: {
    isCodeId: string | null;
    isReference: string;
    isTitle: string;
    companyName: string;
    report: FactoryTestReportStored;
  },
): Promise<{ ok: true; reply: string } | { ok: false; error: string }> {
  const reportBlock = buildReportContext(
    payload.report,
    payload.isReference,
    payload.isTitle,
    payload.companyName,
  );

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
    ? `[Factory Test Report + IS Standard Context]\n${reportBlock}${isDocBlock}\n\n[Question]\n`
    : `[Factory Test Report Context (updated)]\n${reportBlock}\n\n[Question]\n`;

  const augmented: ChatMessage[] = messages.map((m, i) =>
    i === messages.length - 1 && m.role === "user"
      ? { role: "user", content: contextHeader + text }
      : m,
  );

  return sendAiMessage(augmented, FTR_REVIEW_SYSTEM, modelId, 4096);
}
