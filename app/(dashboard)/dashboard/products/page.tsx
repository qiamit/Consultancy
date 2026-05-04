import { Suspense } from "react";
import { ProductMaster } from "@/components/modules/product-master";
import {
  DEFAULT_GST_RATE,
  DEFAULT_UNIT,
  GST_RATES,
  UNITS,
} from "@/components/modules/product-master/constants";
import {
  DROPDOWN_KEY_PRODUCT_GST_RATE,
  DROPDOWN_KEY_PRODUCT_UNIT,
} from "@/lib/dropdown-keys";
import { fetchAppDropdownOptions } from "@/lib/data/app-dropdown-options";
import { createClient } from "@/lib/supabase/server";
import type { ProductMasterRow } from "@/lib/types/product-master";
import type { AppDropdownOptionRow } from "@/lib/types/app-dropdown-option";

function MasterFallback() {
  return (
    <div className="mx-auto max-w-[1400px] animate-pulse rounded-lg border border-zinc-200 bg-zinc-100 p-8 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
      Loading Product & Services…
    </div>
  );
}

function firstSearchParam(
  sp: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const v = sp[key];
  if (v === undefined) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: items, error } = await supabase
    .from("product_master_items")
    .select("*")
    .order("created_at", { ascending: false });

  const rows = (items ?? []) as unknown as ProductMasterRow[];

  let unitOptions: AppDropdownOptionRow[] = await fetchAppDropdownOptions(
    supabase,
    DROPDOWN_KEY_PRODUCT_UNIT,
  );
  if (unitOptions.length === 0) {
    unitOptions = UNITS.map((value, i) => ({
      id: `__static_product_unit__${i}`,
      value,
      label: null,
      canDelete: false,
    }));
  }
  if (!unitOptions.some((o) => o.value === DEFAULT_UNIT)) {
    unitOptions = [
      {
        id: "__static_product_unit_default__",
        value: DEFAULT_UNIT,
        label: null,
        canDelete: false,
      },
      ...unitOptions,
    ];
  }

  let gstRateOptions: AppDropdownOptionRow[] = await fetchAppDropdownOptions(
    supabase,
    DROPDOWN_KEY_PRODUCT_GST_RATE,
  );
  if (gstRateOptions.length === 0) {
    gstRateOptions = GST_RATES.map((value, i) => ({
      id: `__static_product_gst__${i}`,
      value,
      label: null,
      canDelete: false,
    }));
  }
  if (!gstRateOptions.some((o) => o.value === DEFAULT_GST_RATE)) {
    gstRateOptions = [
      {
        id: "__static_product_gst_default__",
        value: DEFAULT_GST_RATE,
        label: null,
        canDelete: false,
      },
      ...gstRateOptions,
    ];
  }

  return (
    <Suspense fallback={<MasterFallback />}>
      <ProductMaster
        initialRows={rows}
        fetchError={error?.message ?? null}
        queryError={firstSearchParam(sp, "error")}
        dbErrorCode={firstSearchParam(sp, "db_code")}
        dbErrorHint={firstSearchParam(sp, "db_hint")}
        unitOptions={unitOptions}
        gstRateOptions={gstRateOptions}
      />
    </Suspense>
  );
}
