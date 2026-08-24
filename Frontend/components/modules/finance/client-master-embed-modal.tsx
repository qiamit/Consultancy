"use client";

import { useEffect, useState } from "react";
import { emptyForm } from "@/components/modules/client-master/constants";
import { ClientMasterForm } from "@/components/modules/client-master/form";
import { FinanceFormModalShell } from "@/components/modules/finance/finance-form-modal-shell";
import { fetchClientFormOptions } from "@backend/actions/form-options";
import type { ClientMasterDropdownOptions } from "@backend/shared/data/client-master-dropdowns";

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
    <FinanceFormModalShell
      ariaLabelledBy="client-master-form-title"
      onClose={onClose}
      zIndexClass="z-[9999]"
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
    </FinanceFormModalShell>
  );
}
