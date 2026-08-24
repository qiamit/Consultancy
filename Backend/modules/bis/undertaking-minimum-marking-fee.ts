import {
  formatCmpf310RupeeDisplay,
  type IsCodeMarkingFeeSource,
} from "@backend/modules/bis/cmpf-310";
import type { LicenseScopeTableRow } from "@backend/modules/bis/application-checklist-notes";
import type { TopManagementStored } from "@backend/modules/bis/top-management";
import { resolvePrimaryTopManagementPerson } from "@backend/modules/bis/top-management";

export type UndertakingMinimumMarkingFeeStored = {
  unit_of_sale: string;
  annual_production_capacity: string;
  value_of_production_per_unit: string;
  cost_of_production_per_unit: string;
  market_cost_most_common_variety: string;
  signatory_name: string;
  signatory_designation: string;
};

export function defaultUndertakingMinimumMarkingFeeDocument(): UndertakingMinimumMarkingFeeStored {
  return {
    unit_of_sale: "",
    annual_production_capacity: "",
    value_of_production_per_unit: "",
    cost_of_production_per_unit: "",
    market_cost_most_common_variety: "",
    signatory_name: "",
    signatory_designation: "",
  };
}

export function documentHasContent(doc: UndertakingMinimumMarkingFeeStored): boolean {
  return (
    doc.unit_of_sale.trim().length > 0 ||
    doc.annual_production_capacity.trim().length > 0 ||
    doc.value_of_production_per_unit.trim().length > 0 ||
    doc.cost_of_production_per_unit.trim().length > 0 ||
    doc.market_cost_most_common_variety.trim().length > 0 ||
    doc.signatory_name.trim().length > 0 ||
    doc.signatory_designation.trim().length > 0
  );
}

export function parseUndertakingMinimumMarkingFee(raw: unknown): UndertakingMinimumMarkingFeeStored {
  if (!raw || typeof raw !== "object") return defaultUndertakingMinimumMarkingFeeDocument();
  const r = raw as Record<string, unknown>;
  return {
    unit_of_sale: String(r.unit_of_sale ?? "").trim(),
    annual_production_capacity: String(r.annual_production_capacity ?? "").trim(),
    value_of_production_per_unit: String(r.value_of_production_per_unit ?? "").trim(),
    cost_of_production_per_unit: String(r.cost_of_production_per_unit ?? "").trim(),
    market_cost_most_common_variety: String(r.market_cost_most_common_variety ?? "").trim(),
    signatory_name: String(r.signatory_name ?? "").trim(),
    signatory_designation: String(r.signatory_designation ?? "").trim(),
  };
}

function normalizeUnitOfSale(unitOfIs: string | null | undefined): string {
  const u = (unitOfIs ?? "").trim();
  if (!u) return "Tonne";
  return u.replace(/^1\s+/i, "").trim() || u;
}

function findLicenseScopeCapacity(rows: LicenseScopeTableRow[]): string {
  const patterns = [
    /annual\s+production/i,
    /production\s+capacity/i,
    /installed\s+capacity/i,
    /capacity\s+per\s+year/i,
  ];
  for (const row of rows) {
    const component = row.component.trim();
    if (!component) continue;
    if (patterns.some((pattern) => pattern.test(component))) {
      const value = row.value.trim();
      if (value) return value;
    }
  }
  return "";
}

function withApplicationNote(value: string): string {
  const v = value.trim();
  if (!v) return "";
  if (/\(as provided in application\)/i.test(v)) return v;
  return `${v} (As Provided in Application)`;
}

function formatPerUnitCost(value: string, unit: string): string {
  const v = value.trim();
  if (!v) return "";
  const unitLabel = unit.trim() || "Tonne";
  if (/\/\s*\w/i.test(v)) return v;
  return `${v} / ${unitLabel}`;
}

export function resolveUndertakingMinimumMarkingFeeDefaults(input: {
  isCode: IsCodeMarkingFeeSource | null;
  contactPerson: string | null;
  topManagement?: TopManagementStored[];
  licenseScopeRows?: LicenseScopeTableRow[];
}): Partial<UndertakingMinimumMarkingFeeStored> {
  const unit = normalizeUnitOfSale(input.isCode?.unit_of_is);
  const capacityRaw = findLicenseScopeCapacity(input.licenseScopeRows ?? []);
  const annualCapacity = capacityRaw
    ? withApplicationNote(
        /\b(year|annum|annual)\b/i.test(capacityRaw)
          ? capacityRaw
          : `${capacityRaw} ${unit} / Year`,
      )
    : "";

  const unitRate = input.isCode?.slab_1_rate;
  const valueDisplay =
    unitRate != null && Number.isFinite(Number(unitRate))
      ? withApplicationNote(formatCmpf310RupeeDisplay(String(unitRate)))
      : "";

  const primary = resolvePrimaryTopManagementPerson(input.topManagement ?? []);

  return {
    unit_of_sale: unit,
    annual_production_capacity: annualCapacity,
    value_of_production_per_unit: valueDisplay,
    cost_of_production_per_unit: "",
    market_cost_most_common_variety: valueDisplay
      ? formatPerUnitCost(valueDisplay.replace(/\s*\(As Provided in Application\)\s*/i, "").trim(), unit)
      : "",
    signatory_name: primary.person_name || (input.contactPerson ?? "").trim(),
    signatory_designation: primary.designation,
  };
}

export function resolveUndertakingMinimumMarkingFeeDocument(input: {
  isCode: IsCodeMarkingFeeSource | null;
  contactPerson: string | null;
  topManagement: TopManagementStored[];
  licenseScopeRows?: LicenseScopeTableRow[];
}): UndertakingMinimumMarkingFeeStored {
  const defaults = resolveUndertakingMinimumMarkingFeeDefaults(input);
  return {
    unit_of_sale: defaults.unit_of_sale ?? "",
    annual_production_capacity: defaults.annual_production_capacity ?? "",
    value_of_production_per_unit: defaults.value_of_production_per_unit ?? "",
    cost_of_production_per_unit: defaults.cost_of_production_per_unit ?? "",
    market_cost_most_common_variety: defaults.market_cost_most_common_variety ?? "",
    signatory_name: defaults.signatory_name ?? "",
    signatory_designation: defaults.signatory_designation ?? "",
  };
}

export function mergeUndertakingMinimumMarkingFeeWithDefaults(
  stored: UndertakingMinimumMarkingFeeStored,
  defaults: Partial<UndertakingMinimumMarkingFeeStored>,
): UndertakingMinimumMarkingFeeStored {
  return {
    unit_of_sale: stored.unit_of_sale || defaults.unit_of_sale || "",
    annual_production_capacity:
      stored.annual_production_capacity || defaults.annual_production_capacity || "",
    value_of_production_per_unit:
      stored.value_of_production_per_unit || defaults.value_of_production_per_unit || "",
    cost_of_production_per_unit:
      stored.cost_of_production_per_unit || defaults.cost_of_production_per_unit || "",
    market_cost_most_common_variety:
      stored.market_cost_most_common_variety || defaults.market_cost_most_common_variety || "",
    signatory_name: stored.signatory_name || defaults.signatory_name || "",
    signatory_designation: stored.signatory_designation || defaults.signatory_designation || "",
  };
}
