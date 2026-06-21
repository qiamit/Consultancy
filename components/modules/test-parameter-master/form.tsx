"use client";

import { saveTestParameter } from "@/lib/actions/test-parameters";
import { DialogCloseXButton } from "@/components/modules/client-master/dialog-close-x";
import {
  IsCodeCombobox,
  type IsCodeComboboxOption,
} from "@/components/modules/bis-projects/is-code-combobox";
import { TP_FIELD_LABEL_CLASS } from "./constants";

const fieldInputRowShellClass =
  "flex overflow-hidden rounded-lg border border-zinc-300 bg-white shadow-sm focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-950";

const fieldInputInnerClass =
  "min-w-0 flex-1 border-0 bg-transparent py-2 pl-3 pr-2 text-sm text-zinc-900 outline-none ring-0 focus:ring-0 dark:bg-transparent dark:text-zinc-100";

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
  onClose,
  onAddNew,
  onUpdateField,
}: {
  visible: boolean;
  overlay?: boolean;
  formValues: Record<string, string>;
  isNewParam: boolean;
  idParam: string | null;
  isCodeOptions: IsCodeComboboxOption[];
  onClose: () => void;
  onAddNew: () => void;
  onUpdateField: (key: string, value: string) => void;
}) {
  if (!visible) return null;

  const rootClass = overlay
    ? "px-4 py-5"
    : "border-t border-zinc-200 bg-zinc-50/50 px-4 py-5 dark:border-zinc-800 dark:bg-zinc-900/50";

  return (
    <div className={rootClass}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2
          id="test-parameter-master-form-title"
          className="inline-flex items-center rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-sky-500"
        >
          {isNewParam
            ? "New Test Parameter"
            : idParam
              ? "Edit Test Parameter"
              : "Test Parameter"}
        </h2>
        <DialogCloseXButton onClick={onClose} />
      </div>

      <form
        id="test-parameter-master-save-form"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        action={saveTestParameter}
      >
        <input type="hidden" name="id" value={formValues.id} />

        <div className="sm:col-span-2 lg:col-span-3">
          <IsCodeCombobox
            name="is_code_id"
            label="IS Code"
            value={formValues.is_code_id}
            onChange={(id) => onUpdateField("is_code_id", id)}
            options={isCodeOptions}
            listZIndexClass="z-[118]"
          />
        </div>

        <Field
          label="Name of the Test"
          name="test_name"
          required
          value={formValues.test_name}
          onChange={(v) => onUpdateField("test_name", v)}
        />

        <Field
          label="Clause No"
          name="clause_no"
          value={formValues.clause_no}
          onChange={(v) => onUpdateField("clause_no", v)}
        />

        <Field
          label="Test Method"
          name="test_method"
          value={formValues.test_method}
          onChange={(v) => onUpdateField("test_method", v)}
        />

        <Field
          label="Unit"
          name="unit"
          value={formValues.unit}
          onChange={(v) => onUpdateField("unit", v)}
        />

        <Field
          label="Specified Value"
          name="specified_value"
          value={formValues.specified_value}
          onChange={(v) => onUpdateField("specified_value", v)}
        />

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
