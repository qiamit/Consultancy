"use server";

import { parseApplicationChecklistNotes } from "@backend/modules/bis/application-checklist-notes";
import {
  documentHasContent as processFlowHasContent,
  parseProcessFlowChart,
} from "@backend/modules/bis/process-flow-chart";
import {
  documentHasContent as plantLayoutHasContent,
  parsePlantLayout,
} from "@backend/modules/bis/plant-layout";
import {
  documentHasContent as cmpf305HasContent,
  parseCmpf305Machinery,
} from "@backend/modules/bis/cmpf-305";
import {
  documentHasContent as cmpf306HasContent,
  parseCmpf306,
} from "@backend/modules/bis/cmpf-306";
import {
  applicationProjectKindDbValues,
  inFilter,
  isApplicationProjectKind,
} from "@backend/modules/bis/bis-project-kind";
import { formatCmDisplay } from "@backend/modules/bis/bis-project-license-status";
import {
  CHECKLIST_IMPORT_DOCUMENT_LABELS,
  type ChecklistImportCandidate,
  type ChecklistImportDocumentKey,
  type ChecklistImportExclude,
  type ChecklistImportKind,
  type ChecklistImportPayload,
  type ChecklistImportSourceTable,
} from "@backend/modules/bis/checklist-document-import-meta";
import { createClient } from "@backend/db/client/server";

type NotesRow = {
  id: string;
  title: string | null;
  project_kind: string;
  cm_l_digits: string | null;
  notes: string | null;
  updated_at: string | null;
  is_codes?: { is_number: string | null } | null;
};

function labelForRow(row: NotesRow): string {
  const cm = formatCmDisplay(row.project_kind, row.cm_l_digits).trim();
  const title = (row.title ?? "").trim();
  const isNumber = (row.is_codes?.is_number ?? "").trim();
  const parts = [
    cm && cm !== "—" ? cm : null,
    title || null,
    isNumber ? `IS ${isNumber}` : null,
  ].filter(Boolean);
  return parts.join(" · ") || "Untitled";
}

function asIsoTimestamp(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || null;
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return new Date(value).toISOString();
  }
  const asString = String(value ?? "").trim();
  return asString || null;
}

function notesHaveDocument(
  notes: string | null,
  documentKey: ChecklistImportDocumentKey,
): boolean {
  try {
    const parsed = parseApplicationChecklistNotes(notes);
    switch (documentKey) {
      case "process_flow_chart":
        return processFlowHasContent(parsed.processFlowChart);
      case "plant_layout":
        return plantLayoutHasContent(parsed.plantLayout);
      case "cmpf_305":
        return cmpf305HasContent(parsed.cmpf305Machinery);
      case "cmpf_306":
        return cmpf306HasContent(parsed.cmpf306);
      default:
        return false;
    }
  } catch {
    return false;
  }
}

function extractDocument(
  notes: string | null,
  documentKey: ChecklistImportDocumentKey,
): ChecklistImportPayload | null {
  const parsed = parseApplicationChecklistNotes(notes);
  switch (documentKey) {
    case "process_flow_chart": {
      const document = parseProcessFlowChart(parsed.processFlowChart);
      if (!processFlowHasContent(document)) return null;
      return { key: "process_flow_chart", document };
    }
    case "plant_layout": {
      const document = parsePlantLayout(parsed.plantLayout);
      if (!plantLayoutHasContent(document)) return null;
      return { key: "plant_layout", document };
    }
    case "cmpf_305": {
      const document = parseCmpf305Machinery(parsed.cmpf305Machinery);
      if (!cmpf305HasContent(document)) return null;
      return { key: "cmpf_305", document };
    }
    case "cmpf_306": {
      const document = parseCmpf306(parsed.cmpf306);
      if (!cmpf306HasContent(document)) return null;
      return { key: "cmpf_306", document };
    }
    default:
      return null;
  }
}

function toCandidate(
  row: NotesRow,
  source: ChecklistImportSourceTable,
  documentKey: ChecklistImportDocumentKey,
): ChecklistImportCandidate {
  return {
    id: row.id,
    source,
    label: labelForRow(row),
    hasDocument: notesHaveDocument(row.notes, documentKey),
    updatedAt: asIsoTimestamp(row.updated_at),
  };
}

function isExcluded(
  rowId: string,
  source: ChecklistImportSourceTable,
  exclude?: ChecklistImportExclude | null,
): boolean {
  return Boolean(exclude && exclude.id === rowId && exclude.source === source);
}

export async function listChecklistDocumentImportCandidates(input: {
  clientId: string;
  kind: ChecklistImportKind;
  documentKey: ChecklistImportDocumentKey;
  exclude?: ChecklistImportExclude | null;
}): Promise<
  | { ok: true; candidates: ChecklistImportCandidate[] }
  | { ok: false; error: string }
> {
  const clientId = input.clientId?.trim();
  if (!clientId) return { ok: false, error: "Select a party first." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const applicationKinds = await applicationProjectKindDbValues(supabase);
  const applicationIn = inFilter(applicationKinds);
  const selectCols =
    "id, title, project_kind, cm_l_digits, notes, updated_at, is_codes(is_number)";

  const candidates: ChecklistImportCandidate[] = [];

  if (input.kind === "application") {
    const [{ data: apps, error: appsError }, { data: projectApps, error: projectsError }] =
      await Promise.all([
        supabase
          .from("bis_new_applications")
          .select(selectCols)
          .eq("client_id", clientId)
          .order("updated_at", { ascending: false }),
        supabase
          .from("bis_projects")
          .select(selectCols)
          .eq("client_id", clientId)
          .in("project_kind", applicationKinds)
          .order("updated_at", { ascending: false }),
      ]);

    if (appsError) return { ok: false, error: appsError.message };
    if (projectsError) return { ok: false, error: projectsError.message };

    for (const row of (apps ?? []) as NotesRow[]) {
      if (!isApplicationProjectKind(row.project_kind)) continue;
      if (isExcluded(row.id, "bis_new_applications", input.exclude)) continue;
      candidates.push(toCandidate(row, "bis_new_applications", input.documentKey));
    }
    for (const row of (projectApps ?? []) as NotesRow[]) {
      if (isExcluded(row.id, "bis_projects", input.exclude)) continue;
      candidates.push(toCandidate(row, "bis_projects", input.documentKey));
    }
  } else {
    const { data: licenses, error } = await supabase
      .from("bis_projects")
      .select(selectCols)
      .eq("client_id", clientId)
      .not("project_kind", "in", applicationIn)
      .order("updated_at", { ascending: false });

    if (error) return { ok: false, error: error.message };

    for (const row of (licenses ?? []) as NotesRow[]) {
      if (isApplicationProjectKind(row.project_kind)) continue;
      if (isExcluded(row.id, "bis_projects", input.exclude)) continue;
      candidates.push(toCandidate(row, "bis_projects", input.documentKey));
    }
  }

  candidates.sort((a, b) => {
    if (a.hasDocument !== b.hasDocument) return a.hasDocument ? -1 : 1;
    const at = asIsoTimestamp(a.updatedAt) ?? "";
    const bt = asIsoTimestamp(b.updatedAt) ?? "";
    return bt.localeCompare(at);
  });

  return { ok: true, candidates };
}

export async function loadChecklistDocumentForImport(input: {
  id: string;
  source: ChecklistImportSourceTable;
  documentKey: ChecklistImportDocumentKey;
}): Promise<
  | { ok: true; payload: ChecklistImportPayload; label: string }
  | { ok: false; error: string }
> {
  const id = input.id?.trim();
  if (!id) return { ok: false, error: "Select an application or license." };
  if (input.source !== "bis_new_applications" && input.source !== "bis_projects") {
    return { ok: false, error: "Invalid source." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const { data, error } = await supabase
    .from(input.source)
    .select(
      "id, title, project_kind, cm_l_digits, notes, updated_at, is_codes(is_number)",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Record not found." };

  const row = data as NotesRow;
  const payload = extractDocument(row.notes, input.documentKey);
  if (!payload) {
    const label = CHECKLIST_IMPORT_DOCUMENT_LABELS[input.documentKey];
    return {
      ok: false,
      error: `Selected record has no ${label} to import.`,
    };
  }

  return {
    ok: true,
    payload,
    label: labelForRow(row),
  };
}
