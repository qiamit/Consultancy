"use client";

import { useEffect, useState } from "react";
import { useSidebarLayout } from "@/components/dashboard/sidebar-layout-context";
import { IsCodeMasterForm } from "@/components/modules/is-code-master/form";
import { rowToForm } from "@/components/modules/is-code-master/constants";
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
import type { IsCodeFileRow, IsCodeMasterRow } from "@backend/shared/types/is-code-master";

export type IsCodeEditSummary = {
  is_number: string | null;
  revision_year: number | null;
  is_code_title: string | null;
  aspect_of_is: string | null;
};

async function loadDropdownOptions(supabase: ReturnType<typeof createClient>) {
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

export function IsCodeEditModal({
  isCodeId,
  onClose,
  onUpdated,
}: {
  isCodeId: string;
  onClose: () => void;
  onUpdated?: (isCode: IsCodeEditSummary) => void;
}) {
  const { open: sidebarOpen } = useSidebarLayout();
  const [formValues, setFormValues] = useState<Record<string, string> | null>(null);
  const [existingFiles, setExistingFiles] = useState<IsCodeFileRow[]>([]);
  const [aspectOptions, setAspectOptions] = useState<AppDropdownOptionRow[]>([]);
  const [unitOptions, setUnitOptions] = useState<AppDropdownOptionRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const loadKey = isCodeId;
  const [appliedLoadKey, setAppliedLoadKey] = useState<string | null>(null);
  const loading = appliedLoadKey !== loadKey;

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const supabase = createClient();
      const [{ data: row, error: rowError }, { data: fileData }, dropdowns] = await Promise.all([
        supabase.from("is_codes").select("*").eq("id", isCodeId).single(),
        supabase.from("is_code_files").select("*").eq("is_code_id", isCodeId),
        loadDropdownOptions(supabase),
      ]);

      if (cancelled) return;

      if (rowError || !row) {
        setLoadError("IS code not found.");
        setAppliedLoadKey(loadKey);
        return;
      }

      setFormValues(rowToForm(row as IsCodeMasterRow));
      setExistingFiles((fileData ?? []) as IsCodeFileRow[]);
      setAspectOptions(dropdowns.aspectOptions);
      setUnitOptions(dropdowns.unitOptions);
      setAppliedLoadKey(loadKey);
    })();

    return () => {
      cancelled = true;
    };
  }, [isCodeId, loadKey]);

  async function handleSaveSuccess() {
    const supabase = createClient();
    const { data } = await supabase
      .from("is_codes")
      .select("is_number, revision_year, is_code_title, aspect_of_is")
      .eq("id", isCodeId)
      .single();
    if (data) {
      onUpdated?.(data as IsCodeEditSummary);
    }
    onClose();
  }

  return (
    <div
      className={`fixed inset-0 z-[300] flex items-start justify-center overflow-y-auto bg-zinc-950/50 p-4 pt-10 sm:pt-16 dark:bg-black/55 ${
        sidebarOpen ? "lg:left-64" : "lg:left-0"
      }`}
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="is-code-master-form-title"
        className="mb-10 w-full max-w-5xl rounded-none border-[2mm] border-zinc-300 bg-zinc-50 shadow-2xl dark:border-zinc-600 dark:bg-zinc-900 dark:shadow-black/40"
        onClick={(e) => e.stopPropagation()}
      >
        {loading ? (
          <div className="flex items-center justify-center px-6 py-16 text-sm text-zinc-400">Loading IS code…</div>
        ) : loadError || !formValues ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm text-red-500">{loadError ?? "Could not load IS code."}</p>
            <button
              type="button"
              onClick={onClose}
              className="mt-4 rounded-none bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
            >
              Close
            </button>
          </div>
        ) : (
          <IsCodeMasterForm
            visible
            overlay
            formValues={formValues}
            isNewParam={false}
            idParam={isCodeId}
            existingFiles={existingFiles}
            onClose={onClose}
            onAddNew={() => {}}
            onUpdateField={(key, value) =>
              setFormValues((f) => (f ? { ...f, [key]: value } : f))
            }
            aspectOptions={aspectOptions}
            unitOptions={unitOptions}
            embeddedInBis
            onEmbeddedSaveSuccess={handleSaveSuccess}
          />
        )}
      </div>
    </div>
  );
}
