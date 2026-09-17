import {
  formatCmpf310RupeeDisplay,
  type IsCodeMarkingFeeSource,
} from "@backend/modules/bis/cmpf-310";
import type { LicenseScopeTableRow } from "@backend/modules/bis/application-checklist-notes";
import type { TopManagementStored } from "@backend/modules/bis/top-management";
import { resolvePrimaryTopManagementPerson } from "@backend/modules/bis/top-management";

export const MARKING_FEE_OVERHEAD_DEFAULT = 37000;
export const MARKING_FEE_DEFAULT_FACTORY_SAMPLE_COUNT = 2;
export const MARKING_FEE_DEFAULT_MARKET_SAMPLE_COUNT = 2;

export type UndertakingMinimumMarkingFeeStored = {
  firm_status: string;
  bis_branch: string;
  is_product_line: string;
  unit_of_sale: string;
  annual_production_qty: string;
  annual_production_capacity: string;
  value_of_production_per_unit: string;
  cost_of_production_per_unit: string;
  market_surveillance_plan: string;
  bis_lab_testing_charges: string;
  osl_avg_testing_charges: string;
  market_sample_quantity: string;
  market_sample_cost: string;
  market_cost_most_common_variety: string;
  factory_sample_count: string;
  market_sample_count: string;
  factory_sample_rate: string;
  market_sample_rate: string;
  overhead_cost: string;
  mmf_large_override: string;
  mmf_msme_override: string;
  final_unit_rate: string;
  slab_1_text: string;
  slab_2_text: string;
  slab_3_text: string;
  signatory_name: string;
  signatory_designation: string;
};

export type MarkingFeeCalculationResult = {
  effectiveTestingRate: number | null;
  factorySampleCount: number;
  marketSampleCount: number;
  factorySampleRate: number | null;
  marketSampleRate: number | null;
  factoryTestingAmount: number;
  marketTestingAmount: number;
  marketSampleUnitCost: number;
  marketSampleCostAmount: number;
  overheadAmount: number;
  totalRaw: number;
  mmfLargeRaw: number;
  mmfMsmeRaw: number;
  mmfLarge: number;
  mmfMsme: number;
  annualProductionQty: number | null;
  costOfProductionPerUnit: number | null;
  probableUnitRate: number | null;
  bandMin: number | null;
  bandMax: number | null;
  suggestedUnitRate: number | null;
};

export function parseMarkingFeeNumber(raw: string): number | null {
  const cleaned = String(raw ?? "")
    .trim()
    .replace(/,/g, "")
    .replace(/[^\d.\-]/g, "");
  if (!cleaned || cleaned === "." || cleaned === "-") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function formatMarkingFeeInr(value: number | null | undefined, decimals = 0): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const formatted = value.toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return decimals > 0 ? `Rs. ${formatted}/-` : `Rs. ${formatted}/-`;
}

export function roundUpToNextThousand(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.ceil(value / 1000) * 1000;
}

export function roundUnitRateToFivePaisa(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.ceil(value / 0.05) * 0.05;
}

function parseCount(raw: string, fallback: number): number {
  const n = parseMarkingFeeNumber(raw);
  if (n == null || n < 0) return fallback;
  return Math.floor(n);
}

function normalizeFirmStatus(raw: string): string {
  const v = raw.trim();
  if (!v) return "";
  const upper = v.toUpperCase();
  if (
    /\bMSME\b/.test(upper) ||
    /\bSME\b/.test(upper) ||
    /\bMICRO\b/.test(upper) ||
    /\bSMALL\b/.test(upper) ||
    /\bMEDIUM\b/.test(upper)
  ) {
    return "MSME";
  }
  if (/\bLS\b/.test(upper) || /\bLARGE\b/.test(upper)) return "LS";
  return v;
}

/** Exported for modal auto-fill from Application Firm Scale. */
export function firmStatusFromFirmScale(firmScale: string | null | undefined): string {
  return normalizeFirmStatus(firmScale ?? "");
}

export function computeMarkingFeeCalculation(
  doc: UndertakingMinimumMarkingFeeStored,
): MarkingFeeCalculationResult {
  const factorySampleCount = parseCount(
    doc.factory_sample_count,
    MARKING_FEE_DEFAULT_FACTORY_SAMPLE_COUNT,
  );
  const marketSampleCount = parseCount(
    doc.market_sample_count,
    MARKING_FEE_DEFAULT_MARKET_SAMPLE_COUNT,
  );

  const bisLabRate = parseMarkingFeeNumber(doc.bis_lab_testing_charges);
  const oslRate = parseMarkingFeeNumber(doc.osl_avg_testing_charges);
  const effectiveTestingRate =
    bisLabRate != null && bisLabRate > 0 ? bisLabRate : oslRate != null && oslRate > 0 ? oslRate : null;

  const factorySampleRate =
    parseMarkingFeeNumber(doc.factory_sample_rate) ?? effectiveTestingRate;
  const marketSampleRate =
    parseMarkingFeeNumber(doc.market_sample_rate) ?? effectiveTestingRate;

  const marketSampleUnitCost =
    parseMarkingFeeNumber(doc.market_sample_cost) ??
    parseMarkingFeeNumber(doc.market_cost_most_common_variety) ??
    0;

  const overheadAmount =
    parseMarkingFeeNumber(doc.overhead_cost) ?? MARKING_FEE_OVERHEAD_DEFAULT;

  const factoryTestingAmount =
    factorySampleRate != null ? factorySampleCount * factorySampleRate : 0;
  const marketTestingAmount =
    marketSampleRate != null ? marketSampleCount * marketSampleRate : 0;
  const marketSampleCostAmount = marketSampleCount * marketSampleUnitCost;

  const totalRaw =
    factoryTestingAmount + marketTestingAmount + marketSampleCostAmount + overheadAmount;

  const mmfLargeOverride = parseMarkingFeeNumber(doc.mmf_large_override);
  const mmfMsmeOverride = parseMarkingFeeNumber(doc.mmf_msme_override);

  const mmfLargeRaw = totalRaw;
  const mmfLarge =
    mmfLargeOverride != null && mmfLargeOverride > 0
      ? roundUpToNextThousand(mmfLargeOverride)
      : roundUpToNextThousand(totalRaw);

  const mmfMsmeRaw = mmfLarge * 0.8;
  const mmfMsme =
    mmfMsmeOverride != null && mmfMsmeOverride > 0
      ? roundUpToNextThousand(mmfMsmeOverride)
      : roundUpToNextThousand(mmfMsmeRaw);

  const annualProductionQty = parseMarkingFeeNumber(doc.annual_production_qty);
  const costOfProductionPerUnit = parseMarkingFeeNumber(doc.cost_of_production_per_unit);

  const probableUnitRate =
    annualProductionQty != null && annualProductionQty > 0
      ? mmfLarge / annualProductionQty
      : null;

  const bandMin =
    costOfProductionPerUnit != null ? costOfProductionPerUnit * 0.0001 : null;
  const bandMax =
    costOfProductionPerUnit != null ? costOfProductionPerUnit * 0.002 : null;

  let suggestedUnitRate: number | null = null;
  if (probableUnitRate != null) {
    let clamped = probableUnitRate;
    if (bandMin != null) clamped = Math.max(clamped, bandMin);
    if (bandMax != null) clamped = Math.min(clamped, bandMax);
    suggestedUnitRate = roundUnitRateToFivePaisa(clamped);
  }

  return {
    effectiveTestingRate,
    factorySampleCount,
    marketSampleCount,
    factorySampleRate,
    marketSampleRate,
    factoryTestingAmount,
    marketTestingAmount,
    marketSampleUnitCost,
    marketSampleCostAmount,
    overheadAmount,
    totalRaw,
    mmfLargeRaw,
    mmfMsmeRaw,
    mmfLarge,
    mmfMsme,
    annualProductionQty,
    costOfProductionPerUnit,
    probableUnitRate,
    bandMin,
    bandMax,
    suggestedUnitRate,
  };
}

export function defaultUndertakingMinimumMarkingFeeDocument(): UndertakingMinimumMarkingFeeStored {
  return {
    firm_status: "",
    bis_branch: "",
    is_product_line: "",
    unit_of_sale: "",
    annual_production_qty: "",
    annual_production_capacity: "",
    value_of_production_per_unit: "",
    cost_of_production_per_unit: "",
    market_surveillance_plan: "",
    bis_lab_testing_charges: "",
    osl_avg_testing_charges: "",
    market_sample_quantity: "",
    market_sample_cost: "",
    market_cost_most_common_variety: "",
    factory_sample_count: String(MARKING_FEE_DEFAULT_FACTORY_SAMPLE_COUNT),
    market_sample_count: String(MARKING_FEE_DEFAULT_MARKET_SAMPLE_COUNT),
    factory_sample_rate: "",
    market_sample_rate: "",
    overhead_cost: String(MARKING_FEE_OVERHEAD_DEFAULT),
    mmf_large_override: "",
    mmf_msme_override: "",
    final_unit_rate: "",
    slab_1_text: "",
    slab_2_text: "",
    slab_3_text: "",
    signatory_name: "",
    signatory_designation: "",
  };
}

export function documentHasContent(doc: UndertakingMinimumMarkingFeeStored): boolean {
  return (
    doc.firm_status.trim().length > 0 ||
    doc.bis_branch.trim().length > 0 ||
    doc.is_product_line.trim().length > 0 ||
    doc.unit_of_sale.trim().length > 0 ||
    doc.annual_production_qty.trim().length > 0 ||
    doc.annual_production_capacity.trim().length > 0 ||
    doc.value_of_production_per_unit.trim().length > 0 ||
    doc.cost_of_production_per_unit.trim().length > 0 ||
    doc.market_surveillance_plan.trim().length > 0 ||
    doc.bis_lab_testing_charges.trim().length > 0 ||
    doc.osl_avg_testing_charges.trim().length > 0 ||
    doc.market_sample_quantity.trim().length > 0 ||
    doc.market_sample_cost.trim().length > 0 ||
    doc.market_cost_most_common_variety.trim().length > 0 ||
    doc.factory_sample_rate.trim().length > 0 ||
    doc.market_sample_rate.trim().length > 0 ||
    doc.mmf_large_override.trim().length > 0 ||
    doc.mmf_msme_override.trim().length > 0 ||
    doc.final_unit_rate.trim().length > 0 ||
    doc.slab_1_text.trim().length > 0 ||
    doc.slab_2_text.trim().length > 0 ||
    doc.slab_3_text.trim().length > 0 ||
    doc.signatory_name.trim().length > 0 ||
    doc.signatory_designation.trim().length > 0
  );
}

function syncMarketSampleCostFields(
  marketSampleCost: string,
  marketCostMostCommon: string,
): { market_sample_cost: string; market_cost_most_common_variety: string } {
  const sample = marketSampleCost.trim();
  const legacy = marketCostMostCommon.trim();
  if (sample && !legacy) return { market_sample_cost: sample, market_cost_most_common_variety: sample };
  if (!sample && legacy) return { market_sample_cost: legacy, market_cost_most_common_variety: legacy };
  return { market_sample_cost: sample, market_cost_most_common_variety: legacy || sample };
}

export function parseUndertakingMinimumMarkingFee(raw: unknown): UndertakingMinimumMarkingFeeStored {
  if (!raw || typeof raw !== "object") return defaultUndertakingMinimumMarkingFeeDocument();
  const r = raw as Record<string, unknown>;
  const defaults = defaultUndertakingMinimumMarkingFeeDocument();
  const marketFields = syncMarketSampleCostFields(
    String(r.market_sample_cost ?? r.market_cost_most_common_variety ?? "").trim(),
    String(r.market_cost_most_common_variety ?? r.market_sample_cost ?? "").trim(),
  );

  const factoryCountRaw = String(r.factory_sample_count ?? "").trim();
  const marketCountRaw = String(r.market_sample_count ?? "").trim();
  const overheadRaw = String(r.overhead_cost ?? "").trim();

  return {
    firm_status: String(r.firm_status ?? "").trim(),
    bis_branch: String(r.bis_branch ?? "").trim(),
    is_product_line: String(r.is_product_line ?? "").trim(),
    unit_of_sale: String(r.unit_of_sale ?? "").trim(),
    annual_production_qty: String(r.annual_production_qty ?? "").trim(),
    annual_production_capacity: String(r.annual_production_capacity ?? "").trim(),
    value_of_production_per_unit: String(r.value_of_production_per_unit ?? "").trim(),
    cost_of_production_per_unit: String(r.cost_of_production_per_unit ?? "").trim(),
    market_surveillance_plan: String(r.market_surveillance_plan ?? "").trim(),
    bis_lab_testing_charges: String(r.bis_lab_testing_charges ?? "").trim(),
    osl_avg_testing_charges: String(r.osl_avg_testing_charges ?? "").trim(),
    market_sample_quantity: String(r.market_sample_quantity ?? "").trim(),
    ...marketFields,
    factory_sample_count: factoryCountRaw || defaults.factory_sample_count,
    market_sample_count: marketCountRaw || defaults.market_sample_count,
    factory_sample_rate: String(r.factory_sample_rate ?? "").trim(),
    market_sample_rate: String(r.market_sample_rate ?? "").trim(),
    overhead_cost: overheadRaw || defaults.overhead_cost,
    mmf_large_override: String(r.mmf_large_override ?? "").trim(),
    mmf_msme_override: String(r.mmf_msme_override ?? "").trim(),
    final_unit_rate: String(r.final_unit_rate ?? "").trim(),
    slab_1_text: String(r.slab_1_text ?? "").trim(),
    slab_2_text: String(r.slab_2_text ?? "").trim(),
    slab_3_text: String(r.slab_3_text ?? "").trim(),
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

function extractNumericQtyFromCapacity(capacityRaw: string): string {
  const cleaned = capacityRaw.replace(/\(as provided in application\)/gi, "").trim();
  const match = cleaned.match(/[\d,]+(?:\.\d+)?/);
  if (!match) return "";
  return match[0].replace(/,/g, "");
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

function buildIsProductLine(isNumber: string | null | undefined, isTitle: string | null | undefined): string {
  const num = (isNumber ?? "").trim();
  const title = (isTitle ?? "").trim();
  if (num && title) return `${num} Product: ${title}`;
  return num || title;
}

export function resolveUndertakingMinimumMarkingFeeDefaults(input: {
  isCode: IsCodeMarkingFeeSource | null;
  contactPerson: string | null;
  topManagement?: TopManagementStored[];
  licenseScopeRows?: LicenseScopeTableRow[];
  firmScale?: string | null;
  bisBranchName?: string | null;
  isNumber?: string | null;
  isTitle?: string | null;
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
  const firmStatus = normalizeFirmStatus(input.firmScale ?? "");
  const qtyFromCapacity = extractNumericQtyFromCapacity(capacityRaw);

  return {
    firm_status: firmStatus,
    bis_branch: (input.bisBranchName ?? "").trim(),
    is_product_line: buildIsProductLine(input.isNumber ?? null, input.isTitle ?? null),
    unit_of_sale: unit,
    annual_production_qty: qtyFromCapacity,
    annual_production_capacity: annualCapacity,
    value_of_production_per_unit: valueDisplay,
    cost_of_production_per_unit: "",
    market_surveillance_plan: "",
    market_sample_cost: valueDisplay
      ? formatPerUnitCost(
          valueDisplay.replace(/\s*\(As Provided in Application\)\s*/i, "").trim(),
          unit,
        )
      : "",
    market_cost_most_common_variety: valueDisplay
      ? formatPerUnitCost(
          valueDisplay.replace(/\s*\(As Provided in Application\)\s*/i, "").trim(),
          unit,
        )
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
  firmScale?: string | null;
  bisBranchName?: string | null;
  isNumber?: string | null;
  isTitle?: string | null;
}): UndertakingMinimumMarkingFeeStored {
  const defaults = resolveUndertakingMinimumMarkingFeeDefaults(input);
  return mergeUndertakingMinimumMarkingFeeWithDefaults(
    defaultUndertakingMinimumMarkingFeeDocument(),
    defaults,
  );
}

export function mergeUndertakingMinimumMarkingFeeWithDefaults(
  stored: UndertakingMinimumMarkingFeeStored,
  defaults: Partial<UndertakingMinimumMarkingFeeStored>,
): UndertakingMinimumMarkingFeeStored {
  const marketFields = syncMarketSampleCostFields(
    stored.market_sample_cost || defaults.market_sample_cost || "",
    stored.market_cost_most_common_variety || defaults.market_cost_most_common_variety || "",
  );

  return {
    firm_status: stored.firm_status || defaults.firm_status || "",
    bis_branch: stored.bis_branch || defaults.bis_branch || "",
    is_product_line: stored.is_product_line || defaults.is_product_line || "",
    unit_of_sale: stored.unit_of_sale || defaults.unit_of_sale || "",
    annual_production_qty: stored.annual_production_qty || defaults.annual_production_qty || "",
    annual_production_capacity:
      stored.annual_production_capacity || defaults.annual_production_capacity || "",
    value_of_production_per_unit:
      stored.value_of_production_per_unit || defaults.value_of_production_per_unit || "",
    cost_of_production_per_unit:
      stored.cost_of_production_per_unit || defaults.cost_of_production_per_unit || "",
    market_surveillance_plan:
      stored.market_surveillance_plan || defaults.market_surveillance_plan || "",
    bis_lab_testing_charges:
      stored.bis_lab_testing_charges || defaults.bis_lab_testing_charges || "",
    osl_avg_testing_charges:
      stored.osl_avg_testing_charges || defaults.osl_avg_testing_charges || "",
    market_sample_quantity:
      stored.market_sample_quantity || defaults.market_sample_quantity || "",
    ...marketFields,
    factory_sample_count:
      stored.factory_sample_count ||
      defaults.factory_sample_count ||
      String(MARKING_FEE_DEFAULT_FACTORY_SAMPLE_COUNT),
    market_sample_count:
      stored.market_sample_count ||
      defaults.market_sample_count ||
      String(MARKING_FEE_DEFAULT_MARKET_SAMPLE_COUNT),
    factory_sample_rate: stored.factory_sample_rate || defaults.factory_sample_rate || "",
    market_sample_rate: stored.market_sample_rate || defaults.market_sample_rate || "",
    overhead_cost:
      stored.overhead_cost || defaults.overhead_cost || String(MARKING_FEE_OVERHEAD_DEFAULT),
    mmf_large_override: stored.mmf_large_override || defaults.mmf_large_override || "",
    mmf_msme_override: stored.mmf_msme_override || defaults.mmf_msme_override || "",
    final_unit_rate: stored.final_unit_rate || defaults.final_unit_rate || "",
    slab_1_text: stored.slab_1_text || defaults.slab_1_text || "",
    slab_2_text: stored.slab_2_text || defaults.slab_2_text || "",
    slab_3_text: stored.slab_3_text || defaults.slab_3_text || "",
    signatory_name: stored.signatory_name || defaults.signatory_name || "",
    signatory_designation: stored.signatory_designation || defaults.signatory_designation || "",
  };
}

export function formatMarkingFeeUnitRate(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const decimals = Number.isInteger(value) ? 0 : 2;
  return `Rs. ${value.toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: 4,
  })}/-`;
}

export function buildDefaultSlab1Text(
  unitRate: number | null,
  unitOfSale: string,
): string {
  if (unitRate == null) return "";
  const unit = unitOfSale.trim() || "unit";
  return `Rs ${unitRate.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/- per ${unit} for ALL UNITS`;
}
