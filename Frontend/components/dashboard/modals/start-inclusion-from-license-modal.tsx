"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createInclusionFromLicense } from "@backend/actions/bis-projects";
import type {
  LicenseScopeFormat,
  LicenseScopeTableRow,
} from "@backend/modules/bis/application-checklist-notes";
import {
  isApplicationProjectKind,
  isInclusionProjectKind,
} from "@backend/modules/bis/bis-project-kind";
import { formatCmDisplay } from "@backend/modules/bis/bis-project-license-status";
import { createClient } from "@backend/db/client/client";
import { useSidebarLayout } from "@/components/dashboard/sidebar-layout-context";
import { DialogCloseXButton } from "@/components/modules/client-master/dialog-close-x";
import {
  LicenseScopeField,
  ScopeTypeSelect,
} from "@/components/modules/bis-projects/license-scope-field";
import { BIS_FIELD_LABEL_CLASS } from "@/components/modules/bis-projects/constants";
import {
  IsCodeCombobox,
  type IsCodeComboboxOption,
} from "@/components/modules/bis-projects/is-code-combobox";

export type InclusionClientOption = {
  id: string;
  label: string;
  filterText?: string;
};

export type InclusionLicensePickRow = {
  id: string;
  title: string;
  project_kind: string;
  cm_l_digits: string | null;
  license_number: string | null;
  license_validity_date: string | null;
  client_id: string | null;
  client_name: string;
  is_code_id: string | null;
  is_number: string | null;
  is_revision_year: number | null;
  is_code_title: string | null;
};

const fieldInp =
  "mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/30 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100";

function todayYmd(): string {
  return new Date().toISOString().split("T")[0]!;
}

function isLabel(r: Pick<InclusionLicensePickRow, "is_number" | "is_revision_year">): string {
  if (!r.is_number) return "—";
  const year = r.is_revision_year ? `: ${r.is_revision_year}` : "";
  return `${r.is_number}${year}`;
}

function toYmdOrNull(value: unknown): string | null {
  if (value == null || value === "") return null;
  const s = String(value).trim();
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(s);
  return m ? m[1]! : s || null;
}

export function StartInclusionFromLicenseModal({
  licenses,
  clients = [],
  onClose,
  onCreated,
}: {
  licenses: InclusionLicensePickRow[];
  /** Full Client Master list (preferred). Falls back to license clients if empty. */
  clients?: InclusionClientOption[];
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const router = useRouter();
  const { open: sidebarOpen } = useSidebarLayout();
  const [clientId, setClientId] = useState("");
  const [isCodeId, setIsCodeId] = useState("");
  const [startDate, setStartDate] = useState(todayYmd);
  const [endDate, setEndDate] = useState("");
  const [scopeType, setScopeType] = useState<LicenseScopeFormat>("plain");
  const [scopePlain, setScopePlain] = useState("");
  const [scopeRowsJson, setScopeRowsJson] = useState("[]");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [fetchedLicenses, setFetchedLicenses] = useState<InclusionLicensePickRow[]>([]);
  const [loadingLicenses, setLoadingLicenses] = useState(false);

  const clientOptions: IsCodeComboboxOption[] = useMemo(() => {
    if (clients.length > 0) {
      return clients
        .map((c) => ({
          id: c.id,
          label: c.label,
          filterText: c.filterText ?? c.label,
        }))
        .sort((a, b) =>
          a.label.localeCompare(b.label, undefined, { sensitivity: "base" }),
        );
    }
    const map = new Map<string, string>();
    for (const r of licenses) {
      const id = (r.client_id ?? "").trim();
      if (!id) continue;
      if (!map.has(id)) map.set(id, r.client_name || "Unknown Client");
    }
    return Array.from(map.entries())
      .map(([id, name]) => ({
        id,
        label: name,
        filterText: name,
      }))
      .sort((a, b) =>
        a.label.localeCompare(b.label, undefined, { sensitivity: "base" }),
      );
  }, [clients, licenses]);

  // Load this client's granted licenses when client changes (avoids preload miss / limit).
  useEffect(() => {
    const id = clientId.trim();
    setIsCodeId("");
    setFetchedLicenses([]);
    if (!id) {
      setLoadingLicenses(false);
      return;
    }

    let cancelled = false;
    setLoadingLicenses(true);
    void (async () => {
      try {
        const supabase = createClient();
        const { data, error: fetchError } = await supabase
          .from("bis_projects")
          .select(
            "id, title, project_kind, cm_l_digits, license_number, license_validity_date, client_id, is_code_id, is_codes(is_number, revision_year, is_code_title)",
          )
          .eq("client_id", id)
          .not("license_validity_date", "is", null)
          .not("is_code_id", "is", null)
          .order("license_validity_date", { ascending: false });

        if (cancelled) return;
        if (fetchError) {
          setFetchedLicenses([]);
          setError(fetchError.message);
          setLoadingLicenses(false);
          return;
        }

        type IsJoin = {
          is_number?: string | null;
          revision_year?: number | null;
          is_code_title?: string | null;
        } | null;

        const rows: InclusionLicensePickRow[] = (data ?? [])
          .map((r) => {
            const ic = (
              Array.isArray(r.is_codes) ? r.is_codes[0] : r.is_codes
            ) as IsJoin;
            return {
              id: String(r.id),
              title: String(r.title ?? ""),
              project_kind: String(r.project_kind ?? ""),
              cm_l_digits: (r.cm_l_digits as string | null) ?? null,
              license_number: (r.license_number as string | null) ?? null,
              license_validity_date: toYmdOrNull(r.license_validity_date),
              client_id: (r.client_id as string | null) ?? id,
              client_name: "",
              is_code_id: (r.is_code_id as string | null) ?? null,
              is_number: ic?.is_number ?? null,
              is_revision_year: ic?.revision_year ?? null,
              is_code_title: ic?.is_code_title ?? null,
            };
          })
          .filter(
            (r) =>
              !isApplicationProjectKind(r.project_kind) &&
              !isInclusionProjectKind(r.project_kind) &&
              Boolean(r.is_code_id),
          );

        setFetchedLicenses(rows);
        setError(null);
      } catch (err) {
        if (!cancelled) {
          setFetchedLicenses([]);
          setError(err instanceof Error ? err.message : "Unable to load licenses.");
        }
      } finally {
        if (!cancelled) setLoadingLicenses(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [clientId]);

  const clientLicenses = useMemo(() => {
    if (fetchedLicenses.length > 0) return fetchedLicenses;
    // Fallback while fetch pending / offline: preload from page props.
    return licenses.filter((r) => (r.client_id ?? "").trim() === clientId);
  }, [fetchedLicenses, licenses, clientId]);

  const isOptions: IsCodeComboboxOption[] = useMemo(() => {
    const map = new Map<string, IsCodeComboboxOption>();
    for (const r of clientLicenses) {
      const id = (r.is_code_id ?? "").trim();
      if (!id || map.has(id)) continue;
      const label = isLabel(r);
      map.set(id, {
        id,
        label,
        filterText: `${r.is_number ?? ""} ${r.is_revision_year ?? ""} ${r.is_code_title ?? ""} ${label}`,
      });
    }
    return Array.from(map.values()).sort((a, b) =>
      a.label.localeCompare(b.label, undefined, { sensitivity: "base" }),
    );
  }, [clientLicenses]);

  const selectedLicense = useMemo(() => {
    if (!clientId || !isCodeId) return null;
    const matches = clientLicenses.filter(
      (r) => (r.is_code_id ?? "").trim() === isCodeId,
    );
    if (matches.length === 0) return null;
    return (
      [...matches].sort((a, b) =>
        String(b.license_validity_date ?? "").localeCompare(
          String(a.license_validity_date ?? ""),
        ),
      )[0] ?? null
    );
  }, [clientId, isCodeId, clientLicenses]);

  const cmDisplay = selectedLicense?.cm_l_digits
    ? formatCmDisplay(selectedLicense.project_kind, selectedLicense.cm_l_digits)
    : "—";

  function handleClientChange(next: string) {
    setClientId(next);
    setIsCodeId("");
    setError(null);
  }

  function handleIsChange(next: string) {
    setIsCodeId(next);
    setError(null);
  }

  function handleStart() {
    if (!clientId) {
      setError("Select a client.");
      return;
    }
    if (!isCodeId) {
      setError("Select an IS Number.");
      return;
    }
    if (!selectedLicense) {
      setError(
        !loadingLicenses && clientLicenses.length === 0
          ? "No granted license found for this client. Add/open a BIS license with validity date first."
          : "No matching license found for this Client + IS Number.",
      );
      return;
    }
    if (!startDate) {
      setError("Pick a Start Date.");
      return;
    }
    if (!endDate) {
      setError("Pick an End Date.");
      return;
    }

    let scopeRows: LicenseScopeTableRow[] = [];
    if (scopeType === "table") {
      try {
        const parsed = JSON.parse(scopeRowsJson || "[]") as LicenseScopeTableRow[];
        scopeRows = Array.isArray(parsed)
          ? parsed.filter((r) => r.component?.trim() || r.value?.trim())
          : [];
      } catch {
        scopeRows = [];
      }
      if (scopeRows.length === 0) {
        setError("Enter at least one Inclusion Scope row.");
        return;
      }
    } else if (!scopePlain.trim()) {
      setError("Enter Inclusion Scope.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const res = await createInclusionFromLicense({
        licenseId: selectedLicense.id,
        startDate,
        endDate,
        inclusionScopeFormat: scopeType,
        inclusionScopePlain: scopePlain,
        inclusionScopeRows: scopeRows,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onCreated(res.id);
      router.refresh();
      onClose();
    });
  }

  const isPlaceholder = !clientId
    ? "Select client first…"
    : loadingLicenses
      ? "Loading licenses…"
      : isOptions.length === 0
        ? "No licensed IS for this client"
        : "Type to search IS Number…";

  return (
    <div
      className={`fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm ${
        sidebarOpen ? "lg:left-64" : "lg:left-0"
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget && !pending) onClose();
      }}
    >
      <div className="my-8 w-full max-w-3xl overflow-visible rounded-2xl bg-white shadow-2xl dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b border-zinc-200 bg-teal-600 px-5 py-4 dark:border-zinc-800">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-white/70">
              BIS New Inclusion
            </p>
            <h2 className="text-base font-bold text-white">
              Start Inclusion from Existing License
            </h2>
          </div>
          <DialogCloseXButton onClick={onClose} />
        </div>

        <div className="space-y-4 px-5 py-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="inc_client" className={BIS_FIELD_LABEL_CLASS}>
                Select Client<span className="text-red-500"> *</span>
              </label>
              <div className="mt-1">
                <IsCodeCombobox
                  name="client_id"
                  label="Select Client"
                  hideLabel
                  inputId="inc_client"
                  value={clientId}
                  onChange={handleClientChange}
                  options={clientOptions}
                  placeholder="Type to search client…"
                  listZIndexClass="z-[310]"
                />
              </div>
            </div>

            <div>
              <label htmlFor="inc_is" className={BIS_FIELD_LABEL_CLASS}>
                IS Number<span className="text-red-500"> *</span>
              </label>
              <div className="mt-1">
                <IsCodeCombobox
                  key={clientId || "no-client"}
                  name="is_code_id"
                  label="IS Number"
                  hideLabel
                  inputId="inc_is"
                  value={isCodeId}
                  onChange={handleIsChange}
                  options={isOptions}
                  disabled={!clientId || loadingLicenses}
                  placeholder={isPlaceholder}
                  listZIndexClass="z-[310]"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <ScopeTypeSelect
              value={scopeType}
              onChange={(next) => {
                setScopeType(next);
                if (next === "table" && scopePlain.trim() && scopeRowsJson === "[]") {
                  setScopeRowsJson(
                    JSON.stringify([{ component: "", value: scopePlain.trim() }]),
                  );
                }
              }}
            />

            <div>
              <label htmlFor="inc_cml" className={BIS_FIELD_LABEL_CLASS}>
                CM/L Number
              </label>
              <input
                id="inc_cml"
                type="text"
                readOnly
                value={cmDisplay}
                className={`${fieldInp} bg-zinc-50 font-mono tabular-nums dark:bg-zinc-900/80`}
              />
            </div>

            <div>
              <label htmlFor="inc_start" className={BIS_FIELD_LABEL_CLASS}>
                Start Date<span className="text-red-500"> *</span>
              </label>
              <input
                id="inc_start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={fieldInp}
              />
            </div>

            <div>
              <label htmlFor="inc_end" className={BIS_FIELD_LABEL_CLASS}>
                End Date<span className="text-red-500"> *</span>
              </label>
              <input
                id="inc_end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={fieldInp}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <LicenseScopeField
              key={scopeType}
              scopeType={scopeType}
              plainText={scopePlain}
              rowsJson={scopeRowsJson}
              onPlainTextChange={setScopePlain}
              onRowsJsonChange={setScopeRowsJson}
              label="Inclusion Scope"
              placeholder="Enter inclusion / manufacturing scope to add…"
            />
          </div>

          {error ? (
            <p className="text-sm font-medium text-rose-600 dark:text-rose-400">
              {error}
            </p>
          ) : null}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={pending}
              className="rounded-lg px-3 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 disabled:opacity-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleStart}
              disabled={pending || !selectedLicense}
              className="rounded-lg bg-teal-600 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-500 disabled:opacity-50"
            >
              {pending ? "Starting…" : "Start Inclusion"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
