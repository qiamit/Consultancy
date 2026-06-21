import type { OslSampleRequirementStored } from "@/lib/osl-sample-requirements";
import { parseOslSampleRequirements, rowHasContent } from "@/lib/osl-sample-requirements";
import {
  parseTopManagement,
  rowHasContent as topManagementRowHasContent,
  type TopManagementStored,
} from "@/lib/top-management";

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

export function buildApplicationChecklistPayload(input: {
  items: unknown[];
  licenseScope?: string;
  licenseScopeFormat?: LicenseScopeFormat;
  licenseScopeRows?: LicenseScopeTableRow[];
  oslSampleRequirements?: OslSampleRequirementStored[];
  piSampleRequirements?: OslSampleRequirementStored[];
  topManagement?: TopManagementStored[];
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
  return JSON.stringify(payload);
}

export function formatApplicationNumberDisplay(suffix: string): string {
  const part = stripApplicationNumberPrefix(suffix);
  return part ? `${APPLICATION_NUMBER_PREFIX}${part}` : APPLICATION_NUMBER_PREFIX;
}
