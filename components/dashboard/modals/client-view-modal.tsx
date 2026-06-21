"use client";

import { useEffect, useState, useTransition } from "react";
import { fetchClientDetail, updateClientDetail, type ClientDetail } from "@/lib/actions/renewals";

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">{label}</p>
      <p className="mt-0.5 text-sm text-zinc-800 dark:text-zinc-200">{value || "—"}</p>
    </div>
  );
}

function EditInput({
  label,
  name,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  name: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
        {label}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-0.5 w-full rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-800 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
      />
    </div>
  );
}

export function ClientViewModal({
  clientId,
  onClose,
  startInEditMode = false,
  onUpdated,
}: {
  clientId: string;
  onClose: () => void;
  startInEditMode?: boolean;
  onUpdated?: (client: ClientDetail) => void;
}) {
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(startInEditMode);
  const [form, setForm] = useState<Partial<ClientDetail>>({});
  const [saving, startSave] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setLoading(true);
    setEditing(startInEditMode);
    fetchClientDetail(clientId).then((c) => {
      setClient(c);
      if (c) setForm(c);
      setLoading(false);
    });
  }, [clientId, startInEditMode]);

  function field(k: keyof ClientDetail) {
    return (String(form[k] ?? ""));
  }

  function set(k: keyof ClientDetail) {
    return (v: string) => setForm((p) => ({ ...p, [k]: v || null }));
  }

  function handleSave() {
    setError(null);
    startSave(async () => {
      const res = await updateClientDetail(clientId, form);
      if (!res.ok) { setError(res.error); return; }
      const updated = { ...client!, ...form } as ClientDetail;
      setClient(updated);
      onUpdated?.(updated);
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 bg-gradient-to-r from-sky-50 to-blue-50 px-6 py-4 dark:border-zinc-700 dark:from-sky-950/20 dark:to-blue-950/10">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-600 text-white">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Client Details</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{client?.company_name ?? client?.name ?? "Loading…"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {saved && <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Saved ✓</span>}
            {!editing ? (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-300"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit
              </button>
            ) : (
              <>
                <button type="button" onClick={() => { setEditing(false); setForm(client ?? {}); }} className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300">Cancel</button>
                <button type="button" onClick={handleSave} disabled={saving} className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700 disabled:opacity-50">
                  {saving ? "Saving…" : "Save to Client Master"}
                </button>
              </>
            )}
            <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-zinc-400 hover:bg-white hover:text-zinc-600 dark:hover:bg-zinc-700">
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-sm text-zinc-400">Loading…</div>
          ) : !client ? (
            <div className="py-8 text-center text-sm text-red-500">Client not found.</div>
          ) : !editing ? (
            <div className="grid grid-cols-2 gap-x-8 gap-y-5">
              <Field label="Company Name" value={client.company_name} />
              <Field label="Contact Person" value={client.contact_person_name} />
              <Field label="Email" value={client.email} />
              <Field label="Phone" value={client.phone} />
              <Field label="GST Number" value={client.gst_number} />
              <Field label="Company Type" value={client.company_type} />
              <Field label="Company Scale" value={client.company_scale} />
              <Field label="Status" value={client.company_status} />
              <div className="col-span-2">
                <Field label="Address" value={[client.address, client.city, client.state, client.pin_code, client.country].filter(Boolean).join(", ")} />
              </div>
              <Field label="Payment Term" value={client.payment_term} />
              <Field label="Opening Balance" value={client.opening_balance ? `₹ ${client.opening_balance} ${client.balance_type}` : "—"} />
              {client.notes && (
                <div className="col-span-2">
                  <Field label="Notes" value={client.notes} />
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              <EditInput label="Company Name" name="company_name" value={field("company_name")} onChange={set("company_name")} />
              <EditInput label="Contact Person" name="contact_person_name" value={field("contact_person_name")} onChange={set("contact_person_name")} />
              <EditInput label="Email" name="email" value={field("email")} onChange={set("email")} type="email" />
              <EditInput label="Phone" name="phone" value={field("phone")} onChange={set("phone")} />
              <EditInput label="GST Number" name="gst_number" value={field("gst_number")} onChange={set("gst_number")} />
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Company Type</label>
                <select value={field("company_type")} onChange={(e) => set("company_type")(e.target.value)}
                  className="mt-0.5 w-full rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-800 outline-none focus:border-sky-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100">
                  {["", "Manufacturer", "Service Provider", "Testing Laboratory", "Calibration Laboratory", "RMP", "PT Provider", "Other"].map((v) => (
                    <option key={v} value={v}>{v || "— Select —"}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Company Scale</label>
                <select value={field("company_scale")} onChange={(e) => set("company_scale")(e.target.value)}
                  className="mt-0.5 w-full rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-800 outline-none focus:border-sky-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100">
                  {["", "Large", "Medium", "Small", "Micro"].map((v) => (
                    <option key={v} value={v}>{v || "— Select —"}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Status</label>
                <select value={field("company_status")} onChange={(e) => set("company_status")(e.target.value)}
                  className="mt-0.5 w-full rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-800 outline-none focus:border-sky-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100">
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <div className="col-span-2">
                <EditInput label="Address" name="address" value={field("address")} onChange={set("address")} />
              </div>
              <EditInput label="City" name="city" value={field("city")} onChange={set("city")} />
              <EditInput label="State" name="state" value={field("state")} onChange={set("state")} />
              <EditInput label="PIN Code" name="pin_code" value={field("pin_code")} onChange={set("pin_code")} />
              <EditInput label="Country" name="country" value={field("country")} onChange={set("country")} />
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Payment Term</label>
                <select value={field("payment_term")} onChange={(e) => set("payment_term")(e.target.value)}
                  className="mt-0.5 w-full rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-800 outline-none focus:border-sky-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100">
                  {["", "100% Advance", "15 Days", "30 Days"].map((v) => (
                    <option key={v} value={v}>{v || "— Select —"}</option>
                  ))}
                </select>
              </div>
              {error && (
                <div className="col-span-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">
                  {error}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
