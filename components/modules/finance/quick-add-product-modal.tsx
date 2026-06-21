"use client";

import { useState } from "react";
import { executeQuickSaveProduct } from "@/lib/actions/products-master";
import { DEFAULT_GST_RATE, GST_RATES } from "@/lib/constants/product-master";

type ProductResult = {
  id: string;
  name: string;
  unit_of_item: string;
  sale_price: number;
  gst_rate: string;
};

export function QuickAddProductModal({
  prefillName,
  onSuccess,
  onClose,
}: {
  prefillName?: string;
  onSuccess: (product: ProductResult) => void;
  onClose: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(prefillName ?? "");
  const [category, setCategory] = useState<"service" | "product">("service");
  const [gstRate, setGstRate] = useState(DEFAULT_GST_RATE);
  const [salePrice, setSalePrice] = useState("0");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Item name is required.");
      return;
    }
    const price = parseFloat(salePrice) || 0;
    setSaving(true);
    setError(null);
    const result = await executeQuickSaveProduct(name.trim(), category, gstRate, price);
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onSuccess(result);
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4 dark:border-zinc-700">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Add Product / Service
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-4">
          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-900/30 dark:text-red-400">
              {error}
            </p>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Item Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter item name"
              autoFocus
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Category
            </label>
            <div className="flex gap-3">
              {(["service", "product"] as const).map((c) => (
                <label key={c} className="flex cursor-pointer items-center gap-1.5 text-sm text-zinc-700 dark:text-zinc-300">
                  <input
                    type="radio"
                    name="category"
                    value={c}
                    checked={category === c}
                    onChange={() => setCategory(c)}
                    className="accent-sky-600"
                  />
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Sale Price (₹)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                GST Rate
              </label>
              <select
                value={gstRate}
                onChange={(e) => setGstRate(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
              >
                {GST_RATES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save & Select"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
