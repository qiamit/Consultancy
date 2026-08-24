"use client";

import { useMemo } from "react";
import { saveTestParameter } from "@backend/actions/test-parameters";
import { DialogCloseXButton } from "@/components/modules/client-master/dialog-close-x";
import { ClientDropdownField } from "@/components/modules/client-master/client-dropdown-field";
import {
  IsCodeCombobox,
  type IsCodeComboboxOption,
} from "@/components/modules/bis-projects/is-code-combobox";
import { DROPDOWN_KEY_IS_CODE_UNIT } from "@backend/shared/dropdown-keys";
import type { AppDropdownOptionRow } from "@backend/shared/types/app-dropdown-option";
import { TP_FIELD_LABEL_CLASS } from "./constants";
import { SpecifiedValueField } from "./specified-value-field";

const fieldInputRowShellClass =
  "flex overflow-hidden rounded-lg border border-zinc-300 bg-white shadow-sm focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-950";

const fieldInputInnerClass =
  "min-w-0 flex-1 border-0 bg-transparent py-2 pl-3 pr-2 text-sm text-zinc-900 outline-none ring-0 focus:ring-0 dark:bg-transparent dark:text-zinc-100";

function isCodeIdFromStoredLabel(
  stored: string,
  options: IsCodeComboboxOption[],
): string {
  const trimmed = stored.trim();
  if (!trimmed) return "";
  const exact = options.find((o) => o.label === stored);
  if (exact) return exact.id;
  const byNumber = options.find((o) => {
    const num = o.label.split(":")[0]?.trim();
    return num === trimmed || o.label.startsWith(trimmed);
  });
  return byNumber?.id ?? "";
}

function TestMethodIsCodeField({
  value,
  options,
  onChange,
  onRequestQuickAddIsCode,
}: {
  value: string;
  options: IsCodeComboboxOption[];
  onChange: (label: string) => void;
  onRequestQuickAddIsCode?: () => void;
}) {
  const selectedId = useMemo(
    () => isCodeIdFromStoredLabel(value, options),
    [value, options],
  );

  return (
    <>
      <input type="hidden" name="test_method" value={value} />
      <IsCodeCombobox
        name="test_method_picker"
        label="Test Method"
        value={selectedId}
        onChange={(id) => {
          const label = options.find((o) => o.id === id)?.label ?? "";
          onChange(label);
        }}
        options={options}
        listZIndexClass="z-[118]"
        onAddClick={onRequestQuickAddIsCode}
        addButtonAriaLabel="Add new IS code"
      />
    </>
  );
}

function Field({
  label,
  name,
  required,
  value,
  onChange,
}: {
  label: string;
  name: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={name} className={TP_FIELD_LABEL_CLASS}>
        {label}
        {required ? (
          <span className="text-red-600 dark:text-red-400" aria-hidden>
            {" "}
            *
          </span>
        ) : null}
      </label>
      <div className={fieldInputRowShellClass}>
        <input
          id={name}
          name={name}
          type="text"
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={fieldInputInnerClass}
        />
      </div>
    </div>
  );
}

export function TestParameterMasterForm({
  visible,
  overlay,
  formValues,
  isNewParam,
  idParam,
  isCodeOptions,
  unitOptions,
  onClose,
  onAddNew,
  onUpdateField,
  onRequestQuickAddIsCode,
}: {
  visible: boolean;
  overlay?: boolean;
  formValues: Record<string, string>;
  isNewParam: boolean;
  idParam: string | null;
  isCodeOptions: IsCodeComboboxOption[];
  unitOptions: AppDropdownOptionRow[];
  onClose: () => void;
  onAddNew: () => void;
  onUpdateField: (key: string, value: string) => void;
  onRequestQuickAddIsCode?: () => void;
}) {
  if (!visible) return null;

  const rootClass = overlay
    ? "px-4 pb-5 pt-0"
    : "border-t border-zinc-200 bg-zinc-50/50 px-4 py-5 dark:border-zinc-800 dark:bg-zinc-900/50";

  return (
    <div className={rootClass}>
      <div className="-mx-4 mb-4 flex items-center justify-between gap-3 border-b border-zinc-700 bg-zinc-800 px-4 py-3 dark:border-zinc-600 dark:bg-zinc-800">
        <h2
          id="test-parameter-master-form-title"
          className="text-sm font-semibold text-zinc-50"
        >
          {isNewParam
            ? "New Test Parameter"
            : idParam
              ? "Edit Test Parameter"
              : "Test Parameter"}
        </h2>
        <DialogCloseXButton
          onClick={onClose}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-none bg-transparent text-zinc-100 hover:bg-zinc-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400"
        />
      </div>

      <form
        id="test-parameter-master-save-form"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        action={saveTestParameter}
      >
        <input type="hidden" name="id" value={formValues.id} />

        <div className="grid grid-cols-1 gap-4 sm:col-span-2 sm:grid-cols-2 lg:col-span-3 lg:grid-cols-4">
          <div className="min-w-0">
            <IsCodeCombobox
              name="is_code_id"
              label="IS Code"
              value={formValues.is_code_id}
              onChange={(id) => onUpdateField("is_code_id", id)}
              options={isCodeOptions}
              listZIndexClass="z-[118]"
              onAddClick={onRequestQuickAddIsCode}
              addButtonAriaLabel="Add new IS code"
            />
          </div>

          <div className="min-w-0">
            <TestMethodIsCodeField
              value={formValues.test_method}
              options={isCodeOptions}
              onChange={(v) => onUpdateField("test_method", v)}
              onRequestQuickAddIsCode={onRequestQuickAddIsCode}
            />
          </div>

          <div className="min-w-0">
            <Field
              label="Clause No"
              name="clause_no"
              value={formValues.clause_no}
              onChange={(v) => onUpdateField("clause_no", v)}
            />
          </div>

          <div className="min-w-0">
            <ClientDropdownField
              optionKey={DROPDOWN_KEY_IS_CODE_UNIT}
              name="unit"
              label="Unit"
              dialogTitle="Units"
              addPlaceholder="New unit"
              manageAriaLabel="Add or remove units"
              value={formValues.unit}
              onChange={(v) => onUpdateField("unit", v)}
              options={unitOptions}
              selectedValue={formValues.unit}
              onClearSelection={() => onUpdateField("unit", "")}
              overlayZIndexClass="z-[127]"
              listZIndexClass="z-[118]"
              blankInputWhenNoSelection
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:col-span-2 sm:grid-cols-2 lg:col-span-3">
          <Field
            label="Name of the Test"
            name="test_name"
            required
            value={formValues.test_name}
            onChange={(v) => onUpdateField("test_name", v)}
          />

          <SpecifiedValueField
            name="specified_value"
            value={formValues.specified_value}
            onChange={(v) => onUpdateField("specified_value", v)}
          />
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 sm:col-span-2 lg:col-span-3">
          <button
            type="submit"
            className="rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-sky-500"
          >
            {idParam && !isNewParam
              ? "Update Test Parameter"
              : "Save Test Parameter"}
          </button>
          {idParam && !isNewParam ? (
            <button
              type="button"
              onClick={onAddNew}
              className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 shadow-sm hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
            >
              Clear / New
            </button>
          ) : null}
        </div>
      </form>
    </div>
  );
}
