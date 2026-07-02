"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatCmDisplay } from "@/lib/bis-project-license-status";
import { formatDisplayDate } from "@/lib/format-date";
import {
  addLicenseSurveillance,
  type AddLicenseSurveillanceInput,
} from "@/lib/actions/license-surveillance";

export type SurveillanceRow = {
  id: string;
  surveillance_date: string;
  allotted_employee_name: string;
  cm_l_digits: string | null;
  project_kind: string | null;
  client_id: string;
  bis_project_id: string | null;
  is_code_id: string | null;
  client_name: string;
  is_number: string | null;
  is_revision_year: number | null;
  is_code_title: string | null;
  created_at: string;
};

type ClientOption = { id: string; name: string; company_name: string | null };
type IsCodeOption = {
  is_code_id: string;
  is_number: string | null;
  revision_year: number | null;
  is_code_title: string | null;
};
type LicenseMatch = {
  id: string;
  cm_l_digits: string | null;
  project_kind: string;
};

const inputCls =
  "w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 placeholder-zinc-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:disabled:bg-zinc-900";

const chkCls =
  "h-4 w-4 rounded border-zinc-300 text-sky-600 focus:ring-sky-500/30 dark:border-zinc-600 dark:bg-zinc-900 dark:text-sky-500";

const thCls =
  "px-3 py-2.5 text-center text-xs font-semibold text-zinc-500 dark:text-zinc-400";

const tdCls = "px-3 py-3 text-center align-middle text-sm text-zinc-700 dark:text-zinc-300";

function formatIsCodeShort(isNumber: string | null, revisionYear: number | null): string {
  if (!isNumber) return "—";
  return revisionYear ? `${isNumber}: ${revisionYear}` : isNumber;
}

function formatIsDisplay(isNumber: string | null, revisionYear: number | null, title: string | null): string {
  const base = formatIsCodeShort(isNumber, revisionYear);
  if (base === "—" || !title) return base;
  return `${base} — ${title}`;
}

function SurveillanceAddModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [employees, setEmployees] = useState<string[]>([]);
  const [employeesLoading, setEmployeesLoading] = useState(true);

  const [clientId, setClientId] = useState("");
  const [isCodeId, setIsCodeId] = useState("");
  const [isCodes, setIsCodes] = useState<IsCodeOption[]>([]);
  const [isCodesLoading, setIsCodesLoading] = useState(false);

  const [licenseMatch, setLicenseMatch] = useState<LicenseMatch | null>(null);
  const [surveillanceDate, setSurveillanceDate] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    void Promise.all([
      supabase
        .from("clients")
        .select("id, name, company_name")
        .order("company_name", { ascending: true })
        .limit(500),
      supabase
        .from("profiles")
        .select("full_name")
        .not("full_name", "is", null)
        .order("full_name", { ascending: true }),
    ]).then(([clientsRes, profilesRes]) => {
      if (cancelled) return;
      setClients((clientsRes.data ?? []) as ClientOption[]);
      setClientsLoading(false);
      const names = (profilesRes.data ?? [])
        .map((p) => (p.full_name as string | null)?.trim())
        .filter((n): n is string => Boolean(n));
      setEmployees([...new Set(names)]);
      setEmployeesLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setIsCodeId("");
    setLicenseMatch(null);
    if (!clientId) {
      setIsCodes([]);
      return;
    }
    let cancelled = false;
    setIsCodesLoading(true);
    const supabase = createClient();
    supabase
      .from("bis_projects")
      .select("is_code_id, is_codes(is_number, revision_year, is_code_title)")
      .eq("client_id", clientId)
      .neq("project_kind", "application")
      .not("is_code_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data }) => {
        if (cancelled) return;
        const seen = new Set<string>();
        const options: IsCodeOption[] = [];
        for (const row of data ?? []) {
          const r = row as Record<string, unknown>;
          const codeId = r.is_code_id as string | null;
          if (!codeId || seen.has(codeId)) continue;
          seen.add(codeId);
          const ic = Array.isArray(r.is_codes) ? r.is_codes[0] : (r.is_codes as IsCodeOption | null);
          options.push({
            is_code_id: codeId,
            is_number: (ic as { is_number?: string } | null)?.is_number ?? null,
            revision_year: (ic as { revision_year?: number } | null)?.revision_year ?? null,
            is_code_title: (ic as { is_code_title?: string } | null)?.is_code_title ?? null,
          });
        }
        setIsCodes(options);
        setIsCodesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  useEffect(() => {
    setLicenseMatch(null);
    if (!clientId || !isCodeId) return;
    let cancelled = false;
    const supabase = createClient();
    supabase
      .from("bis_projects")
      .select("id, cm_l_digits, project_kind")
      .eq("client_id", clientId)
      .eq("is_code_id", isCodeId)
      .neq("project_kind", "application")
      .not("cm_l_digits", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        if (data) {
          setLicenseMatch({
            id: data.id as string,
            cm_l_digits: data.cm_l_digits as string | null,
            project_kind: (data.project_kind as string) ?? "licence",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [clientId, isCodeId]);

  const cmDisplay = licenseMatch
    ? formatCmDisplay(licenseMatch.project_kind, licenseMatch.cm_l_digits)
    : "—";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload: AddLicenseSurveillanceInput = {
      client_id: clientId,
      is_code_id: isCodeId,
      bis_project_id: licenseMatch?.id ?? null,
      cm_l_digits: licenseMatch?.cm_l_digits ?? null,
      project_kind: licenseMatch?.project_kind ?? null,
      surveillance_date: surveillanceDate,
      allotted_employee_name: employeeName,
    };
    const result = await addLicenseSurveillance(payload);
    if (!result.ok) {
      setError(result.error);
      setSaving(false);
      return;
    }
    onAdded();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
        <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-700">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-white">Add Licence — Surveillance</h2>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            Select client and IS code; CM/L fills automatically from the linked license.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Client Name</label>
            <select
              required
              value={clientId}
              disabled={clientsLoading}
              onChange={(e) => setClientId(e.target.value)}
              className={inputCls}
            >
              <option value="">{clientsLoading ? "Loading clients…" : "Select client"}</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company_name ?? c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">IS Code</label>
            <select
              required
              value={isCodeId}
              disabled={!clientId || isCodesLoading}
              onChange={(e) => setIsCodeId(e.target.value)}
              className={inputCls}
            >
              <option value="">
                {!clientId
                  ? "Select client first"
                  : isCodesLoading
                    ? "Loading IS codes…"
                    : isCodes.length === 0
                      ? "No IS codes for this client"
                      : "Select IS code"}
              </option>
              {isCodes.map((ic) => (
                <option key={ic.is_code_id} value={ic.is_code_id}>
                  {formatIsDisplay(ic.is_number, ic.revision_year, ic.is_code_title)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">CM/L Number</label>
            <input
              type="text"
              readOnly
              value={cmDisplay}
              className={inputCls}
              aria-readonly
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Date of Surveillance</label>
            <input
              type="date"
              required
              value={surveillanceDate}
              onChange={(e) => setSurveillanceDate(e.target.value)}
              className={inputCls}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Allotted Employee Name</label>
            <select
              required
              value={employeeName}
              disabled={employeesLoading}
              onChange={(e) => setEmployeeName(e.target.value)}
              className={inputCls}
            >
              <option value="">{employeesLoading ? "Loading employees…" : "Select employee"}</option>
              {employees.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !clientId || !isCodeId || !surveillanceDate || !employeeName}
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 disabled:opacity-50 dark:bg-sky-700 dark:hover:bg-sky-600"
            >
              {saving ? "Adding…" : "Add"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function SurveillanceSection({ rows }: { rows: SurveillanceRow[] }) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const selectAllRef = useRef<HTMLInputElement>(null);

  const rowIds = rows.map((r) => r.id);
  const allSelected = rows.length > 0 && rowIds.every((id) => selectedIds.has(id));
  const someSelected = rowIds.some((id) => selectedIds.has(id)) && !allSelected;

  useEffect(() => {
    const el = selectAllRef.current;
    if (el) el.indeterminate = someSelected;
  }, [someSelected]);

  function toggleRowSelection(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds((prev) => {
      if (rows.length > 0 && rowIds.every((id) => prev.has(id))) return new Set();
      return new Set(rowIds);
    });
  }

  function handleWorkDuringSurveillance(row: SurveillanceRow) {
    if (row.bis_project_id) {
      router.push(`/dashboard/bis-projects?id=${row.bis_project_id}`);
      return;
    }
    if (row.client_id) {
      router.push(`/dashboard/clients?id=${row.client_id}`);
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800 sm:px-5">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">License Surveillance</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {rows.length} {rows.length === 1 ? "entry" : "entries"} tracked
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-sky-700 dark:bg-sky-700 dark:hover:bg-sky-600"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Licence
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
          No surveillance entries yet. Click &ldquo;Add Licence&rdquo; to record one.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="dashboard-section-table w-full min-w-[800px] text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-950/50">
              <tr>
                <th className={`${thCls} w-11`} aria-label="Select">
                  <div className="flex justify-center">
                    <input
                      ref={selectAllRef}
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      className={chkCls}
                      title="Select all"
                      aria-label="Select all surveillance entries"
                    />
                  </div>
                </th>
                <th className={thCls}>Client</th>
                <th className={thCls}>IS Code</th>
                <th className={thCls}>CM/L</th>
                <th className={thCls}>Surveillance Date</th>
                <th className={thCls}>Allotted Employee</th>
                <th className={`${thCls} sm:pr-5`}>Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40">
                  <td className={`${tdCls} w-11`}>
                    <div className="flex justify-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(row.id)}
                        onChange={() => toggleRowSelection(row.id)}
                        className={chkCls}
                        aria-label={`Select ${row.client_name}`}
                        title={`Select ${row.client_name}`}
                      />
                    </div>
                  </td>
                  <td className={`${tdCls} font-medium text-zinc-900 dark:text-zinc-100`}>
                    {row.client_name}
                  </td>
                  <td className={tdCls}>
                    {formatIsCodeShort(row.is_number, row.is_revision_year)}
                  </td>
                  <td className={`${tdCls} font-mono text-xs`}>
                    {formatCmDisplay(row.project_kind ?? "licence", row.cm_l_digits)}
                  </td>
                  <td className={tdCls}>{formatDisplayDate(row.surveillance_date)}</td>
                  <td className={tdCls}>{row.allotted_employee_name}</td>
                  <td className={`${tdCls} sm:pr-5`}>
                    <button
                      type="button"
                      onClick={() => handleWorkDuringSurveillance(row)}
                      title="Work during surveillance"
                      className="inline-flex items-center justify-center rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-sky-700 dark:bg-sky-700 dark:hover:bg-sky-600"
                    >
                      Work
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <SurveillanceAddModal
          onClose={() => setModalOpen(false)}
          onAdded={() => router.refresh()}
        />
      )}
    </div>
  );
}
