"use client";

import { useEffect, useState } from "react";
import { emptyForm } from "@/components/modules/product-master/constants";
import { ProductMasterForm } from "@/components/modules/product-master/form";
import { fetchProductFormOptions, fetchNextProductItemSuffix } from "@/lib/actions/form-options";
import type { AppDropdownOptionRow } from "@/lib/types/app-dropdown-option";

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
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto bg-zinc-950/50 p-4 pt-10 sm:pt-16 dark:bg-black/55"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-master-form-title"
        className="mb-10 w-full max-w-5xl rounded-xl border-[4mm] border-zinc-300 bg-zinc-50 shadow-2xl dark:border-zinc-600 dark:bg-zinc-900 dark:shadow-black/40"
        onMouseDown={(e) => e.stopPropagation()}
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
      </div>
    </div>
  );
}
