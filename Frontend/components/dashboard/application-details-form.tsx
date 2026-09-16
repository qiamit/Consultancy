"use client";

import { useEffect, useRef, useState } from "react";
import { LegalDocumentsTableEditor } from "@/components/dashboard/legal-documents-table-editor";
import { AppDropdownCombobox } from "@/components/modules/client-master/app-dropdown-combobox";
import {
  APPLICATION_NUMBER_PREFIX,
  APPLICATION_WEEKDAYS,
  type ApplicationMeta,
} from "@backend/modules/bis/application-checklist-notes";
import {
  DROPDOWN_KEY_BIS_APPLICATION_BRANCH,
  DROPDOWN_KEY_BIS_APPLICATION_BRANCH_HEAD_DESIGNATION,
  DROPDOWN_KEY_BIS_APPLICATION_BRANCH_HEAD_NAME,
  DROPDOWN_KEY_BIS_APPLICATION_DEALING_OFFICER_DESIGNATION,
  DROPDOWN_KEY_BIS_APPLICATION_DEALING_OFFICER_NAME,
  DROPDOWN_KEY_BIS_APPLICATION_INSPECTION_OFFICER_DESIGNATION,
  DROPDOWN_KEY_BIS_APPLICATION_INSPECTION_OFFICER_NAME,
  DROPDOWN_KEY_BIS_APPLICATION_NATURE_OF_INSPECTION,
} from "@backend/shared/dropdown-keys";
import {
  type LegalDocumentRow,
} from "@backend/modules/bis/legal-documents";
import { type AppDropdownOptionRow } from "@backend/shared/types/app-dropdown-option";

const APP_META_FIELD_LABEL =
  "mb-1 block text-sm font-medium leading-tight text-zinc-600 dark:text-zinc-400";

const APP_META_INPUT_SHELL =
  "flex overflow-hidden rounded-lg border border-zinc-300 bg-white shadow-sm focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-950";

export function ApplicationMetaDropdown({
  label,
  optionKey,
  dialogTitle,
  addPlaceholder,
  manageAriaLabel,
  value,
  onChange,
  options,
  onOptionsChanged,
}: {
  label: string;
  optionKey: string;
  dialogTitle: string;
  addPlaceholder: string;
  manageAriaLabel: string;
  value: string;
  onChange: (value: string) => void;
  options: AppDropdownOptionRow[];
  onOptionsChanged: () => void;
}) {
  return (
    <div className="min-w-0">
      <label className={APP_META_FIELD_LABEL}>{label}</label>
      <AppDropdownCombobox
        optionKey={optionKey}
        name={optionKey}
        label={label}
        dialogTitle={dialogTitle}
        addPlaceholder={addPlaceholder}
        manageAriaLabel={manageAriaLabel}
        value={value}
        onChange={onChange}
        options={options}
        selectedValue={value}
        onClearSelection={() => onChange("")}
        hideLabel
        listZIndexClass="z-[510]"
        overlayZIndexClass="z-[520]"
        inputRowShellClassName={APP_META_INPUT_SHELL}
        onOptionAdded={onOptionsChanged}
        onOptionDeleted={onOptionsChanged}
        commitOnBlur
      />
    </div>
  );
}

export function ApplicationWeeklyOffSelector({
  value,
  onChange,
}: {
  value: string[];
  onChange: (days: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = new Set(value);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  function toggle(day: string) {
    const next = new Set(selected);
    if (next.has(day)) next.delete(day);
    else next.add(day);
    onChange(APPLICATION_WEEKDAYS.filter((d) => next.has(d)));
  }

  const summary =
    value.length === 0
      ? "Select days…"
      : APPLICATION_WEEKDAYS.filter((d) => selected.has(d)).join(", ");

  return (
    <div className="relative min-w-0" ref={rootRef}>
      <label htmlFor="weekly_off_dropdown" className={APP_META_FIELD_LABEL}>
        Weekly Off
      </label>
      <button
        id="weekly_off_dropdown"
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={`${APP_META_INPUT_SHELL} flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm outline-none focus-visible:border-sky-500 focus-visible:ring-2 focus-visible:ring-sky-500/30 ${
          value.length === 0
            ? "text-zinc-400 dark:text-zinc-500"
            : "text-zinc-900 dark:text-zinc-100"
        }`}
      >
        <span className="min-w-0 truncate">{summary}</span>
        <svg
          className={`h-4 w-4 shrink-0 text-zinc-500 transition ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open ? (
        <ul
          role="listbox"
          aria-multiselectable="true"
          aria-label="Weekly off days"
          className="absolute left-0 right-0 top-full z-[60] mt-1 max-h-56 overflow-y-auto rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-600 dark:bg-zinc-900"
          onMouseDown={(e) => e.preventDefault()}
        >
          {APPLICATION_WEEKDAYS.map((day) => (
            <li key={day} role="option" aria-selected={selected.has(day)}>
              <label className="flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm text-zinc-800 hover:bg-zinc-50 dark:text-zinc-100 dark:hover:bg-zinc-800">
                <input
                  type="checkbox"
                  checked={selected.has(day)}
                  onChange={() => toggle(day)}
                  className="h-4 w-4 rounded border-zinc-300 text-sky-600 focus:ring-sky-500 dark:border-zinc-600 dark:bg-zinc-950"
                />
                {day}
              </label>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function ApplicationDetailsForm({
  applicationMeta,
  onUpdateMeta,
  appDropdownOptions,
  onReloadDropdowns,
  projectId,
  legalDocumentRows,
  onLegalDocumentsChange,
  onSave,
  onImportData,
  onOpenApplicationForm,
  saving = false,
  savedFlash = false,
}: {
  applicationMeta: ApplicationMeta;
  onUpdateMeta: (patch: Partial<ApplicationMeta>) => void;
  appDropdownOptions: Record<string, AppDropdownOptionRow[]>;
  onReloadDropdowns: () => void;
  projectId: string;
  legalDocumentRows: LegalDocumentRow[];
  onLegalDocumentsChange: (rows: LegalDocumentRow[]) => void;
  onSave?: () => void;
  onImportData?: () => void;
  onOpenApplicationForm?: () => void;
  saving?: boolean;
  savedFlash?: boolean;
}) {
  return (
    <div className="@container w-full min-w-0 space-y-5">
      <div className="grid grid-cols-1 gap-3 @[420px]:grid-cols-2 @[720px]:grid-cols-3 @[980px]:grid-cols-4 @[420px]:gap-4">
        <div className="min-w-0">
          <label htmlFor="application_procedure" className={APP_META_FIELD_LABEL}>
            Application Procedure
          </label>
          <select
            id="application_procedure"
            value={applicationMeta.application_procedure}
            onChange={(e) =>
              onUpdateMeta({
                application_procedure: e.target.value as ApplicationMeta["application_procedure"],
              })
            }
            className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          >
            <option value="Simplified">Simplified</option>
            <option value="Normal">Normal</option>
          </select>
        </div>

        <div className="min-w-0">
          <label htmlFor="application_number" className={APP_META_FIELD_LABEL}>
            Application Number
          </label>
          <div className={APP_META_INPUT_SHELL}>
            <span className="inline-flex shrink-0 items-center border-r border-zinc-200 bg-zinc-50 px-2.5 py-2 text-xs font-semibold text-zinc-600 sm:px-3 sm:text-sm dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-300">
              {APPLICATION_NUMBER_PREFIX}
            </span>
            <input
              id="application_number"
              type="text"
              value={applicationMeta.application_number}
              onChange={(e) => onUpdateMeta({ application_number: e.target.value })}
              placeholder="Enter number…"
              className="min-w-0 flex-1 border-0 bg-transparent px-3 py-2 text-sm text-zinc-900 outline-none dark:text-zinc-100"
            />
          </div>
        </div>

        <div className="min-w-0">
          <label htmlFor="date_of_application" className={APP_META_FIELD_LABEL}>
            Date of Application
          </label>
          <input
            id="date_of_application"
            type="date"
            value={applicationMeta.date_of_application}
            onChange={(e) => onUpdateMeta({ date_of_application: e.target.value })}
            className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </div>

        <ApplicationMetaDropdown
          label="BIS Branch Name"
          optionKey={DROPDOWN_KEY_BIS_APPLICATION_BRANCH}
          dialogTitle="Manage BIS Branch Names"
          addPlaceholder="Add branch name…"
          manageAriaLabel="Add or remove BIS branch names"
          value={applicationMeta.bis_branch_name}
          onChange={(v) => onUpdateMeta({ bis_branch_name: v })}
          options={appDropdownOptions[DROPDOWN_KEY_BIS_APPLICATION_BRANCH] ?? []}
          onOptionsChanged={onReloadDropdowns}
        />

        <ApplicationMetaDropdown
          label="Name of Branch Head"
          optionKey={DROPDOWN_KEY_BIS_APPLICATION_BRANCH_HEAD_NAME}
          dialogTitle="Manage Branch Head Names"
          addPlaceholder="Add branch head name…"
          manageAriaLabel="Add or remove branch head names"
          value={applicationMeta.branch_head_name}
          onChange={(v) => onUpdateMeta({ branch_head_name: v })}
          options={appDropdownOptions[DROPDOWN_KEY_BIS_APPLICATION_BRANCH_HEAD_NAME] ?? []}
          onOptionsChanged={onReloadDropdowns}
        />

        <ApplicationMetaDropdown
          label="Designation of Branch Head"
          optionKey={DROPDOWN_KEY_BIS_APPLICATION_BRANCH_HEAD_DESIGNATION}
          dialogTitle="Manage Branch Head Designations"
          addPlaceholder="Add designation…"
          manageAriaLabel="Add or remove branch head designations"
          value={applicationMeta.branch_head_designation}
          onChange={(v) => onUpdateMeta({ branch_head_designation: v })}
          options={appDropdownOptions[DROPDOWN_KEY_BIS_APPLICATION_BRANCH_HEAD_DESIGNATION] ?? []}
          onOptionsChanged={onReloadDropdowns}
        />

        <ApplicationMetaDropdown
          label="Name of Dealing Officer"
          optionKey={DROPDOWN_KEY_BIS_APPLICATION_DEALING_OFFICER_NAME}
          dialogTitle="Manage Dealing Officer Names"
          addPlaceholder="Add officer name…"
          manageAriaLabel="Add or remove dealing officer names"
          value={applicationMeta.dealing_officer_name}
          onChange={(v) => onUpdateMeta({ dealing_officer_name: v })}
          options={appDropdownOptions[DROPDOWN_KEY_BIS_APPLICATION_DEALING_OFFICER_NAME] ?? []}
          onOptionsChanged={onReloadDropdowns}
        />

        <ApplicationMetaDropdown
          label="Designation of Dealing Officer"
          optionKey={DROPDOWN_KEY_BIS_APPLICATION_DEALING_OFFICER_DESIGNATION}
          dialogTitle="Manage Dealing Officer Designations"
          addPlaceholder="Add designation…"
          manageAriaLabel="Add or remove dealing officer designations"
          value={applicationMeta.dealing_officer_designation}
          onChange={(v) => onUpdateMeta({ dealing_officer_designation: v })}
          options={appDropdownOptions[DROPDOWN_KEY_BIS_APPLICATION_DEALING_OFFICER_DESIGNATION] ?? []}
          onOptionsChanged={onReloadDropdowns}
        />

        <ApplicationMetaDropdown
          label="Name of Inspection Officer"
          optionKey={DROPDOWN_KEY_BIS_APPLICATION_INSPECTION_OFFICER_NAME}
          dialogTitle="Manage Inspection Officer Names"
          addPlaceholder="Add officer name…"
          manageAriaLabel="Add or remove inspection officer names"
          value={applicationMeta.inspection_officer_name}
          onChange={(v) => onUpdateMeta({ inspection_officer_name: v })}
          options={appDropdownOptions[DROPDOWN_KEY_BIS_APPLICATION_INSPECTION_OFFICER_NAME] ?? []}
          onOptionsChanged={onReloadDropdowns}
        />

        <ApplicationMetaDropdown
          label="Designation of Inspection Officer"
          optionKey={DROPDOWN_KEY_BIS_APPLICATION_INSPECTION_OFFICER_DESIGNATION}
          dialogTitle="Manage Inspection Officer Designations"
          addPlaceholder="Add designation…"
          manageAriaLabel="Add or remove inspection officer designations"
          value={applicationMeta.inspection_officer_designation}
          onChange={(v) => onUpdateMeta({ inspection_officer_designation: v })}
          options={
            appDropdownOptions[DROPDOWN_KEY_BIS_APPLICATION_INSPECTION_OFFICER_DESIGNATION] ?? []
          }
          onOptionsChanged={onReloadDropdowns}
        />

        <ApplicationMetaDropdown
          label="Nature of Inspection"
          optionKey={DROPDOWN_KEY_BIS_APPLICATION_NATURE_OF_INSPECTION}
          dialogTitle="Manage Nature of Inspection"
          addPlaceholder="Add nature of inspection…"
          manageAriaLabel="Add or remove nature of inspection options"
          value={applicationMeta.nature_of_inspection}
          onChange={(v) => onUpdateMeta({ nature_of_inspection: v })}
          options={appDropdownOptions[DROPDOWN_KEY_BIS_APPLICATION_NATURE_OF_INSPECTION] ?? []}
          onOptionsChanged={onReloadDropdowns}
        />

        <div className="min-w-0">
          <label htmlFor="date_of_inspection" className={APP_META_FIELD_LABEL}>
            Date of Inspection
          </label>
          <input
            id="date_of_inspection"
            type="date"
            value={applicationMeta.date_of_inspection}
            onChange={(e) => onUpdateMeta({ date_of_inspection: e.target.value })}
            className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </div>
      </div>

      <LegalDocumentsTableEditor
        projectId={projectId}
        rows={legalDocumentRows}
        onChange={onLegalDocumentsChange}
      />

      {onSave ? (
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-700">
          <p className="mr-auto text-xs text-zinc-500 dark:text-zinc-400">
            Changes also auto-save while you type.
          </p>
          {savedFlash ? (
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              Saved ✓
            </span>
          ) : null}
          {onOpenApplicationForm ? (
            <button
              type="button"
              onClick={onOpenApplicationForm}
              title="Open BIS Form 1 (auto-filled from application data)"
              className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border border-teal-600/50 bg-gradient-to-br from-teal-600 to-indigo-700 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:from-teal-500 hover:to-indigo-600"
            >
              <span
                className="inline-flex h-5 w-5 items-center justify-center rounded bg-white/15"
                aria-hidden
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12h6m-6 4h6M7 4h7l5 5v11a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2z"
                  />
                </svg>
              </span>
              Application Form
            </button>
          ) : null}
          {onImportData ? (
            <button
              type="button"
              onClick={onImportData}
              title="Import Application Details from Another Application or License"
              className="shrink-0 whitespace-nowrap rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
            >
              Import Data
            </button>
          ) : null}
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="shrink-0 whitespace-nowrap rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
