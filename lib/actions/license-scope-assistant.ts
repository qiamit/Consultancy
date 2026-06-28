"use server";

import { sendAiMessage, type ChatMessage } from "@/lib/actions/ai-chat";
import type { LicenseScopeFormat } from "@/lib/license-scope-format";
import { extractDocumentText } from "@/lib/is-code/extract-document-text";
import { IS_CODE_DOCUMENTS_BUCKET } from "@/lib/storage/is-code-documents";
import { createClient } from "@/lib/supabase/server";

const LICENSE_SCOPE_SYSTEM = `You are QE Assistant for License Scope and BIS Declaration Regarding Manufacturing Scope documents.

You receive:
- Company and Indian Standard (IS) context
- Current license scope content (plain text or table rows)
- IS document text when uploaded

Your job:
- Draft, rewrite, and refine manufacturing / license scope wording for BIS license applications
- Use clear, compliance-appropriate language for BIS declarations
- When the user asks you to draft, update, rewrite, apply, or change the license scope (or letter matter), you MUST include an apply block so changes reach the editor

When applying changes to the editor, end your message with a fenced JSON block (nothing after it):

For plain-text editor format:
\`\`\`json
{"apply":true,"plain":"Full license scope text here. Use numbered lines if helpful."}
\`\`\`

For table editor format (component / value rows):
\`\`\`json
{"apply":true,"rows":[{"component":"Product","value":"..."},{"component":"Grade / Type","value":"..."}]}
\`\`\`

Match the editor format shown in context (plain or table). For table format, use meaningful component and value pairs. Omit empty rows.

Only include apply JSON when the user wants actual content written into the form. For general Q&A or review-only feedback, do not include apply JSON.

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

function buildScopeContext(payload: {
  companyName: string;
  isReference: string;
  isTitle: string;
  format: LicenseScopeFormat;
  plainScope: string;
  tableRows: { component: string; value: string }[];
}): string {
  const lines = [
    `Company: ${payload.companyName || "—"}`,
    `IS Code: ${payload.isReference || "—"}`,
    `IS Title: ${payload.isTitle || "—"}`,
    `Editor format: ${payload.format}`,
    "",
    "Current license scope:",
  ];

  if (payload.format === "table") {
    const rows = payload.tableRows.filter(
      (r) => r.component.trim() || r.value.trim(),
    );
    if (rows.length === 0) {
      lines.push("(empty — no rows yet)");
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

export async function getLicenseScopeAssistantIsCodeStatus(isCodeId: string | null): Promise<{
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

export async function handleLicenseScopeAssistantMessage(
  text: string,
  messages: ChatMessage[],
  modelId: string | undefined,
  payload: {
    isCodeId: string | null;
    isReference: string;
    isTitle: string;
    companyName: string;
    format: LicenseScopeFormat;
    plainScope: string;
    tableRows: { component: string; value: string }[];
  },
): Promise<{ ok: true; reply: string } | { ok: false; error: string }> {
  const scopeBlock = buildScopeContext(payload);

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
    ? `[License Scope + IS Standard Context]\n${scopeBlock}${isDocBlock}\n\n[Question]\n`
    : `[License Scope Context (updated)]\n${scopeBlock}\n\n[Question]\n`;

  const augmented: ChatMessage[] = messages.map((m, i) =>
    i === messages.length - 1 && m.role === "user"
      ? { role: "user", content: contextHeader + text }
      : m,
  );

  return sendAiMessage(augmented, LICENSE_SCOPE_SYSTEM, modelId, 4096);
}
