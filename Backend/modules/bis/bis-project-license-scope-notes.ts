import {
  buildApplicationChecklistPayload,
  parseApplicationChecklistNotes,
  type LicenseScopeFormat,
  type LicenseScopeTableRow,
} from "@backend/modules/bis/application-checklist-notes";
import {
  LICENSE_SCOPE_DEFAULT_COLUMNS,
  clampLicenseScopeColumnCount,
  licenseScopeRowHasContent,
  licenseScopeUsesPlain,
  licenseScopeUsesTable,
  parseLicenseScopeColumnHeaders,
  parseLicenseScopeFormat,
  parseStoredLicenseScopeRows,
  plainTextToValueScopeRows,
  serializeLicenseScopeText,
  storedRowsToEditorRows,
} from "@backend/modules/bis/license-scope-format";

export type BisProjectScopeFormState = {
  scopeType: LicenseScopeFormat;
  columnCount: number;
  columnHeaders: string[];
  plainText: string;
  rows: LicenseScopeTableRow[];
};

export function parseBisProjectLicenseScopeNotes(
  notes: string | null | undefined,
): BisProjectScopeFormState {
  const raw = (notes ?? "").trim();
  if (!raw) {
    return {
      scopeType: "plain",
      columnCount: LICENSE_SCOPE_DEFAULT_COLUMNS,
      columnHeaders: [],
      plainText: "",
      rows: [],
    };
  }

  if (raw.startsWith("{")) {
    try {
      const parsed = JSON.parse(raw) as {
        type?: string;
        format?: string;
        license_scope?: string;
        license_scope_format?: string;
        license_scope_column_count?: unknown;
        license_scope_column_headers?: unknown;
        license_scope_rows?: unknown;
      };

      if (parsed.type === "application_checklist") {
        const checklist = parseApplicationChecklistNotes(raw);
        return {
          scopeType: checklist.licenseScopeFormat,
          columnCount: checklist.licenseScopeColumnCount,
          columnHeaders: checklist.licenseScopeColumnHeaders,
          plainText: licenseScopeUsesPlain(checklist.licenseScopeFormat)
            ? checklist.licenseScope
            : "",
          rows: checklist.licenseScopeRows,
        };
      }

      if (parsed.type === "bis_license_scope") {
        const rows = parseStoredLicenseScopeRows(parsed.license_scope_rows);
        const format = parseLicenseScopeFormat(parsed.format ?? parsed.license_scope_format);
        return {
          scopeType: format,
          columnCount: clampLicenseScopeColumnCount(parsed.license_scope_column_count),
          columnHeaders: parseLicenseScopeColumnHeaders(
            parsed.license_scope_column_headers,
            parsed.license_scope_column_count,
          ),
          plainText: licenseScopeUsesPlain(format)
            ? (parsed.license_scope ?? "").trim()
            : "",
          rows,
        };
      }
    } catch {
      // fall through
    }
  }

  return {
    scopeType: "plain",
    columnCount: LICENSE_SCOPE_DEFAULT_COLUMNS,
    columnHeaders: [],
    plainText: raw,
    rows: [],
  };
}

function filteredRows(rows: LicenseScopeTableRow[]): LicenseScopeTableRow[] {
  return rows.filter((r) => licenseScopeRowHasContent(r));
}

export function buildBisProjectLicenseScopeNotes(
  existingNotes: string | null | undefined,
  input: BisProjectScopeFormState,
): string {
  const editorRows = storedRowsToEditorRows(input.rows);
  const serialized = serializeLicenseScopeText(
    input.scopeType,
    input.plainText,
    editorRows,
  );
  const rows = licenseScopeUsesTable(input.scopeType) ? filteredRows(input.rows) : [];
  const columnCount = clampLicenseScopeColumnCount(input.columnCount);

  const raw = (existingNotes ?? "").trim();
  if (raw.startsWith("{")) {
    try {
      const parsed = JSON.parse(raw) as { type?: string };
      if (parsed.type === "application_checklist") {
        const checklist = parseApplicationChecklistNotes(raw);
        return buildApplicationChecklistPayload({
          items: checklist.items,
          meta: checklist.meta,
          licenseScope: serialized,
          licenseScopeFormat: input.scopeType,
          licenseScopeColumnCount: columnCount,
          licenseScopeColumnHeaders: input.columnHeaders,
          licenseScopeRows: rows,
          oslSampleRequirements: checklist.oslSampleRequirements,
          piSampleRequirements: checklist.piSampleRequirements,
          topManagement: checklist.topManagement,
          technicalStaff: checklist.technicalStaff,
        });
      }
    } catch {
      // fall through
    }
  }

  if (licenseScopeUsesTable(input.scopeType)) {
    const payload: Record<string, unknown> = {
      type: "bis_license_scope",
      format: input.scopeType,
      license_scope: serialized,
      license_scope_column_count: columnCount,
    };
    const headers = parseLicenseScopeColumnHeaders(input.columnHeaders, columnCount);
    if (headers.some((h) => h.trim())) payload.license_scope_column_headers = headers;
    if (rows.length > 0) payload.license_scope_rows = rows;
    return JSON.stringify(payload);
  }

  if (raw.startsWith("{")) {
    try {
      const parsed = JSON.parse(raw) as { type?: string };
      if (parsed.type === "bis_license_scope") {
        return (input.plainText ?? "").trim();
      }
    } catch {
      // fall through
    }
  }

  return (input.plainText ?? "").trim();
}

export function plainTextToScopeRows(plain: string): LicenseScopeTableRow[] {
  return plainTextToValueScopeRows(plain);
}

/** Read `source_license_id` from inclusion / checklist notes JSON (if present). */
export function parseSourceLicenseIdFromNotes(
  notes: string | null | undefined,
): string | null {
  const raw = (notes ?? "").trim();
  if (!raw.startsWith("{")) return null;
  try {
    const parsed = JSON.parse(raw) as { source_license_id?: unknown };
    const id = String(parsed.source_license_id ?? "").trim();
    return id || null;
  } catch {
    return null;
  }
}

/**
 * Merge inclusion scope into an existing license scope.
 * Prefers table when either side uses columns.
 */
export function mergeLicenseScopeStates(
  base: BisProjectScopeFormState,
  addition: BisProjectScopeFormState,
): BisProjectScopeFormState {
  const additionText = serializeLicenseScopeText(
    addition.scopeType,
    addition.plainText,
    storedRowsToEditorRows(addition.rows),
  ).trim();
  if (!additionText) return base;

  const baseText = serializeLicenseScopeText(
    base.scopeType,
    base.plainText,
    storedRowsToEditorRows(base.rows),
  ).trim();
  if (!baseText) return addition;

  if (licenseScopeUsesTable(base.scopeType) || licenseScopeUsesTable(addition.scopeType)) {
    const baseRows = licenseScopeUsesTable(base.scopeType)
      ? filteredRows(base.rows)
      : plainTextToValueScopeRows(base.plainText);
    const addRows = licenseScopeUsesTable(addition.scopeType)
      ? filteredRows(addition.rows)
      : plainTextToValueScopeRows(addition.plainText);
    const rows = [...baseRows, ...addRows];
    const format: LicenseScopeFormat =
      licenseScopeUsesPlain(base.scopeType) || licenseScopeUsesPlain(addition.scopeType)
        ? "plain_table"
        : "table";
    const plainText =
      format === "plain_table"
        ? [base.plainText.trim(), addition.plainText.trim()].filter(Boolean).join("\n\n")
        : "";
    return {
      scopeType: format,
      columnCount: Math.max(
        clampLicenseScopeColumnCount(base.columnCount),
        clampLicenseScopeColumnCount(addition.columnCount),
      ),
      columnHeaders: (base.columnHeaders?.length ? base.columnHeaders : addition.columnHeaders) ?? [],
      plainText,
      rows,
    };
  }

  return {
    scopeType: "plain",
    columnCount: LICENSE_SCOPE_DEFAULT_COLUMNS,
    columnHeaders: [],
    plainText: `${baseText}\n\n${additionText}`,
    rows: [],
  };
}
