"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createInclusionFromLicense } from "@backend/actions/bis-projects";
import { formatCmDisplay } from "@backend/modules/bis/bis-project-license-status";
import { useSidebarLayout } from "@/components/dashboard/sidebar-layout-context";
import { DialogCloseXButton } from "@/components/modules/client-master/dialog-close-x";

export type InclusionLicensePickRow = {
  id: string;
  title: string;
  project_kind: string;
  cm_l_digits: string | null;
  license_number: string | null;
  license_validity_date: string | null;
  client_name: string;
  is_number: string | null;
  is_revision_year: number | null;
  is_code_title: string | null;
};

export function StartInclusionFromLicenseModal({
  licenses,
  onClose,
  onCreated,
}: {
  licenses: InclusionLicensePickRow[];
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const router = useRouter();
  const { open: sidebarOpen } = useSidebarLayout();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return licenses;
    return licenses.filter((r) => {
      const cm = r.cm_l_digits
        ? formatCmDisplay(r.project_kind, r.cm_l_digits).toLowerCase()
        : "";
      return (
        r.client_name.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q) ||
        (r.is_number?.toLowerCase().includes(q) ?? false) ||
        (r.is_code_title?.toLowerCase().includes(q) ?? false) ||
        cm.includes(q) ||
        (r.license_number?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [licenses, search]);

  function handleStart() {
    if (!selectedId) {
      setError("Select an existing license to start inclusion.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await createInclusionFromLicense(selectedId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onCreated(res.id);
      router.refresh();
      onClose();
    });
  }

  return (
    <div
      className={`fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm ${
        sidebarOpen ? "lg:left-64" : "lg:left-0"
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget && !pending) onClose();
      }}
    >
      <div className="my-8 w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-zinc-900">
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
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Inclusion work runs on an already granted CM/L license. Pick the license
            below — a new Inclusion case will be created with the same client, IS code,
            and CM/L number.
          </p>

          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search client, IS, CM/L…"
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/30 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />

          <div className="max-h-[22rem] overflow-y-auto rounded-xl border border-zinc-200 dark:border-zinc-700">
            {filtered.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-zinc-500">
                No matching licenses found.
              </p>
            ) : (
              <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {filtered.map((r) => {
                  const selected = selectedId === r.id;
                  const cm = r.cm_l_digits
                    ? formatCmDisplay(r.project_kind, r.cm_l_digits)
                    : "—";
                  return (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(r.id)}
                        className={`flex w-full flex-col gap-0.5 px-4 py-3 text-left transition-colors ${
                          selected
                            ? "bg-teal-50 dark:bg-teal-950/40"
                            : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                        }`}
                      >
                        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                          {r.client_name}
                        </span>
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                          {r.is_number
                            ? `${r.is_number}${r.is_revision_year ? `: ${r.is_revision_year}` : ""}`
                            : "—"}
                          {" · "}
                          <span className="font-mono">{cm}</span>
                          {r.license_validity_date
                            ? ` · Valid till ${r.license_validity_date}`
                            : ""}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {error ? (
            <p className="text-sm font-medium text-rose-600 dark:text-rose-400">{error}</p>
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
              disabled={pending || !selectedId}
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
