"use server";

import { sendAiMessage } from "@backend/actions/ai-chat";
import { createClient } from "@backend/db/client/server";
import { extractDocumentText } from "@backend/modules/is-code/extract-document-text";
import { DOCUMENTS_BUCKET } from "@backend/modules/storage/documents";
import {
  sampleFailureTypeLabel,
} from "@backend/modules/bis/sample-failure-reply";
import { formatCmDisplay } from "@backend/modules/bis/bis-project-license-status";
import { parseApplicationChecklistNotes } from "@backend/modules/bis/application-checklist-notes";
import {
  combineOslAndPiSamples,
  documentHasContent as oslDocumentHasContent,
  rowHasContent as oslRowHasContent,
  type OslSampleRequirementStored,
} from "@backend/modules/bis/osl-sample-requirements";
import {
  ftrReportHasContent,
  type FactoryTestReportStored,
} from "@backend/modules/bis/factory-test-report";

const SYSTEM_PROMPT = `You are a senior BIS (Bureau of Indian Standards) consultancy expert who drafts formal sample-failure reply letters for Indian manufacturers holding ISI/BIS licences.

Your reply must:
- Be professional, factual, and suitable to submit on Manak Online / to BIS
- Address the sample failure findings with clear root-cause understanding when evidence allows
- Reference the IS code requirements relevant to the failed parameters
- Propose corrective and preventive actions (CAPA) the firm will take
- Confirm that factory test report / re-testing supports conformance where applicable
- Mention enclosed documents: Sample Failure Letter, Sample Offer Letter, and Factory Test Report
- Use formal Indian English letter style (no markdown headings, no bullet emoji)
- Do not invent lab results, clause numbers, or dates that are not in the provided context
- If evidence is incomplete, state what is known and what will be verified

Return ONLY the reply letter body (including a short subject line as the first line starting with "Subject:"). No markdown fences.`;

function clip(text: string, max = 12000): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}\n\n[…truncated…]`;
}

async function extractStoredPdfText(
  supabase: Awaited<ReturnType<typeof createClient>>,
  storagePath: string | null | undefined,
  fileName: string | null | undefined,
): Promise<string> {
  const path = (storagePath ?? "").trim();
  if (!path) return "";
  try {
    const { data, error } = await supabase.storage.from(DOCUMENTS_BUCKET).download(path);
    if (error || !data) return "";
    const buffer = Buffer.from(await data.arrayBuffer());
    const name = (fileName ?? path.split("/").pop() ?? "document.pdf").trim();
    return clip(await extractDocumentText(buffer, name), 8000);
  } catch {
    return "";
  }
}

function summarizeOslSamples(rows: OslSampleRequirementStored[]): string {
  const filled = rows.filter(oslRowHasContent);
  if (filled.length === 0) return "";
  return filled
    .slice(0, 12)
    .map((row, index) => {
      const parts = [
        `#${index + 1}`,
        row.sample_for ? `for=${row.sample_for}` : null,
        row.sample_description ? `desc=${row.sample_description}` : null,
        row.batch_number ? `batch=${row.batch_number}` : null,
        row.date_of_manufacturing ? `dom=${row.date_of_manufacturing}` : null,
        row.declared_value ? `declared=${row.declared_value}` : null,
        row.sample_quantity ? `qty=${row.sample_quantity}` : null,
        row.laboratory_name ? `lab=${row.laboratory_name}` : null,
        row.sample_code ? `code=${row.sample_code}` : null,
      ].filter(Boolean);
      return parts.join(" | ");
    })
    .join("\n");
}

function summarizeFactoryReports(rows: FactoryTestReportStored[]): string {
  const filled = rows.filter(ftrReportHasContent);
  if (filled.length === 0) return "";
  return filled
    .slice(0, 8)
    .map((report, index) => {
      const tests = (report.test_rows ?? [])
        .filter((t) => t.row_type === "test")
        .slice(0, 20)
        .map((t) => {
          const clause = (t.clause_no ?? "").trim();
          const req = (t.specified_requirements ?? "").trim();
          const result = (t.observed_value ?? "").trim();
          const rem = (t.remark ?? "").trim();
          return `- ${[clause && `Cl.${clause}`, t.test_name, req, result && `observed=${result}`, rem && `remark=${rem}`]
            .filter(Boolean)
            .join(" · ")}`;
        })
        .filter(Boolean)
        .join("\n");
      return [
        `Report #${index + 1}`,
        report.batch_heat_number ? `Batch: ${report.batch_heat_number}` : null,
        report.date_of_manufacturing ? `DOM: ${report.date_of_manufacturing}` : null,
        report.date_of_testing_start ? `Testing start: ${report.date_of_testing_start}` : null,
        report.date_of_testing_completion
          ? `Testing end: ${report.date_of_testing_completion}`
          : null,
        tests ? `Tests:\n${tests}` : null,
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");
}

export async function draftSampleFailureReply(
  replyId: string,
): Promise<{ ok: true; draft: string } | { ok: false; error: string }> {
  const id = replyId.trim();
  if (!id) return { ok: false, error: "Missing sample failure reply id." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data, error } = await supabase
    .from("bis_sample_failure_replies")
    .select(
      "id, bis_project_id, sample_failure_type, sample_code, sample_qr_code, cm_l_digits, project_kind, notes, failure_letter_path, failure_letter_name, offer_letter_path, offer_letter_name, factory_test_report_path, factory_test_report_name, reply_draft, clients(name, company_name, address, city, state), is_codes(is_number, revision_year, is_code_title, product_manual_number, unit_of_is)",
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Sample failure record not found." };
  }

  const row = data as Record<string, unknown>;
  const client = (Array.isArray(row.clients) ? row.clients[0] : row.clients) as {
    name?: string | null;
    company_name?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
  } | null;
  const isCode = (Array.isArray(row.is_codes) ? row.is_codes[0] : row.is_codes) as {
    is_number?: string | null;
    revision_year?: number | null;
    is_code_title?: string | null;
    product_manual_number?: string | null;
    unit_of_is?: string | null;
  } | null;

  const firmName = client?.company_name?.trim() || client?.name?.trim() || "the firm";
  const isLabel = [
    isCode?.is_number,
    isCode?.revision_year ? `:${isCode.revision_year}` : "",
  ]
    .join("")
    .trim();
  const cmL = formatCmDisplay(
    (row.project_kind as string | null) ?? "licence",
    (row.cm_l_digits as string | null) ?? null,
  );

  const failureLetterText = await extractStoredPdfText(
    supabase,
    row.failure_letter_path as string | null,
    row.failure_letter_name as string | null,
  );
  const offerLetterText = await extractStoredPdfText(
    supabase,
    row.offer_letter_path as string | null,
    row.offer_letter_name as string | null,
  );
  const factoryReportText = await extractStoredPdfText(
    supabase,
    row.factory_test_report_path as string | null,
    row.factory_test_report_name as string | null,
  );

  let checklistOfferSummary = "";
  let checklistFtrSummary = "";
  const projectId = String(row.bis_project_id ?? "").trim();
  if (projectId) {
    const { data: project } = await supabase
      .from("bis_projects")
      .select("notes")
      .eq("id", projectId)
      .maybeSingle();
    const parsed = parseApplicationChecklistNotes(
      String((project as { notes?: string | null } | null)?.notes ?? ""),
    );
    const samples = combineOslAndPiSamples(
      parsed.oslSampleRequirements,
      parsed.piSampleRequirements,
    );
    if (oslDocumentHasContent(samples)) {
      checklistOfferSummary = summarizeOslSamples(samples);
    }
    if (parsed.factoryTestReports.some(ftrReportHasContent)) {
      checklistFtrSummary = summarizeFactoryReports(parsed.factoryTestReports);
    }
  }

  const contextBlocks = [
    `Firm: ${firmName}`,
    client?.address || client?.city || client?.state
      ? `Address: ${[client?.address, client?.city, client?.state].filter(Boolean).join(", ")}`
      : null,
    `CM/L Number: ${cmL}`,
    `IS Code: ${isLabel || "—"}`,
    `IS Title: ${isCode?.is_code_title?.trim() || "—"}`,
    `Product Manual: ${isCode?.product_manual_number?.trim() || "—"}`,
    `Unit of IS: ${isCode?.unit_of_is?.trim() || "—"}`,
    `Type of Sample Failure: ${sampleFailureTypeLabel(String(row.sample_failure_type ?? ""))}`,
    `Sample Code: ${String(row.sample_code ?? "").trim() || "—"}`,
    `Sample QR Code: ${String(row.sample_qr_code ?? "").trim() || "—"}`,
    row.notes ? `Internal notes: ${String(row.notes)}` : null,
    `Failure letter file: ${String(row.failure_letter_name ?? "—")}`,
    `Offer letter file: ${String(row.offer_letter_name ?? "not uploaded yet")}`,
    `Factory test report file: ${String(row.factory_test_report_name ?? "not uploaded yet")}`,
    checklistOfferSummary ? "Sample Offer Letter checklist: available" : "Sample Offer Letter checklist: missing",
    checklistFtrSummary ? "Factory Test Report checklist: available" : "Factory Test Report checklist: missing",
  ]
    .filter(Boolean)
    .join("\n");

  const userPrompt = `Draft a BIS sample failure reply for Manak Online submission using the context below.

CASE DETAILS
${contextBlocks}

SAMPLE FAILURE LETTER CONTENT (extract / OCR text; may be partial)
${failureLetterText || "(No extractable text from the Sample Failure Letter yet. Draft a professional reply framework that asks to align with the attached letter findings.)"}

SAMPLE OFFER LETTER — GENERATED CHECKLIST SUMMARY
${checklistOfferSummary || "(Not prepared yet in linked licence checklist.)"}

SAMPLE OFFER LETTER — UPLOADED FILE TEXT
${offerLetterText || "(No uploaded offer letter file.)"}

FACTORY TEST REPORT — GENERATED CHECKLIST SUMMARY
${checklistFtrSummary || "(Not prepared yet in linked licence checklist.)"}

FACTORY TEST REPORT — UPLOADED FILE TEXT
${factoryReportText || "(No uploaded factory test report file.)"}

IS / PRODUCT CONTEXT FROM MASTER
Use the IS number/title/product above. Apply general BIS sample-failure reply practice for Indian licence holders (acknowledgement, understanding of failure, corrective action, assurance of conformance, request for favourable consideration). Do not invent specific lab readings.

${row.reply_draft ? `EXISTING DRAFT TO IMPROVE\n${String(row.reply_draft).trim()}` : ""}

Write the improved formal reply now.`;

  const result = await sendAiMessage(
    [{ role: "user", content: userPrompt }],
    SYSTEM_PROMPT,
    undefined,
    4096,
  );

  if (!result.ok) return result;

  const draft = result.reply.trim().replace(/^```[a-z]*\n?|\n?```$/gi, "");
  if (!draft) {
    return { ok: false, error: "AI returned an empty reply draft. Try again." };
  }

  await supabase
    .from("bis_sample_failure_replies")
    .update({ reply_draft: draft, status: "drafted" })
    .eq("id", id);

  return { ok: true, draft };
}
