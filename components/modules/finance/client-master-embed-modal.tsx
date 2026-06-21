"use client";

import { useEffect, useState } from "react";
import { emptyForm } from "@/components/modules/client-master/constants";
import { ClientMasterForm } from "@/components/modules/client-master/form";
import { fetchClientFormOptions } from "@/lib/actions/form-options";
import type { ClientMasterDropdownOptions } from "@/lib/data/client-master-dropdowns";

export function ClientMasterEmbedModal({
  onSuccess,
  onClose,
}: {
  onSuccess: (clientId: string) => void;
  onClose: () => void;
}) {
  const [options, setOptions] = useState<ClientMasterDropdownOptions | null>(null);
  const [form, setForm] = useState(() => emptyForm());

  useEffect(() => {
    fetchClientFormOptions().then(setOptions);
  }, []);

  const emptyDropdowns: ClientMasterDropdownOptions = {
    companyTypeOptions: [],
    companyScaleOptions: [],
    companyStatusOptions: [],
    pinCodeOptions: [],
    cityOptions: [],
    stateOptions: [],
    countryOptions: [],
    paymentTermOptions: [],
    phoneCountryCodeOptions: [],
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto bg-zinc-950/50 p-4 pt-10 sm:pt-16 dark:bg-black/55"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="client-master-form-title"
        className="mb-10 w-full max-w-5xl rounded-xl border-[4mm] border-zinc-300 bg-zinc-50 shadow-2xl dark:border-zinc-600 dark:bg-zinc-900 dark:shadow-black/40"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {!options ? (
          <div className="flex items-center justify-center px-8 py-16 text-sm text-zinc-500 dark:text-zinc-400">
            Loading form…
          </div>
        ) : (
          <ClientMasterForm
            visible
            overlay
            form={form}
            isNewParam
            idParam={null}
            onClose={onClose}
            onAddNew={() => setForm(emptyForm())}
            onUpdateField={(key, value) => setForm((f) => ({ ...f, [key]: value }))}
            {...options}
            embeddedInBis
            onEmbeddedSaveSuccess={(id) => {
              onSuccess(id);
            }}
          />
        )}
      </div>
    </div>
  );
}
