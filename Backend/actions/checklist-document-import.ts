"use server";

import { parseApplicationChecklistNotes, applicationMetaHasContent } from "@backend/modules/bis/application-checklist-notes";
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
  documentHasContent as cmpf307HasContent,
  parseCmpf307,
} from "@backend/modules/bis/cmpf-307";
import {
  documentHasContent as cmpf311HasContent,
  parseCmpf311,
} from "@backend/modules/bis/cmpf-311";
import {
  documentHasContent as rawMaterialHasContent,
  parseRawMaterialDetails,
} from "@backend/modules/bis/raw-material-details";
import {
  documentHasContent as certifiedReferenceMaterialsHasContent,
  parseCertifiedReferenceMaterials,
} from "@backend/modules/bis/certified-reference-materials";
import {
  parseLegalDocuments,
  rowHasContent as legalDocumentRowHasContent,
} from "@backend/modules/bis/legal-documents";
import {
  documentHasContent as undertakingGeneralIssHasContent,
  parseUndertakingGeneralIss,
} from "@backend/modules/bis/undertaking-general-iss";
import {
  documentHasContent as selfEvaluationFormHasContent,
  parseSelfEvaluationForm,
} from "@backend/modules/bis/self-evaluation-form";
import {
  documentHasContent as oslSampleRequirementsHasContent,
  parseOslSampleRequirements,
} from "@backend/modules/bis/osl-sample-requirements";
import {
  documentHasContent as locationMapHasContent,
  parseLocationMap,
} from "@backend/modules/bis/location-map";
import {
  documentHasContent as topManagementHasContent,
  parseTopManagement,
} from "@backend/modules/bis/top-management";
import {
  documentHasContent as technicalStaffHasContent,
  parseTechnicalStaff,
} from "@backend/modules/bis/technical-staff";
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
      case "cmpf_307":
        return cmpf307HasContent(parsed.cmpf307);
      case "cmpf_311":
        return cmpf311HasContent(parsed.cmpf311);
      case "raw_material_details":
        return rawMaterialHasContent(parsed.rawMaterialDetails);
      case "certified_reference_materials":
        return certifiedReferenceMaterialsHasContent(parsed.certifiedReferenceMaterials);
      case "application_details":
        return (
          applicationMetaHasContent(parsed.meta) ||
          parsed.legalDocuments.some(legalDocumentRowHasContent)
        );
      case "undertaking_general_iss":
        return undertakingGeneralIssHasContent(parsed.undertakingGeneralIss);
      case "self_evaluation_form":
        return selfEvaluationFormHasContent(parsed.selfEvaluationForm);
      case "osl_sample_requirements":
        return oslSampleRequirementsHasContent(parsed.oslSampleRequirements);
      case "pi_sample_requirements":
        return oslSampleRequirementsHasContent(parsed.piSampleRequirements);
      case "location_map":
        return locationMapHasContent(parsed.locationMap);
      case "top_management":
        return topManagementHasContent(parsed.topManagement);
      case "technical_staff":
        return technicalStaffHasContent(parsed.technicalStaff);
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
    case "cmpf_307": {
      const document = parseCmpf307(parsed.cmpf307);
      if (!cmpf307HasContent(document)) return null;
      return { key: "cmpf_307", document };
    }
    case "cmpf_311": {
      const document = parseCmpf311(parsed.cmpf311);
      if (!cmpf311HasContent(document)) return null;
      return { key: "cmpf_311", document };
    }
    case "raw_material_details": {
      const document = parseRawMaterialDetails(parsed.rawMaterialDetails);
      if (!rawMaterialHasContent(document)) return null;
      return { key: "raw_material_details", document };
    }
    case "certified_reference_materials": {
      const document = parseCertifiedReferenceMaterials(parsed.certifiedReferenceMaterials);
      if (!certifiedReferenceMaterialsHasContent(document)) return null;
      return { key: "certified_reference_materials", document };
    }
    case "application_details": {
      const meta = parsed.meta;
      const legalDocuments = parseLegalDocuments(parsed.legalDocuments).filter(
        legalDocumentRowHasContent,
      );
      if (!applicationMetaHasContent(meta) && legalDocuments.length === 0) return null;
      return { key: "application_details", document: { meta, legalDocuments } };
    }
    case "undertaking_general_iss": {
      const document = parseUndertakingGeneralIss(parsed.undertakingGeneralIss);
      if (!undertakingGeneralIssHasContent(document)) return null;
      return { key: "undertaking_general_iss", document };
    }
    case "self_evaluation_form": {
      const document = parseSelfEvaluationForm(parsed.selfEvaluationForm);
      if (!selfEvaluationFormHasContent(document)) return null;
      return { key: "self_evaluation_form", document };
    }
    case "osl_sample_requirements": {
      const document = parseOslSampleRequirements(parsed.oslSampleRequirements);
      if (!oslSampleRequirementsHasContent(document)) return null;
      return { key: "osl_sample_requirements", document };
    }
    case "pi_sample_requirements": {
      const document = parseOslSampleRequirements(parsed.piSampleRequirements);
      if (!oslSampleRequirementsHasContent(document)) return null;
      return { key: "pi_sample_requirements", document };
    }
    case "location_map": {
      const document = parseLocationMap(parsed.locationMap);
      if (!locationMapHasContent(document)) return null;
      return { key: "location_map", document };
    }
    case "top_management": {
      const document = parseTopManagement(parsed.topManagement);
      if (!topManagementHasContent(document)) return null;
      return { key: "top_management", document };
    }
    case "technical_staff": {
      const document = parseTechnicalStaff(parsed.technicalStaff);
      if (!technicalStaffHasContent(document)) return null;
      return { key: "technical_staff", document };
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
