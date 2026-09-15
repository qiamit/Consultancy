import type { ProcessFlowChartStored } from "@backend/modules/bis/process-flow-chart";
import type { PlantLayoutStored } from "@backend/modules/bis/plant-layout";
import type { Cmpf305MachineryStored } from "@backend/modules/bis/cmpf-305";
import type { Cmpf306Stored } from "@backend/modules/bis/cmpf-306";

export type ChecklistImportDocumentKey =
  | "process_flow_chart"
  | "plant_layout"
  | "cmpf_305"
  | "cmpf_306";

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
  | { key: "cmpf_306"; document: Cmpf306Stored };

export const CHECKLIST_IMPORT_DOCUMENT_LABELS: Record<
  ChecklistImportDocumentKey,
  string
> = {
  process_flow_chart: "Process Flow Chart",
  plant_layout: "Plant Layout",
  cmpf_305: "Plant & Machinery",
  cmpf_306: "Testing Equipment",
};
