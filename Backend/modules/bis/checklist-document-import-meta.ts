import type { ProcessFlowChartStored } from "@backend/modules/bis/process-flow-chart";
import type { PlantLayoutStored } from "@backend/modules/bis/plant-layout";
import type { Cmpf305MachineryStored } from "@backend/modules/bis/cmpf-305";
import type { Cmpf306Stored } from "@backend/modules/bis/cmpf-306";
import type { Cmpf307Stored } from "@backend/modules/bis/cmpf-307";
import type { Cmpf311Stored } from "@backend/modules/bis/cmpf-311";
import type { RawMaterialStored } from "@backend/modules/bis/raw-material-details";
import type { CertifiedReferenceMaterialStored } from "@backend/modules/bis/certified-reference-materials";
import type { LocationMapStored } from "@backend/modules/bis/location-map";
import type { TopManagementStored } from "@backend/modules/bis/top-management";
import type { TechnicalStaffStored } from "@backend/modules/bis/technical-staff";
import type { ApplicationMeta } from "@backend/modules/bis/application-checklist-notes";
import type { LegalDocumentStored } from "@backend/modules/bis/legal-documents";
import type { UndertakingGeneralIssStored } from "@backend/modules/bis/undertaking-general-iss";
import type { SelfEvaluationFormStored } from "@backend/modules/bis/self-evaluation-form";
import type { OslSampleRequirementStored } from "@backend/modules/bis/osl-sample-requirements";

export type ApplicationDetailsImportDocument = {
  meta: ApplicationMeta;
  legalDocuments: LegalDocumentStored[];
};

export type ChecklistImportDocumentKey =
  | "process_flow_chart"
  | "plant_layout"
  | "cmpf_305"
  | "cmpf_306"
  | "cmpf_307"
  | "cmpf_311"
  | "raw_material_details"
  | "certified_reference_materials"
  | "application_details"
  | "undertaking_general_iss"
  | "self_evaluation_form"
  | "osl_sample_requirements"
  | "pi_sample_requirements"
  | "location_map"
  | "top_management"
  | "technical_staff";

export type ChecklistImportKind = "application" | "license";

export type ChecklistImportSourceTable =
  | "bis_new_applications"
  | "bis_projects";

export type ChecklistImportCandidate = {
  id: string;
  source: ChecklistImportSourceTable;
  label: string;
  hasDocument: boolean;
  updatedAt: string | null;
};

export type ChecklistImportExclude = {
  id: string;
  source: ChecklistImportSourceTable;
};

export type ChecklistImportPayload =
  | { key: "process_flow_chart"; document: ProcessFlowChartStored }
  | { key: "plant_layout"; document: PlantLayoutStored }
  | { key: "cmpf_305"; document: Cmpf305MachineryStored[] }
  | { key: "cmpf_306"; document: Cmpf306Stored }
  | { key: "cmpf_307"; document: Cmpf307Stored }
  | { key: "cmpf_311"; document: Cmpf311Stored }
  | { key: "raw_material_details"; document: RawMaterialStored[] }
  | { key: "certified_reference_materials"; document: CertifiedReferenceMaterialStored[] }
  | { key: "application_details"; document: ApplicationDetailsImportDocument }
  | { key: "undertaking_general_iss"; document: UndertakingGeneralIssStored }
  | { key: "self_evaluation_form"; document: SelfEvaluationFormStored }
  | { key: "osl_sample_requirements"; document: OslSampleRequirementStored[] }
  | { key: "pi_sample_requirements"; document: OslSampleRequirementStored[] }
  | { key: "location_map"; document: LocationMapStored }
  | { key: "top_management"; document: TopManagementStored[] }
  | { key: "technical_staff"; document: TechnicalStaffStored[] };

export const CHECKLIST_IMPORT_DOCUMENT_LABELS: Record<
  ChecklistImportDocumentKey,
  string
> = {
  process_flow_chart: "Process Flow Chart",
  plant_layout: "Plant Layout",
  cmpf_305: "Plant & Machinery",
  cmpf_306: "Testing Equipment",
  cmpf_307: "Brand Names",
  cmpf_311: "SIT Acceptance",
  raw_material_details: "Raw Material Details",
  certified_reference_materials: "List of Certified Reference Material",
  application_details: "Application Details",
  undertaking_general_iss: "Undertaking for General ISS",
  self_evaluation_form: "Self Evaluation Form",
  osl_sample_requirements: "Sample for Out Side Lab",
  pi_sample_requirements: "Sample Offer for Inspection",
  location_map: "Location Map",
  top_management: "Top Management",
  technical_staff: "Technical Staff",
};
