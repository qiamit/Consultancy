"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { createClient } from "@backend/db/client/client";
import {
  listChecklistDocumentImportCandidates,
  loadChecklistDocumentForImport,
} from "@backend/actions/checklist-document-import";
import {
  CHECKLIST_IMPORT_DOCUMENT_LABELS,
  type ChecklistImportCandidate,
  type ChecklistImportDocumentKey,
  type ChecklistImportExclude,
  type ChecklistImportKind,
  type ChecklistImportPayload,
  type ChecklistImportSourceTable,
} from "@backend/modules/bis/checklist-document-import-meta";

type PartyOption = {
  id: string;
  label: string;
};

type ChecklistDocumentImportDialogProps = {
  documentKey: ChecklistImportDocumentKey;
  title?: string;
  defaultClientId?: string | null;
  exclude?: ChecklistImportExclude | null;
  onImport: (
    payload: ChecklistImportPayload,
    meta: { label: string },
  ) => boolean | void;
  onClose: () => void;
};

export function ChecklistDocumentImportDialog({
  documentKey,
  title,
  defaultClientId,
  exclude,
  onImport,
  onClose,
}: ChecklistDocumentImportDialogProps) {
  const documentLabel = CHECKLIST_IMPORT_DOCUMENT_LABELS[documentKey];
  const dialogTitle = title?.trim() || `Import ${documentLabel}`;

  const [parties, setParties] = useState<PartyOption[]>([]);
  const [partiesLoading, setPartiesLoading] = useState(true);
  const [partyQuery, setPartyQuery] = useState("");
  const [clientId, setClientId] = useState(defaultClientId?.trim() || "");
  const [kind, setKind] = useState<ChecklistImportKind>("application");
  const [candidates, setCandidates] = useState<ChecklistImportCandidate[]>([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [candidatesError, setCandidatesError] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [importing, startImport] = useTransition();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setPartiesLoading(true);
      const supabase = createClient();
      const { data, error } = await supabase
        .from("clients")
        .select("id, name, company_name, contact_person_name")
        .order("company_name", { ascending: true });
      if (cancelled) return;
      if (error) {
        setParties([]);
        setPartiesLoading(false);
        return;
      }
      setParties(
        (data ?? []).map((row) => {
          const company = (row.company_name ?? "").trim();
          const contact = (row.contact_person_name ?? "").trim();
          const name = (row.name ?? "").trim();
          const label = company
            ? contact
              ? `${company} (${contact})`
              : company
            : contact || name || "Unnamed party";
          return { id: row.id, label };
        }),
      );
      setPartiesLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!clientId) {
      setCandidates([]);
      setCandidatesError(null);
      setSelectedKey("");
      return;
    }

    let cancelled = false;
    setCandidatesLoading(true);
    setCandidatesError(null);
    setSelectedKey("");

    const excludePayload = exclude
      ? { id: exclude.id, source: exclude.source }
      : null;

    void listChecklistDocumentImportCandidates({
      clientId,
      kind,
      documentKey,
      exclude: excludePayload,
    }).then((res) => {
      if (cancelled) return;
      setCandidatesLoading(false);
      if (!res.ok) {
        setCandidates([]);
        setCandidatesError(res.error);
        return;
      }
      setCandidates(res.candidates);
      const firstWithDoc = res.candidates.find((c) => c.hasDocument);
      if (firstWithDoc) {
        setSelectedKey(`${firstWithDoc.source}:${firstWithDoc.id}`);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [clientId, kind, documentKey, exclude?.id, exclude?.source]);

  const filteredParties = useMemo(() => {
    const q = partyQuery.trim().toLowerCase();
    const base = !q
      ? parties
      : parties.filter((p) => p.label.toLowerCase().includes(q));
    if (!clientId) return base;
    if (base.some((p) => p.id === clientId)) return base;
    const selected = parties.find((p) => p.id === clientId);
    return selected ? [selected, ...base] : base;
  }, [parties, partyQuery, clientId]);

  function handleImport() {
    if (!selectedKey) {
      setImportError("Select an application or license.");
      return;
    }
    const sep = selectedKey.indexOf(":");
    const source = selectedKey.slice(0, sep) as ChecklistImportSourceTable;
    const id = selectedKey.slice(sep + 1);
    if (!source || !id) {
      setImportError("Select an application or license.");
      return;
    }

    setImportError(null);
    startImport(async () => {
      const res = await loadChecklistDocumentForImport({
        id,
        source,
        documentKey,
      });
      if (!res.ok) {
        setImportError(res.error);
        return;
      }
      const accepted = onImport(res.payload, { label: res.label });
      if (accepted === false) return;
      onClose();
    });
  }

  return (
    <div
      className="fixed inset-0 z-[520] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="checklist-document-import-title"
    >
      <div className="flex max-h-[min(92vh,640px)] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-800 px-4 py-3">
          <div className="min-w-0">
            <h2
              id="checklist-document-import-title"
              className="text-sm font-semibold text-zinc-100"
            >
              {dialogTitle}
            </h2>
            <p className="mt-0.5 text-xs text-zinc-400">
              Copy {documentLabel} from another application or license
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-zinc-300">
              Party name
            </label>
            <input
              type="search"
              value={partyQuery}
              onChange={(e) => setPartyQuery(e.target.value)}
              placeholder="Search party…"
              className="mb-2 w-full rounded-lg border border-zinc-600 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-sky-500"
            />
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              disabled={partiesLoading}
              className="w-full rounded-lg border border-zinc-600 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-sky-500 disabled:opacity-50"
            >
              <option value="">
                {partiesLoading ? "Loading parties…" : "Select party"}
              </option>
              {filteredParties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-semibold text-zinc-300">Filter</p>
            <div className="flex gap-2">
              {(
                [
                  ["application", "Application"],
                  ["license", "License"],
                ] as const
              ).map(([value, label]) => {
                const active = kind === value;
                return (
                  <button
                    key={value}
                    type="button"
                    disabled={!clientId}
                    onClick={() => setKind(value)}
                    className={`flex-1 rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-40 ${
                      active
                        ? "border-sky-500 bg-sky-600 text-white"
                        : "border-zinc-600 bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-zinc-300">
              {kind === "application" ? "Application" : "License"}
            </label>
            {!clientId ? (
              <p className="rounded-lg border border-dashed border-zinc-700 px-3 py-6 text-center text-xs text-zinc-500">
                Select a party to see applications or licenses.
              </p>
            ) : candidatesLoading ? (
              <p className="rounded-lg border border-zinc-700 px-3 py-6 text-center text-xs text-zinc-400">
                Loading…
              </p>
            ) : candidatesError ? (
              <p className="rounded-lg border border-rose-800/60 bg-rose-950/40 px-3 py-3 text-xs text-rose-200">
                {candidatesError}
              </p>
            ) : candidates.length === 0 ? (
              <p className="rounded-lg border border-dashed border-zinc-700 px-3 py-6 text-center text-xs text-zinc-500">
                No {kind === "application" ? "applications" : "licenses"} found for this
                party.
              </p>
            ) : (
              <select
                value={selectedKey}
                onChange={(e) => setSelectedKey(e.target.value)}
                className="w-full rounded-lg border border-zinc-600 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-sky-500"
                size={Math.min(8, Math.max(4, candidates.length))}
              >
                {candidates.map((c) => (
                  <option
                    key={`${c.source}:${c.id}`}
                    value={`${c.source}:${c.id}`}
                    disabled={!c.hasDocument}
                  >
                    {c.hasDocument ? c.label : `${c.label} (no data)`}
                  </option>
                ))}
              </select>
            )}
          </div>

          {importError ? (
            <p className="rounded-lg border border-rose-800/60 bg-rose-950/40 px-3 py-2 text-xs text-rose-200">
              {importError}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-zinc-800 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-100 hover:bg-zinc-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={importing || !selectedKey}
            className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-500 disabled:opacity-50"
          >
            {importing ? "Importing…" : "Import"}
          </button>
        </div>
      </div>
    </div>
  );
}
