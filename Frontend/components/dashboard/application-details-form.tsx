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
  DROPDOWN_KEY_BIS_APPLICATION_MARKING_CLAUSE,
  DROPDOWN_KEY_BIS_APPLICATION_PACKAGING_CLAUSE,
  DROPDOWN_KEY_CLIENT_COMPANY_SCALE,
} from "@backend/shared/dropdown-keys";
import {
  type LegalDocumentRow,
} from "@backend/modules/bis/legal-documents";
import { type AppDropdownOptionRow } from "@backend/shared/types/app-dropdown-option";

const APP_META_FIELD_LABEL =
  "mb-1 block text-sm font-medium leading-tight text-zinc-600 dark:text-zinc-400";

const APP_META_INPUT_SHELL =
  "flex overflow-hidden rounded-lg border border-zinc-300 bg-white shadow-sm focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-950";

function ApplicationMetaDropdown({
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
        listZIndexClass="z-[60]"
        overlayZIndexClass="z-[70]"
        inputRowShellClassName={APP_META_INPUT_SHELL}
        onOptionAdded={onOptionsChanged}
        onOptionDeleted={onOptionsChanged}
        commitOnBlur
      />
    </div>
  );
}

function ApplicationWeeklyOffSelector({
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
  isCodeProductManualNumber,
  onFirmScaleChange,
  projectId,
  legalDocumentRows,
  onLegalDocumentsChange,
}: {
  applicationMeta: ApplicationMeta;
  onUpdateMeta: (patch: Partial<ApplicationMeta>) => void;
  appDropdownOptions: Record<string, AppDropdownOptionRow[]>;
  onReloadDropdowns: () => void;
  isCodeProductManualNumber?: string | null;
  onFirmScaleChange: (value: string) => void;
  projectId: string;
  legalDocumentRows: LegalDocumentRow[];
  onLegalDocumentsChange: (rows: LegalDocumentRow[]) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
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
            <span className="inline-flex shrink-0 items-center border-r border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-semibold text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-300">
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
          label="Marking Clause"
          optionKey={DROPDOWN_KEY_BIS_APPLICATION_MARKING_CLAUSE}
          dialogTitle="Manage Marking Clauses"
          addPlaceholder="Add marking clause…"
          manageAriaLabel="Add or remove marking clauses"
          value={applicationMeta.marking_clause}
          onChange={(v) => onUpdateMeta({ marking_clause: v })}
          options={appDropdownOptions[DROPDOWN_KEY_BIS_APPLICATION_MARKING_CLAUSE] ?? []}
          onOptionsChanged={onReloadDropdowns}
        />

        <ApplicationMetaDropdown
          label="Packaging Clause"
          optionKey={DROPDOWN_KEY_BIS_APPLICATION_PACKAGING_CLAUSE}
          dialogTitle="Manage Packaging Clauses"
          addPlaceholder="Add packaging clause…"
          manageAriaLabel="Add or remove packaging clauses"
          value={applicationMeta.packaging_clause}
          onChange={(v) => onUpdateMeta({ packaging_clause: v })}
          options={appDropdownOptions[DROPDOWN_KEY_BIS_APPLICATION_PACKAGING_CLAUSE] ?? []}
          onOptionsChanged={onReloadDropdowns}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
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
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
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

        <div className="min-w-0">
          <ApplicationWeeklyOffSelector
            value={applicationMeta.weekly_off}
            onChange={(weekly_off) => onUpdateMeta({ weekly_off })}
          />
        </div>

        <ApplicationMetaDropdown
          label="Firm Scale"
          optionKey={DROPDOWN_KEY_CLIENT_COMPANY_SCALE}
          dialogTitle="Company Scales"
          addPlaceholder="New scale name…"
          manageAriaLabel="Add or remove company scales"
          value={applicationMeta.firm_scale}
          onChange={onFirmScaleChange}
          options={appDropdownOptions[DROPDOWN_KEY_CLIENT_COMPANY_SCALE] ?? []}
          onOptionsChanged={onReloadDropdowns}
        />

        <div className="min-w-0">
          <label htmlFor="product_manual_number" className={APP_META_FIELD_LABEL}>
            Product Manual Number
          </label>
          <input
            id="product_manual_number"
            type="text"
            value={applicationMeta.product_manual_number}
            onChange={(e) => onUpdateMeta({ product_manual_number: e.target.value })}
            placeholder={
              isCodeProductManualNumber?.trim()
                ? `IS Code default: ${isCodeProductManualNumber.trim()}`
                : "From IS Code Master…"
            }
            className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none placeholder:text-zinc-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-600"
          />
        </div>
      </div>

      <LegalDocumentsTableEditor
        projectId={projectId}
        rows={legalDocumentRows}
        onChange={onLegalDocumentsChange}
      />
    </div>
  );
}
