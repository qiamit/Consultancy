"use server";

import { sendAiMessage, type ChatMessage } from "@/lib/actions/ai-chat";
import { getLicenseScopeAssistantIsCodeStatus } from "@/lib/actions/license-scope-assistant";
import { extractDocumentText } from "@/lib/is-code/extract-document-text";
import type { LicenseScopeFormat } from "@/lib/license-scope-format";
import type { ProcessFlowChartStored } from "@/lib/process-flow-chart";
import { hierarchyLabelForLevel } from "@/lib/process-flow-outline";
import { IS_CODE_DOCUMENTS_BUCKET } from "@/lib/storage/is-code-documents";
import { createClient } from "@/lib/supabase/server";

export { getLicenseScopeAssistantIsCodeStatus };

const PROCESS_DESCRIPTION_QE_SYSTEM = `You are QE Assistant for BIS Process Description letters submitted with licence applications to the Bureau of Indian Standards (India).

You receive:
- Company and Indian Standard (IS) context
- License scope (manufacturing scope declaration)
- Process flow chart hierarchy (manufacturing steps)
- IS document text when uploaded
- Current process description points (if any)

Your job:
- Draft, rewrite, and refine numbered manufacturing process description points for BIS submission
- Align points with the IS standard, license scope, and process flow chart
- Use formal, professional language suitable for a BIS process description letter
- Cover raw material handling, manufacturing operations, in-process controls, finished goods, non-conformance, and records where relevant

When the user asks you to generate, draft, create, auto-fill, rewrite, update, or apply process description points, you MUST end your message with a fenced JSON block (nothing after it):

\`\`\`json
{"apply":true,"points":["First numbered point as a full sentence.","Second point…","Third point…"]}
\`\`\`

Rules for apply JSON:
- Include 5 to 12 complete points as an array of strings (no numbering inside strings — the form adds numbers)
- Each point is one paragraph-style sentence or two short related sentences
- Base content on IS document, license scope, and process flow chart when available
- Do not invent product specifications not supported by the provided context
- Only include apply JSON when the user wants content written into the form

For general Q&A or review-only feedback, do not include apply JSON.

Be concise, practical, and use Indian BIS/ISI certification context.`;

const AUTO_GENERATE_SYSTEM = `You draft numbered manufacturing process description points for a BIS licence application Process Description letter.

Use ONLY the provided context: company, IS code, license scope, process flow chart, and IS document excerpts.

Return ONLY valid JSON (no markdown fences, no explanation):
{"points":["point 1 text","point 2 text",...]}

Rules:
- 6 to 10 complete points
- Each point is formal BIS-appropriate prose (one paragraph-style sentence)
- Follow the sequence in the process flow chart when present
- Reflect license scope product/grade coverage
- Use IS document context for materials, process, and quality requirements when available
- Do not number inside strings
- Do not invent specifications absent from context`;

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

function buildLicenseScopeBlock(payload: {
  format: LicenseScopeFormat;
  plainScope: string;
  tableRows: { component: string; value: string }[];
}): string {
  const lines = ["License scope:"];
  if (payload.format === "table") {
    const rows = payload.tableRows.filter(
      (r) => r.component.trim() || r.value.trim(),
    );
    if (rows.length === 0) {
      lines.push("(empty — fill Undertaking for License Scope first)");
    } else {
      for (const row of rows) {
        lines.push(`- ${row.component.trim() || "—"} | ${row.value.trim() || "—"}`);
      }
    }
  } else {
    lines.push(payload.plainScope.trim() || "(empty — fill Undertaking for License Scope first)");
  }
  return lines.join("\n");
}

function buildProcessFlowChartBlock(chart: ProcessFlowChartStored): string {
  const items = chart.outline_items ?? [];
  const filled = items.filter((item) => item.text.trim());

  if (filled.length > 0) {
    const lines = ["Process flow chart hierarchy:"];
    for (const [index, item] of filled.entries()) {
      const levelLabel = hierarchyLabelForLevel(item.level);
      lines.push(`${index + 1}. [${levelLabel}] ${item.text.trim()}`);
    }
    return lines.join("\n");
  }

  const labels = chart.shapes
    .filter(
      (shape): shape is Extract<typeof shape, { type: "rectangle" }> =>
        shape.type === "rectangle",
    )
    .sort((a, b) => a.y - b.y || a.x - b.x)
    .map((shape) => shape.label.trim())
    .filter(Boolean);

  if (labels.length === 0) {
    return "Process flow chart: (empty — fill Process Flow Chart first)";
  }

  return ["Process flow chart steps:", ...labels.map((label, i) => `${i + 1}. ${label}`)].join(
    "\n",
  );
}

function buildCurrentPointsBlock(points: string[]): string {
  const filled = points.map((p) => p.trim()).filter(Boolean);
  if (filled.length === 0) return "Current process description points: (empty)";
  return [
    "Current process description points:",
    ...filled.map((point, i) => `${i + 1}. ${point}`),
  ].join("\n");
}

function buildApplicationContext(payload: {
  companyName: string;
  isReference: string;
  isTitle: string;
  applicationNumber: string;
  format: LicenseScopeFormat;
  plainScope: string;
  tableRows: { component: string; value: string }[];
  processFlowChart: ProcessFlowChartStored;
  currentPoints: string[];
}): string {
  return [
    `Company: ${payload.companyName || "—"}`,
    `IS Code: ${payload.isReference || "—"}`,
    `IS Title: ${payload.isTitle || "—"}`,
    `Application No.: ${payload.applicationNumber || "—"}`,
    "",
    buildLicenseScopeBlock(payload),
    "",
    buildProcessFlowChartBlock(payload.processFlowChart),
    "",
    buildCurrentPointsBlock(payload.currentPoints),
  ].join("\n");
}

async function loadIsDocBlock(isCodeId: string | null): Promise<string> {
  if (!isCodeId?.trim()) {
    return "\n\n[No IS code linked to this application.]";
  }
  try {
    const supabase = await createClient();
    const { text: docText, fileName } = await loadIsDocumentText(supabase, isCodeId);
    return `\n\n--- IS Document (${fileName}) ---\n${docText}`;
  } catch (err) {
    return `\n\n[IS document: ${err instanceof Error ? err.message : "not available"}]`;
  }
}

function parsePointsFromJsonReply(reply: string): string[] {
  const trimmed = reply.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const jsonText = fenceMatch ? fenceMatch[1]!.trim() : trimmed;
  try {
    const parsed = JSON.parse(jsonText) as { points?: unknown };
    if (!Array.isArray(parsed.points)) return [];
    return parsed.points.map((p) => String(p ?? "").trim()).filter(Boolean);
  } catch {
    return [];
  }
}

export async function handleProcessDescriptionQeAssistantMessage(
  text: string,
  messages: ChatMessage[],
  modelId: string | undefined,
  payload: {
    isCodeId: string | null;
    isReference: string;
    isTitle: string;
    companyName: string;
    applicationNumber: string;
    format: LicenseScopeFormat;
    plainScope: string;
    tableRows: { component: string; value: string }[];
    processFlowChart: ProcessFlowChartStored;
    currentPoints: string[];
  },
): Promise<{ ok: true; reply: string } | { ok: false; error: string }> {
  const contextBlock = buildApplicationContext(payload);
  const isDocBlock = await loadIsDocBlock(payload.isCodeId);

  const userTurnCount = messages.filter((m) => m.role === "user").length;
  const includeIsDoc = userTurnCount <= 1;

  const contextHeader = includeIsDoc
    ? `[Process Description + Application Context]\n${contextBlock}${isDocBlock}\n\n[Question]\n`
    : `[Process Description Context (updated)]\n${contextBlock}\n\n[Question]\n`;

  const augmented: ChatMessage[] = messages.map((m, i) =>
    i === messages.length - 1 && m.role === "user"
      ? { role: "user", content: contextHeader + text }
      : m,
  );

  return sendAiMessage(augmented, PROCESS_DESCRIPTION_QE_SYSTEM, modelId, 4096);
}

export async function autoGenerateProcessDescriptionPoints(payload: {
  isCodeId: string | null;
  isReference: string;
  isTitle: string;
  companyName: string;
  applicationNumber: string;
  format: LicenseScopeFormat;
  plainScope: string;
  tableRows: { component: string; value: string }[];
  processFlowChart: ProcessFlowChartStored;
}): Promise<{ ok: true; points: string[] } | { ok: false; error: string }> {
  const contextBlock = buildApplicationContext({ ...payload, currentPoints: [] });
  const isDocBlock = await loadIsDocBlock(payload.isCodeId);

  const result = await sendAiMessage(
    [
      {
        role: "user",
        content: `${contextBlock}${isDocBlock}\n\nGenerate process description points for this BIS application.`,
      },
    ],
    AUTO_GENERATE_SYSTEM,
    undefined,
    4096,
  );

  if (!result.ok) return result;

  const points = parsePointsFromJsonReply(result.reply);
  if (points.length === 0) {
    return {
      ok: false,
      error: "QE Assistant could not generate valid process description points. Try again.",
    };
  }

  return { ok: true, points };
}
