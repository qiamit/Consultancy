"use client";

import { useEffect, useState } from "react";
import {
  ASPECTS,
  DEFAULT_ASPECT_OF_IS,
  DEFAULT_UNIT,
  UNITS,
} from "@backend/shared/constants/is-code-master";
import {
  DROPDOWN_KEY_IS_CODE_ASPECT,
  DROPDOWN_KEY_IS_CODE_UNIT,
} from "@backend/shared/dropdown-keys";
import { createClient } from "@backend/db/client/client";
import type { AppDropdownOptionRow } from "@backend/shared/types/app-dropdown-option";
import { emptyForm } from "@/components/modules/is-code-master/constants";
import { IsCodeMasterForm } from "@/components/modules/is-code-master/form";
import { FinanceFormModalShell } from "@/components/modules/finance/finance-form-modal-shell";

async function loadIsCodeDropdownOptions() {
  const supabase = createClient();
  const [{ data: aspectData }, { data: unitData }] = await Promise.all([
    supabase
      .from("app_dropdown_options")
      .select("*")
      .eq("option_key", DROPDOWN_KEY_IS_CODE_ASPECT)
      .order("value", { ascending: true }),
    supabase
      .from("app_dropdown_options")
      .select("*")
      .eq("option_key", DROPDOWN_KEY_IS_CODE_UNIT)
      .order("value", { ascending: true }),
  ]);

  let aspectOptions = (aspectData ?? []) as AppDropdownOptionRow[];
  if (aspectOptions.length === 0) {
    aspectOptions = ASPECTS.map((value, i) => ({
      id: `__static_aspect__${i}`,
      value,
      label: null,
      canDelete: false,
    }));
  }
  if (!aspectOptions.some((o) => o.value === DEFAULT_ASPECT_OF_IS)) {
    aspectOptions = [
      {
        id: "__static_aspect_default__",
        value: DEFAULT_ASPECT_OF_IS,
        label: null,
        canDelete: false,
      },
      ...aspectOptions,
    ];
  }

  let unitOptions = (unitData ?? []) as AppDropdownOptionRow[];
  if (unitOptions.length === 0) {
    unitOptions = UNITS.map((value, i) => ({
      id: `__static_unit__${i}`,
      value,
      label: null,
      canDelete: false,
    }));
  }
  if (!unitOptions.some((o) => o.value === DEFAULT_UNIT)) {
    unitOptions = [
      {
        id: "__static_unit_default__",
        value: DEFAULT_UNIT,
        label: null,
        canDelete: false,
      },
      ...unitOptions,
    ];
  }

  return { aspectOptions, unitOptions };
}

export function IsCodeMasterEmbedModal({
  onSuccess,
  onClose,
}: {
  onSuccess: (isCodeId: string) => void;
  onClose: () => void;
}) {
  const [options, setOptions] = useState<{
    aspectOptions: AppDropdownOptionRow[];
    unitOptions: AppDropdownOptionRow[];
  } | null>(null);
  const [form, setForm] = useState(() => emptyForm());

  useEffect(() => {
    loadIsCodeDropdownOptions().then(setOptions);
  }, []);

  return (
    <FinanceFormModalShell
      ariaLabelledBy="is-code-master-form-title"
      onClose={onClose}
      zIndexClass="z-[9999]"
    >
      {!options ? (
        <div className="flex items-center justify-center px-8 py-16 text-sm text-zinc-500 dark:text-zinc-400">
          Loading form…
        </div>
      ) : (
        <IsCodeMasterForm
          visible
          overlay
          formValues={form}
          isNewParam
          idParam={null}
          existingFiles={[]}
          onClose={onClose}
          onAddNew={() => setForm(emptyForm())}
          onUpdateField={(key, value) =>
            setForm((f) => ({ ...f, [key]: value }))
          }
          aspectOptions={options.aspectOptions}
          unitOptions={options.unitOptions}
          embeddedInBis
          onEmbeddedSaveSuccess={(id) => {
            onSuccess(id);
          }}
        />
      )}
    </FinanceFormModalShell>
  );
}
