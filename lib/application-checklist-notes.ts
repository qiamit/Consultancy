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
  cmpf306: Cmpf306Stored;
  cmpf307: Cmpf307Stored;
  cmpf310: Cmpf310Stored;
  cmpf311: Cmpf311Stored;
  undertakingOption2: UndertakingOption2Stored;
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
      cmpf306: defaultCmpf306Document(),
      cmpf307: defaultCmpf307Document(),
      cmpf310: defaultCmpf310Document(),
      cmpf311: defaultCmpf311Document(),
      undertakingOption2: defaultUndertakingOption2Document(),
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
      cmpf_306?: unknown;
      cmpf_307?: unknown;
      cmpf_310?: unknown;
      cmpf_311?: unknown;
      undertaking_option_2?: unknown;
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
        cmpf306: defaultCmpf306Document(),
        cmpf307: defaultCmpf307Document(),
        cmpf310: defaultCmpf310Document(),
        cmpf311: defaultCmpf311Document(),
        undertakingOption2: defaultUndertakingOption2Document(),
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
      cmpf306: parseCmpf306(parsed.cmpf_306),
      cmpf307: parseCmpf307(parsed.cmpf_307),
      cmpf310: parseCmpf310(parsed.cmpf_310),
      cmpf311: parseCmpf311(parsed.cmpf_311),
      undertakingOption2: parseUndertakingOption2(parsed.undertaking_option_2),
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
      cmpf306: defaultCmpf306Document(),
      cmpf307: defaultCmpf307Document(),
      cmpf310: defaultCmpf310Document(),
      cmpf311: defaultCmpf311Document(),
      undertakingOption2: defaultUndertakingOption2Document(),
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
  cmpf306?: Cmpf306Stored;
  cmpf307?: Cmpf307Stored;
  cmpf310?: Cmpf310Stored;
  cmpf311?: Cmpf311Stored;
  undertakingOption2?: UndertakingOption2Stored;
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
  return JSON.stringify(payload);
}

export function formatApplicationNumberDisplay(suffix: string): string {
  const part = stripApplicationNumberPrefix(suffix);
  return part ? `${APPLICATION_NUMBER_PREFIX}${part}` : APPLICATION_NUMBER_PREFIX;
}
