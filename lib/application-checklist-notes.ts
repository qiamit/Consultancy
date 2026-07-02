import type { FactoryTestReportStored } from "@/lib/factory-test-report";
import { parseFactoryTestReports, ftrReportHasContent } from "@/lib/factory-test-report";
import { parseOslSampleRequirements, rowHasContent } from "@/lib/osl-sample-requirements";
import type { OslSampleRequirementStored } from "@/lib/osl-sample-requirements";
import {
  parseTechnicalStaff,
  rowHasContent as technicalStaffRowHasContent,
  type TechnicalStaffStored,
} from "@/lib/technical-staff";
import {
  parseTopManagement,
  rowHasContent as topManagementRowHasContent,
  type TopManagementStored,
} from "@/lib/top-management";
import {
  documentHasContent as subcontractedTestsDocumentHasContent,
  parseSubcontractedTests,
  parseSubcontractedTestsDocument,
  rowHasContent as subcontractedTestRowHasContent,
  type SubcontractedTestStored,
  type SubcontractedTestsDocumentStored,
  defaultSubcontractedTestsDocument,
} from "@/lib/subcontracted-tests";
import {
  parseCmpf305Machinery,
  rowHasContent as cmpf305RowHasContent,
  type Cmpf305MachineryStored,
} from "@/lib/cmpf-305";
import {
  parseRawMaterialDetails,
  rowHasContent as rawMaterialRowHasContent,
  type RawMaterialStored,
} from "@/lib/raw-material-details";
import {
  parseLegalDocuments,
  rowHasContent as legalDocumentRowHasContent,
  type LegalDocumentStored,
} from "@/lib/legal-documents";
import {
  parseCertifiedReferenceMaterials,
  rowHasContent as certifiedReferenceMaterialRowHasContent,
  type CertifiedReferenceMaterialStored,
} from "@/lib/certified-reference-materials";
import {
  defaultCmpf306Document,
  documentHasContent as cmpf306DocumentHasContent,
  parseCmpf306,
  type Cmpf306Stored,
} from "@/lib/cmpf-306";
import {
  defaultCmpf307Document,
  documentHasContent as cmpf307DocumentHasContent,
  parseCmpf307,
  type Cmpf307Stored,
} from "@/lib/cmpf-307";
import {
  defaultCmpf310Document,
  documentHasContent as cmpf310DocumentHasContent,
  parseCmpf310,
  type Cmpf310Stored,
} from "@/lib/cmpf-310";
import {
  defaultCmpf311Document,
  documentHasContent as cmpf311DocumentHasContent,
  parseCmpf311,
  type Cmpf311Stored,
} from "@/lib/cmpf-311";
import {
  defaultUndertakingOption2Document,
  documentHasContent as undertakingOption2DocumentHasContent,
  parseUndertakingOption2,
  type UndertakingOption2Stored,
} from "@/lib/undertaking-option-2";
import {
  defaultUndertakingGeneralIssDocument,
  documentHasContent as undertakingGeneralIssDocumentHasContent,
  parseUndertakingGeneralIss,
  type UndertakingGeneralIssStored,
} from "@/lib/undertaking-general-iss";
import {
  defaultAuthorizationLetterDocument,
  documentHasContent as authorizationLetterDocumentHasContent,
  parseAuthorizationLetter,
  type AuthorizationLetterStored,
} from "@/lib/authorization-letter";
import {
  defaultUndertakingLongDurationTestDocument,
  documentHasContent as undertakingLongDurationTestDocumentHasContent,
  parseUndertakingLongDurationTest,
  type UndertakingLongDurationTestStored,
} from "@/lib/undertaking-long-duration-test";
import {
  defaultUndertakingMinimumMarkingFeeDocument,
  documentHasContent as undertakingMinimumMarkingFeeDocumentHasContent,
  parseUndertakingMinimumMarkingFee,
  type UndertakingMinimumMarkingFeeStored,
} from "@/lib/undertaking-minimum-marking-fee";
import {
  defaultLocationMapDocument,
  documentHasContent as locationMapDocumentHasContent,
  parseLocationMap,
  type LocationMapStored,
} from "@/lib/location-map";
import {
  defaultPlantLayoutDocument,
  documentHasContent as plantLayoutDocumentHasContent,
  parsePlantLayout,
  type PlantLayoutStored,
} from "@/lib/plant-layout";
import {
  defaultProcessFlowChartDocument,
  documentHasContent as processFlowChartDocumentHasContent,
  parseProcessFlowChart,
  type ProcessFlowChartStored,
} from "@/lib/process-flow-chart";
import {
  defaultProcessDescriptionDocument,
  documentHasContent as processDescriptionDocumentHasContent,
  parseProcessDescription,
  type ProcessDescriptionStored,
} from "@/lib/process-description";
import {
  defaultUpdatedSchemeOfInspectionDocument,
  documentHasContent as updatedSchemeOfInspectionDocumentHasContent,
  parseUpdatedSchemeOfInspection,
  type UpdatedSchemeOfInspectionStored,
} from "@/lib/updated-scheme-of-inspection";
import {
  defaultSelfEvaluationFormDocument,
  documentHasContent as selfEvaluationFormDocumentHasContent,
  parseSelfEvaluationForm,
  type SelfEvaluationFormStored,
} from "@/lib/self-evaluation-form";

export const APPLICATION_NUMBER_PREFIX = "CM/A-" as const;

export const APPLICATION_WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export type ApplicationWeekday = (typeof APPLICATION_WEEKDAYS)[number];

export const DEFAULT_WEEKLY_OFF: ApplicationWeekday[] = ["Sunday"];

export type ApplicationProcedure = "Normal" | "Simplified";

export type LicenseScopeFormat = "plain" | "table";

export type LicenseScopeTableRow = {
  component: string;
  value: string;
};

export type ApplicationMeta = {
  application_procedure: ApplicationProcedure;
  application_number: string;
  date_of_application: string;
  bis_branch_name: string;
  dealing_officer_name: string;
  dealing_officer_designation: string;
  inspection_officer_name: string;
  inspection_officer_designation: string;
  branch_head_name: string;
  branch_head_designation: string;
  nature_of_inspection: string;
  date_of_inspection: string;
  marking_clause: string;
  packaging_clause: string;
  product_manual_number: string;
  firm_scale: string;
  weekly_off: string[];
};

export function defaultApplicationMeta(): ApplicationMeta {
  return {
    application_procedure: "Simplified",
    application_number: "",
    date_of_application: "",
    bis_branch_name: "",
    dealing_officer_name: "",
    dealing_officer_designation: "",
    inspection_officer_name: "",
    inspection_officer_designation: "",
    branch_head_name: "",
    branch_head_designation: "",
    nature_of_inspection: "",
    date_of_inspection: "",
    marking_clause: "",
    packaging_clause: "",
    product_manual_number: "",
    firm_scale: "",
    weekly_off: [...DEFAULT_WEEKLY_OFF],
  };
}

function parseWeeklyOff(raw: unknown): string[] {
  const allowed = new Set<string>(APPLICATION_WEEKDAYS);
  let parsed: string[] = [];

  if (Array.isArray(raw)) {
    parsed = raw
      .map((d) => String(d).trim())
      .filter((d) => d && allowed.has(d));
  } else if (typeof raw === "string" && raw.trim()) {
    parsed = raw
      .split(",")
      .map((s) => s.trim())
      .filter((d) => d && allowed.has(d));
  }

  return parsed.length > 0 ? parsed : [...DEFAULT_WEEKLY_OFF];
}

function stripApplicationNumberPrefix(value: string): string {
  const raw = (value ?? "").trim();
  if (raw.toUpperCase().startsWith(APPLICATION_NUMBER_PREFIX.toUpperCase())) {
    return raw.slice(APPLICATION_NUMBER_PREFIX.length).trim();
  }
  return raw;
}

export function parseApplicationMeta(raw: unknown): ApplicationMeta {
  const base = defaultApplicationMeta();
  if (!raw || typeof raw !== "object") return base;
  const m = raw as Record<string, unknown>;
  const procedure = String(m.application_procedure ?? "").trim();
  return {
    application_procedure:
      procedure === "Normal" || procedure === "Simplified" ? procedure : base.application_procedure,
    application_number: stripApplicationNumberPrefix(String(m.application_number ?? "")),
    date_of_application: String(m.date_of_application ?? "").trim(),
    bis_branch_name: String(m.bis_branch_name ?? "").trim(),
    dealing_officer_name: String(m.dealing_officer_name ?? "").trim(),
    dealing_officer_designation: String(m.dealing_officer_designation ?? "").trim(),
    inspection_officer_name: String(m.inspection_officer_name ?? "").trim(),
    inspection_officer_designation: String(m.inspection_officer_designation ?? "").trim(),
    branch_head_name: String(m.branch_head_name ?? "").trim(),
    branch_head_designation: String(m.branch_head_designation ?? "").trim(),
    nature_of_inspection: String(m.nature_of_inspection ?? "").trim(),
    date_of_inspection: String(m.date_of_inspection ?? "").trim(),
    marking_clause: String(m.marking_clause ?? "").trim(),
    packaging_clause: String(m.packaging_clause ?? "").trim(),
    product_manual_number: String(m.product_manual_number ?? "").trim(),
    firm_scale: String(m.firm_scale ?? "").trim(),
    weekly_off: parseWeeklyOff(m.weekly_off),
  };
}

export function parseApplicationChecklistNotes(notes: string | null | undefined): {
  items: unknown[];
  licenseScope: string;
  licenseScopeFormat: LicenseScopeFormat;
  licenseScopeRows: LicenseScopeTableRow[];
  oslSampleRequirements: OslSampleRequirementStored[];
  piSampleRequirements: OslSampleRequirementStored[];
  topManagement: TopManagementStored[];
  technicalStaff: TechnicalStaffStored[];
  factoryTestReports: FactoryTestReportStored[];
  subcontractedTests: SubcontractedTestStored[];
  subcontractedTestsDocument: SubcontractedTestsDocumentStored;
  cmpf305Machinery: Cmpf305MachineryStored[];
  rawMaterialDetails: RawMaterialStored[];
  certifiedReferenceMaterials: CertifiedReferenceMaterialStored[];
  cmpf306: Cmpf306Stored;
  cmpf307: Cmpf307Stored;
  cmpf310: Cmpf310Stored;
  cmpf311: Cmpf311Stored;
  undertakingOption2: UndertakingOption2Stored;
  undertakingGeneralIss: UndertakingGeneralIssStored;
  authorizationLetter: AuthorizationLetterStored;
  undertakingLongDurationTest: UndertakingLongDurationTestStored;
  undertakingMinimumMarkingFee: UndertakingMinimumMarkingFeeStored;
  locationMap: LocationMapStored;
  plantLayout: PlantLayoutStored;
  processFlowChart: ProcessFlowChartStored;
  processDescription: ProcessDescriptionStored;
  updatedSchemeOfInspection: UpdatedSchemeOfInspectionStored;
  selfEvaluationForm: SelfEvaluationFormStored;
  legalDocuments: LegalDocumentStored[];
  meta: ApplicationMeta;
} {
  const raw = (notes ?? "").trim();
  if (!raw || !raw.startsWith("{")) {
    return {
      items: [],
      licenseScope: raw,
      licenseScopeFormat: "plain",
      licenseScopeRows: [],
      oslSampleRequirements: [],
      piSampleRequirements: [],
      topManagement: [],
      technicalStaff: [],
      factoryTestReports: [],
      subcontractedTests: [],
      subcontractedTestsDocument: defaultSubcontractedTestsDocument(),
      cmpf305Machinery: [],
      rawMaterialDetails: [],
      certifiedReferenceMaterials: [],
      cmpf306: defaultCmpf306Document(),
      cmpf307: defaultCmpf307Document(),
      cmpf310: defaultCmpf310Document(),
      cmpf311: defaultCmpf311Document(),
      undertakingOption2: defaultUndertakingOption2Document(),
      undertakingGeneralIss: defaultUndertakingGeneralIssDocument(),
      authorizationLetter: defaultAuthorizationLetterDocument(),
      undertakingLongDurationTest: defaultUndertakingLongDurationTestDocument(),
      undertakingMinimumMarkingFee: defaultUndertakingMinimumMarkingFeeDocument(),
      locationMap: defaultLocationMapDocument(),
      plantLayout: defaultPlantLayoutDocument(),
      processFlowChart: defaultProcessFlowChartDocument(),
      processDescription: defaultProcessDescriptionDocument(),
      updatedSchemeOfInspection: defaultUpdatedSchemeOfInspectionDocument(),
      selfEvaluationForm: defaultSelfEvaluationFormDocument(),
      legalDocuments: [],
      meta: defaultApplicationMeta(),
    };
  }
  try {
    const parsed = JSON.parse(raw) as {
      type?: string;
      items?: unknown[];
      license_scope?: string;
      license_scope_format?: string;
      license_scope_rows?: unknown;
      osl_sample_requirements?: unknown;
      pi_sample_requirements?: unknown;
      top_management?: unknown;
      technical_staff?: unknown;
      factory_test_reports?: unknown;
      subcontracted_tests?: unknown;
      subcontracted_tests_document?: unknown;
      cmpf_305_machinery?: unknown;
      raw_material_details?: unknown;
      certified_reference_materials?: unknown;
      cmpf_306?: unknown;
      cmpf_307?: unknown;
      cmpf_310?: unknown;
      cmpf_311?: unknown;
      undertaking_option_2?: unknown;
      undertaking_general_iss?: unknown;
      authorization_letter?: unknown;
      undertaking_long_duration_test?: unknown;
      undertaking_minimum_marking_fee?: unknown;
      location_map?: unknown;
      plant_layout?: unknown;
      process_flow_chart?: unknown;
      process_description?: unknown;
      updated_scheme_of_inspection?: unknown;
      self_evaluation_form?: unknown;
      legal_documents?: unknown;
      meta?: unknown;
    };
    if (parsed.type !== "application_checklist") {
      return {
        items: [],
        licenseScope: raw,
        licenseScopeFormat: "plain",
        licenseScopeRows: [],
        oslSampleRequirements: [],
        piSampleRequirements: [],
        topManagement: [],
        technicalStaff: [],
        factoryTestReports: [],
        subcontractedTests: [],
        subcontractedTestsDocument: defaultSubcontractedTestsDocument(),
        cmpf305Machinery: [],
        rawMaterialDetails: [],
        certifiedReferenceMaterials: [],
        cmpf306: defaultCmpf306Document(),
        cmpf307: defaultCmpf307Document(),
        cmpf310: defaultCmpf310Document(),
        cmpf311: defaultCmpf311Document(),
        undertakingOption2: defaultUndertakingOption2Document(),
        undertakingGeneralIss: defaultUndertakingGeneralIssDocument(),
        authorizationLetter: defaultAuthorizationLetterDocument(),
        undertakingLongDurationTest: defaultUndertakingLongDurationTestDocument(),
        undertakingMinimumMarkingFee: defaultUndertakingMinimumMarkingFeeDocument(),
        locationMap: defaultLocationMapDocument(),
        plantLayout: defaultPlantLayoutDocument(),
        processFlowChart: defaultProcessFlowChartDocument(),
        processDescription: defaultProcessDescriptionDocument(),
        updatedSchemeOfInspection: defaultUpdatedSchemeOfInspectionDocument(),
        selfEvaluationForm: defaultSelfEvaluationFormDocument(),
        legalDocuments: [],
        meta: defaultApplicationMeta(),
      };
    }
    const rows = Array.isArray(parsed.license_scope_rows)
      ? parsed.license_scope_rows
          .map((row) => {
            if (!row || typeof row !== "object") return null;
            const r = row as Record<string, unknown>;
            return {
              component: String(r.component ?? "").trim(),
              value: String(r.value ?? "").trim(),
            };
          })
          .filter((r): r is LicenseScopeTableRow => r !== null)
      : [];
    return {
      items: Array.isArray(parsed.items) ? parsed.items : [],
      licenseScope: (parsed.license_scope ?? "").trim(),
      licenseScopeFormat: parsed.license_scope_format === "table" ? "table" : "plain",
      licenseScopeRows: rows,
      oslSampleRequirements: parseOslSampleRequirements(parsed.osl_sample_requirements),
      piSampleRequirements: parseOslSampleRequirements(parsed.pi_sample_requirements),
      topManagement: parseTopManagement(parsed.top_management),
      technicalStaff: parseTechnicalStaff(parsed.technical_staff),
      factoryTestReports: parseFactoryTestReports(parsed.factory_test_reports),
      subcontractedTests: parseSubcontractedTests(parsed.subcontracted_tests),
      subcontractedTestsDocument: parseSubcontractedTestsDocument(
        parsed.subcontracted_tests_document,
      ),
      cmpf305Machinery: parseCmpf305Machinery(parsed.cmpf_305_machinery),
      rawMaterialDetails: parseRawMaterialDetails(parsed.raw_material_details),
      certifiedReferenceMaterials: parseCertifiedReferenceMaterials(
        parsed.certified_reference_materials,
      ),
      cmpf306: parseCmpf306(parsed.cmpf_306),
      cmpf307: parseCmpf307(parsed.cmpf_307),
      cmpf310: parseCmpf310(parsed.cmpf_310),
      cmpf311: parseCmpf311(parsed.cmpf_311),
      undertakingOption2: parseUndertakingOption2(parsed.undertaking_option_2),
      undertakingGeneralIss: parseUndertakingGeneralIss(parsed.undertaking_general_iss),
      authorizationLetter: parseAuthorizationLetter(parsed.authorization_letter),
      undertakingLongDurationTest: parseUndertakingLongDurationTest(
        parsed.undertaking_long_duration_test,
      ),
      undertakingMinimumMarkingFee: parseUndertakingMinimumMarkingFee(
        parsed.undertaking_minimum_marking_fee,
      ),
      locationMap: parseLocationMap(parsed.location_map),
      plantLayout: parsePlantLayout(parsed.plant_layout),
      processFlowChart: parseProcessFlowChart(parsed.process_flow_chart),
      processDescription: parseProcessDescription(parsed.process_description),
      updatedSchemeOfInspection: parseUpdatedSchemeOfInspection(
        parsed.updated_scheme_of_inspection,
      ),
      selfEvaluationForm: parseSelfEvaluationForm(parsed.self_evaluation_form),
      legalDocuments: parseLegalDocuments(parsed.legal_documents),
      meta: parseApplicationMeta(parsed.meta),
    };
  } catch {
    return {
      items: [],
      licenseScope: raw,
      licenseScopeFormat: "plain",
      licenseScopeRows: [],
      oslSampleRequirements: [],
      piSampleRequirements: [],
      topManagement: [],
      technicalStaff: [],
      factoryTestReports: [],
      subcontractedTests: [],
      subcontractedTestsDocument: defaultSubcontractedTestsDocument(),
      cmpf305Machinery: [],
      rawMaterialDetails: [],
      certifiedReferenceMaterials: [],
      cmpf306: defaultCmpf306Document(),
      cmpf307: defaultCmpf307Document(),
      cmpf310: defaultCmpf310Document(),
      cmpf311: defaultCmpf311Document(),
      undertakingOption2: defaultUndertakingOption2Document(),
      undertakingGeneralIss: defaultUndertakingGeneralIssDocument(),
      authorizationLetter: defaultAuthorizationLetterDocument(),
      undertakingLongDurationTest: defaultUndertakingLongDurationTestDocument(),
      undertakingMinimumMarkingFee: defaultUndertakingMinimumMarkingFeeDocument(),
      locationMap: defaultLocationMapDocument(),
      plantLayout: defaultPlantLayoutDocument(),
      processFlowChart: defaultProcessFlowChartDocument(),
      processDescription: defaultProcessDescriptionDocument(),
      updatedSchemeOfInspection: defaultUpdatedSchemeOfInspectionDocument(),
      selfEvaluationForm: defaultSelfEvaluationFormDocument(),
      legalDocuments: [],
      meta: defaultApplicationMeta(),
    };
  }
}

function nonEmptySampleRows(
  rows: OslSampleRequirementStored[] | undefined,
): OslSampleRequirementStored[] {
  return (rows ?? []).filter((r) => rowHasContent(r));
}

function nonEmptyTopManagementRows(
  rows: TopManagementStored[] | undefined,
): TopManagementStored[] {
  return (rows ?? []).filter((r) => topManagementRowHasContent(r));
}

function nonEmptyTechnicalStaffRows(
  rows: TechnicalStaffStored[] | undefined,
): TechnicalStaffStored[] {
  return (rows ?? []).filter((r) => technicalStaffRowHasContent(r));
}

function nonEmptyFtrReports(
  rows: FactoryTestReportStored[] | undefined,
): FactoryTestReportStored[] {
  return (rows ?? []).filter((r) => ftrReportHasContent(r));
}

function nonEmptySubcontractedTests(
  rows: SubcontractedTestStored[] | undefined,
): SubcontractedTestStored[] {
  return (rows ?? []).filter((r) => subcontractedTestRowHasContent(r));
}

function nonEmptyCmpf305Machinery(
  rows: Cmpf305MachineryStored[] | undefined,
): Cmpf305MachineryStored[] {
  return (rows ?? []).filter((r) => cmpf305RowHasContent(r));
}

function nonEmptyRawMaterialDetails(
  rows: RawMaterialStored[] | undefined,
): RawMaterialStored[] {
  return (rows ?? []).filter((r) => rawMaterialRowHasContent(r));
}

function nonEmptyCertifiedReferenceMaterials(
  rows: CertifiedReferenceMaterialStored[] | undefined,
): CertifiedReferenceMaterialStored[] {
  return (rows ?? []).filter((r) => certifiedReferenceMaterialRowHasContent(r));
}

function nonEmptyLegalDocuments(
  rows: LegalDocumentStored[] | undefined,
): LegalDocumentStored[] {
  return (rows ?? []).filter((r) => legalDocumentRowHasContent(r));
}

function nonEmptyCmpf306(doc: Cmpf306Stored | undefined): Cmpf306Stored | null {
  if (!doc || !cmpf306DocumentHasContent(doc)) return null;
  return doc;
}

function nonEmptyCmpf307(doc: Cmpf307Stored | undefined): Cmpf307Stored | null {
  if (!doc || !cmpf307DocumentHasContent(doc)) return null;
  return doc;
}

function nonEmptyCmpf310(doc: Cmpf310Stored | undefined): Cmpf310Stored | null {
  if (!doc || !cmpf310DocumentHasContent(doc)) return null;
  return doc;
}

function nonEmptyCmpf311(doc: Cmpf311Stored | undefined): Cmpf311Stored | null {
  if (!doc || !cmpf311DocumentHasContent(doc)) return null;
  return doc;
}

function nonEmptySubcontractedTestsDocument(
  doc: SubcontractedTestsDocumentStored | undefined,
): SubcontractedTestsDocumentStored | null {
  if (!doc || !subcontractedTestsDocumentHasContent(doc)) return null;
  return doc;
}

function nonEmptyUndertakingOption2(
  doc: UndertakingOption2Stored | undefined,
): UndertakingOption2Stored | null {
  if (!doc || !undertakingOption2DocumentHasContent(doc)) return null;
  return doc;
}

function nonEmptyUndertakingGeneralIss(
  doc: UndertakingGeneralIssStored | undefined,
): UndertakingGeneralIssStored | null {
  if (!doc || !undertakingGeneralIssDocumentHasContent(doc)) return null;
  return doc;
}

function nonEmptyAuthorizationLetter(
  doc: AuthorizationLetterStored | undefined,
): AuthorizationLetterStored | null {
  if (!doc || !authorizationLetterDocumentHasContent(doc)) return null;
  return doc;
}

function nonEmptyUndertakingLongDurationTest(
  doc: UndertakingLongDurationTestStored | undefined,
): UndertakingLongDurationTestStored | null {
  if (!doc || !undertakingLongDurationTestDocumentHasContent(doc)) return null;
  return doc;
}

function nonEmptyUndertakingMinimumMarkingFee(
  doc: UndertakingMinimumMarkingFeeStored | undefined,
): UndertakingMinimumMarkingFeeStored | null {
  if (!doc || !undertakingMinimumMarkingFeeDocumentHasContent(doc)) return null;
  return doc;
}

function nonEmptyLocationMap(doc: LocationMapStored | undefined): LocationMapStored | null {
  if (!doc || !locationMapDocumentHasContent(doc)) return null;
  return doc;
}

function nonEmptyPlantLayout(doc: PlantLayoutStored | undefined): PlantLayoutStored | null {
  if (!doc || !plantLayoutDocumentHasContent(doc)) return null;
  return doc;
}

function nonEmptyProcessFlowChart(
  doc: ProcessFlowChartStored | undefined,
): ProcessFlowChartStored | null {
  if (!doc || !processFlowChartDocumentHasContent(doc)) return null;
  return doc;
}

function nonEmptyProcessDescription(
  doc: ProcessDescriptionStored | undefined,
): ProcessDescriptionStored | null {
  if (!doc || !processDescriptionDocumentHasContent(doc)) return null;
  return doc;
}

function nonEmptyUpdatedSchemeOfInspection(
  doc: UpdatedSchemeOfInspectionStored | undefined,
): UpdatedSchemeOfInspectionStored | null {
  if (!doc || !updatedSchemeOfInspectionDocumentHasContent(doc)) return null;
  return doc;
}

function nonEmptySelfEvaluationForm(
  doc: SelfEvaluationFormStored | undefined,
): SelfEvaluationFormStored | null {
  if (!doc || !selfEvaluationFormDocumentHasContent(doc)) return null;
  return doc;
}

export function buildApplicationChecklistPayload(input: {
  items: unknown[];
  licenseScope?: string;
  licenseScopeFormat?: LicenseScopeFormat;
  licenseScopeRows?: LicenseScopeTableRow[];
  oslSampleRequirements?: OslSampleRequirementStored[];
  piSampleRequirements?: OslSampleRequirementStored[];
  topManagement?: TopManagementStored[];
  technicalStaff?: TechnicalStaffStored[];
  factoryTestReports?: FactoryTestReportStored[];
  subcontractedTests?: SubcontractedTestStored[];
  subcontractedTestsDocument?: SubcontractedTestsDocumentStored;
  cmpf305Machinery?: Cmpf305MachineryStored[];
  rawMaterialDetails?: RawMaterialStored[];
  certifiedReferenceMaterials?: CertifiedReferenceMaterialStored[];
  cmpf306?: Cmpf306Stored;
  cmpf307?: Cmpf307Stored;
  cmpf310?: Cmpf310Stored;
  cmpf311?: Cmpf311Stored;
  undertakingOption2?: UndertakingOption2Stored;
  undertakingGeneralIss?: UndertakingGeneralIssStored;
  authorizationLetter?: AuthorizationLetterStored;
  undertakingLongDurationTest?: UndertakingLongDurationTestStored;
  undertakingMinimumMarkingFee?: UndertakingMinimumMarkingFeeStored;
  locationMap?: LocationMapStored;
  plantLayout?: PlantLayoutStored;
  processFlowChart?: ProcessFlowChartStored;
  processDescription?: ProcessDescriptionStored;
  updatedSchemeOfInspection?: UpdatedSchemeOfInspectionStored;
  selfEvaluationForm?: SelfEvaluationFormStored;
  legalDocuments?: LegalDocumentStored[];
  meta?: ApplicationMeta;
}): string {
  const payload: Record<string, unknown> = {
    type: "application_checklist",
    items: input.items,
    meta: input.meta ?? defaultApplicationMeta(),
  };
  const scope = (input.licenseScope ?? "").trim();
  if (scope) payload.license_scope = scope;
  const format = input.licenseScopeFormat ?? "plain";
  if (format === "table") {
    payload.license_scope_format = "table";
    const rows = (input.licenseScopeRows ?? []).filter(
      (r) => r.component.trim() || r.value.trim(),
    );
    if (rows.length > 0) payload.license_scope_rows = rows;
  }
  const oslRows = nonEmptySampleRows(input.oslSampleRequirements);
  if (oslRows.length > 0) payload.osl_sample_requirements = oslRows;
  const piRows = nonEmptySampleRows(input.piSampleRequirements);
  if (piRows.length > 0) payload.pi_sample_requirements = piRows;
  const topMgmtRows = nonEmptyTopManagementRows(input.topManagement);
  if (topMgmtRows.length > 0) payload.top_management = topMgmtRows;
  const techStaffRows = nonEmptyTechnicalStaffRows(input.technicalStaff);
  if (techStaffRows.length > 0) payload.technical_staff = techStaffRows;
  const ftrRows = nonEmptyFtrReports(input.factoryTestReports);
  if (ftrRows.length > 0) payload.factory_test_reports = ftrRows;
  const subTestRows = nonEmptySubcontractedTests(input.subcontractedTests);
  if (subTestRows.length > 0) payload.subcontracted_tests = subTestRows;
  const subTestDoc = nonEmptySubcontractedTestsDocument(input.subcontractedTestsDocument);
  if (subTestDoc) payload.subcontracted_tests_document = subTestDoc;
  const cmpf305Rows = nonEmptyCmpf305Machinery(input.cmpf305Machinery);
  if (cmpf305Rows.length > 0) payload.cmpf_305_machinery = cmpf305Rows;
  const rawMaterialRows = nonEmptyRawMaterialDetails(input.rawMaterialDetails);
  if (rawMaterialRows.length > 0) payload.raw_material_details = rawMaterialRows;
  const certifiedReferenceMaterialRows = nonEmptyCertifiedReferenceMaterials(
    input.certifiedReferenceMaterials,
  );
  if (certifiedReferenceMaterialRows.length > 0) {
    payload.certified_reference_materials = certifiedReferenceMaterialRows;
  }
  const cmpf306Doc = nonEmptyCmpf306(input.cmpf306);
  if (cmpf306Doc) payload.cmpf_306 = cmpf306Doc;
  const cmpf307Doc = nonEmptyCmpf307(input.cmpf307);
  if (cmpf307Doc) payload.cmpf_307 = cmpf307Doc;
  const cmpf310Doc = nonEmptyCmpf310(input.cmpf310);
  if (cmpf310Doc) payload.cmpf_310 = cmpf310Doc;
  const cmpf311Doc = nonEmptyCmpf311(input.cmpf311);
  if (cmpf311Doc) payload.cmpf_311 = cmpf311Doc;
  const undertakingOption2Doc = nonEmptyUndertakingOption2(input.undertakingOption2);
  if (undertakingOption2Doc) payload.undertaking_option_2 = undertakingOption2Doc;
  const undertakingGeneralIssDoc = nonEmptyUndertakingGeneralIss(input.undertakingGeneralIss);
  if (undertakingGeneralIssDoc) payload.undertaking_general_iss = undertakingGeneralIssDoc;
  const authorizationLetterDoc = nonEmptyAuthorizationLetter(input.authorizationLetter);
  if (authorizationLetterDoc) payload.authorization_letter = authorizationLetterDoc;
  const undertakingLongDurationTestDoc = nonEmptyUndertakingLongDurationTest(
    input.undertakingLongDurationTest,
  );
  if (undertakingLongDurationTestDoc) {
    payload.undertaking_long_duration_test = undertakingLongDurationTestDoc;
  }
  const undertakingMinimumMarkingFeeDoc = nonEmptyUndertakingMinimumMarkingFee(
    input.undertakingMinimumMarkingFee,
  );
  if (undertakingMinimumMarkingFeeDoc) {
    payload.undertaking_minimum_marking_fee = undertakingMinimumMarkingFeeDoc;
  }
  const locationMapDoc = nonEmptyLocationMap(input.locationMap);
  if (locationMapDoc) payload.location_map = locationMapDoc;
  const plantLayoutDoc = nonEmptyPlantLayout(input.plantLayout);
  if (plantLayoutDoc) payload.plant_layout = plantLayoutDoc;
  const processFlowChartDoc = nonEmptyProcessFlowChart(input.processFlowChart);
  if (processFlowChartDoc) payload.process_flow_chart = processFlowChartDoc;
  const processDescriptionDoc = nonEmptyProcessDescription(input.processDescription);
  if (processDescriptionDoc) payload.process_description = processDescriptionDoc;
  const updatedSchemeOfInspectionDoc = nonEmptyUpdatedSchemeOfInspection(
    input.updatedSchemeOfInspection,
  );
  if (updatedSchemeOfInspectionDoc) {
    payload.updated_scheme_of_inspection = updatedSchemeOfInspectionDoc;
  }
  const selfEvaluationFormDoc = nonEmptySelfEvaluationForm(input.selfEvaluationForm);
  if (selfEvaluationFormDoc) payload.self_evaluation_form = selfEvaluationFormDoc;
  const legalDocumentRows = nonEmptyLegalDocuments(input.legalDocuments);
  if (legalDocumentRows.length > 0) payload.legal_documents = legalDocumentRows;
  return JSON.stringify(payload);
}

export function formatApplicationNumberDisplay(suffix: string): string {
  const part = stripApplicationNumberPrefix(suffix);
  return part ? `${APPLICATION_NUMBER_PREFIX}${part}` : APPLICATION_NUMBER_PREFIX;
}
