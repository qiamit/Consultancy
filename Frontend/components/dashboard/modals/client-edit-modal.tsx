"use client";

import { useEffect, useState } from "react";
import { rowToForm } from "@/components/modules/client-master/constants";
import { ClientMasterForm } from "@/components/modules/client-master/form";
import { fetchClientDetail, type ClientDetail } from "@backend/actions/renewals";
import { fetchClientFormOptions } from "@backend/actions/form-options";
import { createClient } from "@backend/db/supabase/client";
import type { ClientMasterDropdownOptions } from "@backend/shared/data/client-master-dropdowns";
import type { ClientMasterRow } from "@backend/shared/types/client-master";

export function ClientEditModal({
  clientId,
  onClose,
  onUpdated,
}: {
  clientId: string;
  onClose: () => void;
  onUpdated?: (client: ClientDetail) => void;
}) {
  const [form, setForm] = useState<Record<string, string> | null>(null);
  const [dropdowns, setDropdowns] = useState<ClientMasterDropdownOptions | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const loadKey = clientId;
  const [appliedLoadKey, setAppliedLoadKey] = useState<string | null>(null);
  const loading = appliedLoadKey !== loadKey;

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const supabase = createClient();
      const [{ data: row, error: rowError }, options] = await Promise.all([
        supabase.from("clients").select("*").eq("id", clientId).single(),
        fetchClientFormOptions(),
      ]);

      if (cancelled) return;

      if (rowError || !row) {
        setLoadError("Client not found.");
        setAppliedLoadKey(loadKey);
        return;
      }

      setForm(rowToForm(row as ClientMasterRow));
      setDropdowns(options);
      setAppliedLoadKey(loadKey);
    })();

    return () => {
      cancelled = true;
    };
  }, [clientId, loadKey]);

  async function handleSaveSuccess() {
    const updated = await fetchClientDetail(clientId);
    if (updated) {
      onUpdated?.(updated);
    }
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[300] flex items-start justify-center overflow-y-auto bg-zinc-950/50 p-4 pt-10 sm:pt-16 dark:bg-black/55"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="client-master-form-title"
        className="mb-10 w-full max-w-5xl rounded-xl border-[4mm] border-zinc-300 bg-zinc-50 shadow-2xl dark:border-zinc-600 dark:bg-zinc-900 dark:shadow-black/40"
        onClick={(e) => e.stopPropagation()}
      >
        {loading ? (
          <div className="flex items-center justify-center px-6 py-16 text-sm text-zinc-400">Loading client…</div>
        ) : loadError || !form || !dropdowns ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm text-red-500">{loadError ?? "Could not load client."}</p>
            <button
              type="button"
              onClick={onClose}
              className="mt-4 rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-500"
            >
              Close
            </button>
          </div>
        ) : (
          <ClientMasterForm
            visible
            overlay
            form={form}
            isNewParam={false}
            idParam={clientId}
            onClose={onClose}
            onAddNew={() => {}}
            onUpdateField={(key, value) =>
              setForm((f) => (f ? { ...f, [key]: value } : f))
            }
            {...dropdowns}
            embeddedInBis
            onEmbeddedSaveSuccess={handleSaveSuccess}
          />
        )}
      </div>
    </div>
  );
}
