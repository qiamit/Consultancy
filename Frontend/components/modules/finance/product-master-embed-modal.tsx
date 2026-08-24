"use client";

import { useEffect, useState } from "react";
import { emptyForm } from "@/components/modules/product-master/constants";
import { ProductMasterForm } from "@/components/modules/product-master/form";
import { FinanceFormModalShell } from "@/components/modules/finance/finance-form-modal-shell";
import { fetchProductFormOptions, fetchNextProductItemSuffix } from "@backend/actions/form-options";
import type { AppDropdownOptionRow } from "@backend/shared/types/app-dropdown-option";

type ProductResult = {
  id: string;
  name: string;
  unit_of_item: string;
  sale_price: number;
  gst_rate: string;
};

export function ProductMasterEmbedModal({
  prefillName,
  onSuccess,
  onClose,
}: {
  prefillName?: string;
  onSuccess: (product: ProductResult) => void;
  onClose: () => void;
}) {
  const [unitOptions, setUnitOptions] = useState<AppDropdownOptionRow[]>([]);
  const [gstRateOptions, setGstRateOptions] = useState<AppDropdownOptionRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [form, setForm] = useState(() => {
    const base = emptyForm();
    return prefillName ? { ...base, name: prefillName } : base;
  });

  useEffect(() => {
    const cat: "product" | "service" = form.category === "service" ? "service" : "product";
    Promise.all([fetchProductFormOptions(), fetchNextProductItemSuffix(cat)]).then(
      ([{ unitOptions: u, gstRateOptions: g }, suffix]) => {
        setUnitOptions(u);
        setGstRateOptions(g);
        setForm((f) => ({ ...f, item_code_suffix: suffix }));
        setLoaded(true);
      },
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <FinanceFormModalShell
      ariaLabelledBy="product-master-form-title"
      onClose={onClose}
      zIndexClass="z-[9999]"
    >
      {!loaded ? (
        <div className="flex items-center justify-center px-8 py-16 text-sm text-zinc-500 dark:text-zinc-400">
          Loading form…
        </div>
      ) : (
        <ProductMasterForm
          visible
          overlay
          formValues={form}
          isNewParam
          idParam={null}
          onClose={onClose}
          onAddNew={() => setForm(emptyForm())}
          onUpdateField={(key, value) => setForm((f) => ({ ...f, [key]: value }))}
          unitOptions={unitOptions}
          gstRateOptions={gstRateOptions}
          onEmbeddedSaveSuccess={(result) => {
            onSuccess(result);
          }}
        />
      )}
    </FinanceFormModalShell>
  );
}
