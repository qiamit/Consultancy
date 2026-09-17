import {
  buildApplicationChecklistPayload,
  parseApplicationChecklistNotes,
  type LicenseScopeFormat,
  type LicenseScopeTableRow,
} from "@backend/modules/bis/application-checklist-notes";
import {
  editorRowsToStored,
  plainTextToValueScopeRows,
  serializeLicenseScopeText,
  storedRowsToEditorRows,
} from "@backend/modules/bis/license-scope-format";

export type BisProjectScopeFormState = {
  scopeType: LicenseScopeFormat;
  plainText: string;
  rows: LicenseScopeTableRow[];
};

export function parseBisProjectLicenseScopeNotes(
  notes: string | null | undefined,
): BisProjectScopeFormState {
  const raw = (notes ?? "").trim();
  if (!raw) {
    return { scopeType: "plain", plainText: "", rows: [] };
  }

  if (raw.startsWith("{")) {
    try {
      const parsed = JSON.parse(raw) as {
        type?: string;
        format?: string;
        license_scope?: string;
        license_scope_rows?: unknown;
      };

      if (parsed.type === "application_checklist") {
        const checklist = parseApplicationChecklistNotes(raw);
        return {
          scopeType: checklist.licenseScopeFormat,
          plainText:
            checklist.licenseScopeFormat === "plain" ? checklist.licenseScope : "",
          rows: checklist.licenseScopeRows,
        };
      }

      if (parsed.type === "bis_license_scope") {
        const rows = parseStoredRows(parsed.license_scope_rows);
        const format: LicenseScopeFormat =
          parsed.format === "table" ? "table" : "plain";
        return {
          scopeType: format,
          plainText: format === "plain" ? (parsed.license_scope ?? "").trim() : "",
          rows,
        };
      }
    } catch {
      // fall through
    }
  }

  return { scopeType: "plain", plainText: raw, rows: [] };
}

function parseStoredRows(raw: unknown): LicenseScopeTableRow[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const r = row as Record<string, unknown>;
      return {
        component: String(r.component ?? "").trim(),
        value: String(r.value ?? "").trim(),
      };
    })
    .filter((r): r is LicenseScopeTableRow => r !== null);
}

function filteredRows(rows: LicenseScopeTableRow[]): LicenseScopeTableRow[] {
  return rows.filter((r) => r.component.trim() || r.value.trim());
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
  const rows = input.scopeType === "table" ? filteredRows(input.rows) : [];

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

  if (input.scopeType === "table") {
    const payload: Record<string, unknown> = {
      type: "bis_license_scope",
      format: "table",
      license_scope: serialized,
    };
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
 * Prefers 2-column table when either side uses table format.
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

  if (base.scopeType === "table" || addition.scopeType === "table") {
    const baseRows =
      base.scopeType === "table"
        ? filteredRows(base.rows)
        : plainTextToValueScopeRows(base.plainText);
    const addRows =
      addition.scopeType === "table"
        ? filteredRows(addition.rows)
        : plainTextToValueScopeRows(addition.plainText);
    const rows = [...baseRows, ...addRows];
    return {
      scopeType: "table",
      plainText: "",
      rows,
    };
  }

  return {
    scopeType: "plain",
    plainText: `${baseText}\n\n${additionText}`,
    rows: [],
  };
}
