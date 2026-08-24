import type { TopManagementStored } from "@backend/modules/bis/top-management";
import { resolvePrimaryTopManagementPerson } from "@backend/modules/bis/top-management";

export const LONG_DURATION_TEST_ROW_COUNT = 4;

export type LongDurationTestRow = {
  type_of_test: string;
  duration_of_test: string;
  date_of_completion: string;
};

export type UndertakingLongDurationTestStored = {
  declarant_name: string;
  product_for_mark: string;
  is_standard: string;
  factory_address: string;
  signatory_name: string;
  signatory_designation: string;
  test_rows: LongDurationTestRow[];
};

export function defaultLongDurationTestRows(): LongDurationTestRow[] {
  return Array.from({ length: LONG_DURATION_TEST_ROW_COUNT }, () => ({
    type_of_test: "",
    duration_of_test: "",
    date_of_completion: "",
  }));
}

export function defaultUndertakingLongDurationTestDocument(): UndertakingLongDurationTestStored {
  return {
    declarant_name: "",
    product_for_mark: "",
    is_standard: "",
    factory_address: "",
    signatory_name: "",
    signatory_designation: "",
    test_rows: defaultLongDurationTestRows(),
  };
}

function longDurationTestRowHasContent(row: LongDurationTestRow): boolean {
  return (
    row.type_of_test.trim().length > 0 ||
    row.duration_of_test.trim().length > 0 ||
    row.date_of_completion.trim().length > 0
  );
}

export function documentHasContent(doc: UndertakingLongDurationTestStored): boolean {
  return (
    doc.declarant_name.trim().length > 0 ||
    doc.product_for_mark.trim().length > 0 ||
    doc.is_standard.trim().length > 0 ||
    doc.factory_address.trim().length > 0 ||
    doc.signatory_name.trim().length > 0 ||
    doc.signatory_designation.trim().length > 0 ||
    doc.test_rows.some(longDurationTestRowHasContent)
  );
}

function parseLongDurationTestRows(raw: unknown): LongDurationTestRow[] {
  const defaults = defaultLongDurationTestRows();
  if (!Array.isArray(raw)) return defaults;

  const parsed = raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      return {
        type_of_test: String(row.type_of_test ?? "").trim(),
        duration_of_test: String(row.duration_of_test ?? "").trim(),
        date_of_completion: String(row.date_of_completion ?? "").trim(),
      };
    })
    .filter((row): row is LongDurationTestRow => row !== null);

  return defaults.map((defaultRow, index) => parsed[index] ?? defaultRow);
}

export function parseUndertakingLongDurationTest(
  raw: unknown,
): UndertakingLongDurationTestStored {
  if (!raw || typeof raw !== "object") return defaultUndertakingLongDurationTestDocument();
  const r = raw as Record<string, unknown>;
  return {
    declarant_name: String(r.declarant_name ?? "").trim(),
    product_for_mark: String(r.product_for_mark ?? "").trim(),
    is_standard: String(r.is_standard ?? "").trim(),
    factory_address: String(r.factory_address ?? "").trim(),
    signatory_name: String(r.signatory_name ?? "").trim(),
    signatory_designation: String(r.signatory_designation ?? "").trim(),
    test_rows: parseLongDurationTestRows(r.test_rows),
  };
}

export function resolveUndertakingLongDurationTestDefaults(input: {
  companyName: string | null;
  contactPerson: string | null;
  isNumber: string | null;
  isTitle: string | null;
  factoryAddress: string | null;
  isCodeTitle: string | null;
  topManagement?: TopManagementStored[];
}): Partial<UndertakingLongDurationTestStored> {
  const num = (input.isNumber ?? "").trim();
  const title = (input.isTitle ?? "").trim();
  let isStandard = num;
  if (num && title) isStandard = `${num} — ${title}`;
  else if (!num && title) isStandard = title;

  const primary = resolvePrimaryTopManagementPerson(input.topManagement ?? []);
  const declarant =
    primary.person_name ||
    (input.contactPerson ?? "").trim() ||
    (input.companyName ?? "").trim();

  return {
    declarant_name: declarant,
    product_for_mark: (input.isCodeTitle ?? title).trim(),
    is_standard: isStandard,
    factory_address: (input.factoryAddress ?? "").trim(),
    signatory_name: declarant,
    signatory_designation: primary.designation,
  };
}

export function resolveUndertakingLongDurationTestDocument(input: {
  companyName: string | null;
  contactPerson: string | null;
  isNumber: string | null;
  isTitle: string | null;
  factoryAddress: string | null;
  isCodeTitle: string | null;
  topManagement: TopManagementStored[];
}): UndertakingLongDurationTestStored {
  const defaults = resolveUndertakingLongDurationTestDefaults(input);
  return {
    declarant_name: defaults.declarant_name ?? "",
    product_for_mark: defaults.product_for_mark ?? "",
    is_standard: defaults.is_standard ?? "",
    factory_address: defaults.factory_address ?? "",
    signatory_name: defaults.signatory_name ?? "",
    signatory_designation: defaults.signatory_designation ?? "",
    test_rows: defaultLongDurationTestRows(),
  };
}

export function mergeUndertakingLongDurationTestWithDefaults(
  stored: UndertakingLongDurationTestStored,
  defaults: Partial<UndertakingLongDurationTestStored>,
): UndertakingLongDurationTestStored {
  return {
    declarant_name: stored.declarant_name || defaults.declarant_name || "",
    product_for_mark: stored.product_for_mark || defaults.product_for_mark || "",
    is_standard: stored.is_standard || defaults.is_standard || "",
    factory_address: stored.factory_address || defaults.factory_address || "",
    signatory_name: stored.signatory_name || defaults.signatory_name || "",
    signatory_designation:
      stored.signatory_designation || defaults.signatory_designation || "",
    test_rows:
      stored.test_rows.length === LONG_DURATION_TEST_ROW_COUNT
        ? stored.test_rows
        : parseLongDurationTestRows(stored.test_rows),
  };
}
