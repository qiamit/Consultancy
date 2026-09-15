"use server";

import {
  listChecklistDocumentImportCandidates,
  loadChecklistDocumentForImport,
} from "@backend/actions/checklist-document-import";
import type {
  ChecklistImportCandidate,
  ChecklistImportExclude,
  ChecklistImportKind,
  ChecklistImportSourceTable,
} from "@backend/modules/bis/checklist-document-import-meta";
import type { ProcessFlowChartStored } from "@backend/modules/bis/process-flow-chart";

/** @deprecated Use ChecklistImport* types from checklist-document-import-meta. */
export type ProcessFlowImportKind = ChecklistImportKind;
export type ProcessFlowImportSourceTable = ChecklistImportSourceTable;
export type ProcessFlowImportExclude = ChecklistImportExclude;
export type ProcessFlowImportCandidate = ChecklistImportCandidate & {
  hasChart: boolean;
};

export async function listProcessFlowChartImportCandidates(input: {
  clientId: string;
  kind: ProcessFlowImportKind;
  exclude?: ProcessFlowImportExclude | null;
}): Promise<
  | { ok: true; candidates: ProcessFlowImportCandidate[] }
  | { ok: false; error: string }
> {
  const res = await listChecklistDocumentImportCandidates({
    ...input,
    documentKey: "process_flow_chart",
  });
  if (!res.ok) return res;
  return {
    ok: true,
    candidates: res.candidates.map((c) => ({
      ...c,
      hasChart: c.hasDocument,
    })),
  };
}

export async function loadProcessFlowChartForImport(input: {
  id: string;
  source: ProcessFlowImportSourceTable;
}): Promise<
  | { ok: true; document: ProcessFlowChartStored; label: string }
  | { ok: false; error: string }
> {
  const res = await loadChecklistDocumentForImport({
    ...input,
    documentKey: "process_flow_chart",
  });
  if (!res.ok) return res;
  if (res.payload.key !== "process_flow_chart") {
    return { ok: false, error: "Selected record has no Process Flow Chart to import." };
  }
  return {
    ok: true,
    document: res.payload.document,
    label: res.label,
  };
}
