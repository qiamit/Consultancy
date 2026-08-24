"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatCmDisplay } from "@backend/modules/bis/bis-project-license-status";
import { formatDisplayDate } from "@backend/shared/format-date";
import { bisProjectSavedLicenseScope } from "@backend/modules/bis/bis-project-scope-label";
import { createClient } from "@backend/db/supabase/client";

export type ClientSnapshotRow = {
  id: string;
  title: string;
  project_kind: string;
  cm_l_digits: string | null;
  license_validity_date: string | null;
  client_id: string | null;
  client_name: string;
  is_number?: string | null;
  is_revision_year?: number | null;
  is_code_title?: string | null;
  notes?: string | null;
};

type ClientDetail = {
  name: string | null;
  company_name: string | null;
  contact_person_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pin_code: string | null;
  gst_number: string | null;
  company_type: string | null;
  company_scale: string | null;
  opening_balance: number | null;
  balance_type: string | null;
  payment_term: string | null;
};

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr);
  return Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr: string | null): string {
  return formatDisplayDate(dateStr);
}

function InfoItem({
  label,
  value,
  full,
  align = "left",
}: {
  label: string;
  value: string;
  full?: boolean;
  align?: "left" | "center" | "right";
}) {
  const alignCls =
    align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left";

  return (
    <div className={`${full ? "col-span-2" : ""} ${alignCls}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-zinc-800 dark:text-zinc-100">{value || "—"}</p>
    </div>
  );
}

export function ClientSnapshotModal({ row, onClose }: { row: ClientSnapshotRow; onClose: () => void }) {
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [licenseScope, setLicenseScope] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function loadDetails() {
      setLoading(true);

      const tasks: PromiseLike<void>[] = [
        supabase
          .from("bis_projects")
          .select("notes")
          .eq("id", row.id)
          .maybeSingle()
          .then(({ data }) => {
            if (!cancelled) {
              setLicenseScope(bisProjectSavedLicenseScope(data?.notes ?? row.notes));
            }
          }),
      ];

      if (row.client_id) {
        tasks.push(
          supabase
            .from("clients")
            .select("name, company_name, contact_person_name, email, phone, address, city, state, pin_code, gst_number, company_type, company_scale, opening_balance, balance_type, payment_term")
            .eq("id", row.client_id)
            .single()
            .then(({ data }) => {
              if (!cancelled) setClient(data);
            }),
        );
      }

      await Promise.all(tasks);
      if (!cancelled) setLoading(false);
    }

    loadDetails();
    return () => {
      cancelled = true;
    };
  }, [row.id, row.client_id, row.notes]);

  const address = [client?.address, client?.city, client?.state, client?.pin_code].filter(Boolean).join(", ");
  const days = daysUntil(row.license_validity_date);
  const daysLabel = days === null ? "—" : days < 0 ? `Expired ${Math.abs(days)}d ago` : `${days} days`;
  const balanceLabel = `₹ ${(client?.opening_balance ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })} ${client?.balance_type ?? "Dr"}`;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
        <div className="flex items-center justify-between bg-gradient-to-r from-sky-600 to-sky-500 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-white">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-bold text-white">{client?.company_name ?? row.client_name}</h2>
              <p className="text-xs text-sky-100">{client?.company_type ?? ""}{client?.company_scale ? ` · ${client.company_scale}` : ""}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-white/70 hover:bg-white/20 hover:text-white">
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-14">
            <svg className="h-6 w-6 animate-spin text-sky-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          </div>
        ) : (
          <div className="max-h-[65vh] overflow-y-auto">
            <div className="border-b border-zinc-100 px-6 py-5 dark:border-zinc-800">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-sky-600 dark:text-sky-400">Contact Information</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <InfoItem label="Contact Person" value={client?.contact_person_name ?? "—"} />
                <InfoItem label="Phone" value={client?.phone ?? "—"} align="right" />
                <InfoItem label="Email" value={client?.email ?? "—"} />
                <InfoItem label="GST Number" value={client?.gst_number ?? "—"} align="right" />
                <InfoItem label="Address" value={address || "—"} full />
              </div>
            </div>

            <div className="border-b border-zinc-100 px-6 py-5 dark:border-zinc-800">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-sky-600 dark:text-sky-400">Financial Details</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <InfoItem label="Opening Balance" value={balanceLabel} />
                <InfoItem label="Payment Term" value={client?.payment_term ?? "—"} />
              </div>
            </div>

            <div className="px-6 py-5">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-sky-600 dark:text-sky-400">License Details</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <InfoItem
                  label="IS Number"
                  value={
                    row.is_number
                      ? row.is_revision_year
                        ? `${row.is_number}: ${row.is_revision_year}`
                        : row.is_number
                      : "—"
                  }
                />
                <InfoItem label="CM/L Number" value={formatCmDisplay(row.project_kind, row.cm_l_digits)} align="right" />
                <InfoItem label="Validity Date" value={formatDate(row.license_validity_date)} />
                <InfoItem label="Days Remaining" value={daysLabel} align="right" />
              </div>
              <div className="mt-4">
                <InfoItem label="License Scope" value={licenseScope} full />
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-zinc-100 bg-zinc-50 px-6 py-4 dark:border-zinc-800 dark:bg-zinc-800/40">
          <span className="text-xs text-zinc-400">View-only snapshot</span>
          <Link href={`/dashboard/bis-projects?id=${row.id}`} className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500">
            Open Full Project
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
