"use client";

import { useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { executeSaveClientMaster } from "@backend/actions/clients";

export function QuickAddClientModal({
  onSuccess,
  onClose,
}: {
  onSuccess: (clientId: string, clientName: string) => void;
  onClose: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState({
    company_name: "",
    phone: "",
    email: "",
    gst_number: "",
  });

  function set(key: keyof typeof fields, value: string) {
    setFields((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fields.company_name.trim()) {
      setError("Company name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    const fd = new FormData();
    fd.set("company_name", fields.company_name.trim());
    fd.set("phone", fields.phone.trim());
    fd.set("email", fields.email.trim());
    fd.set("gst_number", fields.gst_number.trim());
    const result = await executeSaveClientMaster(fd);
    setSaving(false);
    if (!result.ok) {
      setError(result.error ?? "Failed to save client.");
      return;
    }
    onSuccess(result.id!, fields.company_name.trim());
  }

  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  if (!isClient) return null;

  const modal = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => { e.stopPropagation(); if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-md rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-700 px-5 py-4">
          <h2 className="text-sm font-bold text-zinc-100">Add New Client</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-4">
          {error && (
            <p className="rounded-lg bg-rose-900/30 px-3 py-2 text-xs font-medium text-rose-300 ring-1 ring-rose-700/50">
              {error}
            </p>
          )}

          <div>
            <label className="mb-1 block text-xs font-semibold text-zinc-300">
              Company Name <span className="text-rose-400">*</span>
            </label>
            <input
              autoFocus
              type="text"
              value={fields.company_name}
              onChange={(e) => set("company_name", e.target.value)}
              placeholder="e.g. ABC Pvt. Ltd."
              className="block w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-zinc-300">
              GST Number <span className="text-zinc-500">(optional)</span>
            </label>
            <input
              type="text"
              value={fields.gst_number}
              onChange={(e) => set("gst_number", e.target.value)}
              placeholder="15-character GSTIN"
              className="block w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-zinc-300">
                Phone <span className="text-zinc-500">(optional)</span>
              </label>
              <input
                type="text"
                value={fields.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="10-digit number"
                className="block w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-zinc-300">
                Email <span className="text-zinc-500">(optional)</span>
              </label>
              <input
                type="email"
                value={fields.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="name@company.com"
                className="block w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
              />
            </div>
          </div>

          <p className="text-[11px] text-zinc-500">
            Other details (address, payment terms, etc.) can be updated later in Client Master.
          </p>

          <div className="flex justify-end gap-2 border-t border-zinc-700 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-700 px-4 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-500 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Add Client"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
