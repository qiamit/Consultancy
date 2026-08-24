"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@backend/db/supabase/client";
import { AppointmentLetterCreatorModal } from "@/components/dashboard/modals/appointment-letter-creator-modal";
import { StorageDocumentLink } from "@/components/dashboard/storage-document-link";
import { AppDropdownCombobox } from "@/components/modules/client-master/app-dropdown-combobox";
import {
  DROPDOWN_KEY_TECHNICAL_STAFF_DESIGNATION,
  DROPDOWN_KEY_TECHNICAL_STAFF_EXPERIENCE,
  DROPDOWN_KEY_TECHNICAL_STAFF_QUALIFICATION,
  TECHNICAL_STAFF_DROPDOWN_KEYS,
} from "@backend/shared/dropdown-keys";
import type { ManufacturingScopeDeclarationData } from "@backend/modules/print/manufacturing-scope-declaration";
import type { AppDropdownOptionRow } from "@backend/shared/types/app-dropdown-option";
import {
  createTechnicalStaffRow,
  defaultTechnicalStaffEntry,
  type TechnicalStaffRow,
} from "@backend/modules/bis/technical-staff";
import type { TopManagementStored } from "@backend/modules/bis/top-management";
import {
  technicalStaffDocumentPath,
  uploadTechnicalStaffDocument,
} from "@backend/modules/storage/technical-staff-documents";
import { removeSignatureImageBackground } from "@backend/shared/signature-image-background";

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

function FileUploadField({
  label,
  value,
  onChange,
  projectId,
  rowId,
  field,
  accept,
  removeBackgroundOnUpload = false,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  projectId: string;
  rowId: string;
  field: string;
  accept?: string;
  removeBackgroundOnUpload?: boolean;
}) {
  const [busyLabel, setBusyLabel] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusyLabel(removeBackgroundOnUpload && file.type.startsWith("image/") ? "Processing…" : "Uploading…");
    try {
      const supabase = createClient();
      let uploadFile: File | Blob = file;
      let uploadName = file.name;
      let contentType = file.type || undefined;

      if (removeBackgroundOnUpload && file.type.startsWith("image/")) {
        const dataUrl = await readFileAsDataUrl(file);
        const processed = await removeSignatureImageBackground(dataUrl);
        uploadFile = await (await fetch(processed)).blob();
        const baseName = file.name.replace(/\.[^.]+$/, "") || field;
        uploadName = `${baseName}.png`;
        contentType = "image/png";
        setBusyLabel("Uploading…");
      }

      const path = technicalStaffDocumentPath(projectId, rowId, field, uploadName);
      const result = await uploadTechnicalStaffDocument(supabase, path, uploadFile, contentType);
      if ("error" in result) {
        window.alert("Upload failed: " + result.error);
        return;
      }
      onChange(result.ref);
    } catch {
      window.alert("Unable to process the image file.");
    } finally {
      setBusyLabel(null);
      e.target.value = "";
    }
  }

  return (
    <div className="min-w-0 flex-1">
      <label className="block text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
        {label}
      </label>
      <div className="mt-1.5 flex flex-col items-stretch gap-1.5 sm:flex-row sm:flex-wrap sm:items-center">
        <label className="inline-flex cursor-pointer items-center justify-center gap-1 rounded-lg border border-zinc-600 bg-zinc-800 px-2 py-1.5 text-[11px] font-medium text-zinc-200 hover:bg-zinc-700">
          {busyLabel ?? (value ? "Replace" : "Upload")}
          <input
            type="file"
            className="hidden"
            accept={accept}
            onChange={(e) => void handleFile(e)}
            disabled={busyLabel !== null}
          />
        </label>
        {value ? (
          <StorageDocumentLink
            value={value}
            className="inline-flex items-center justify-center gap-1 rounded-lg border border-sky-800 bg-sky-950/30 px-2 py-1.5 text-[11px] font-medium text-sky-300 hover:bg-sky-950/50"
          />
        ) : null}
      </div>
    </div>
  );
}

function AppointmentLetterField({
  value,
  onChange,
  projectId,
  rowId,
  letterData,
  topManagement,
  person,
}: {
  value: string;
  onChange: (url: string) => void;
  projectId: string;
  rowId: string;
  letterData: Omit<
    ManufacturingScopeDeclarationData,
    "licenseScope" | "licenseScopeFormat" | "licenseScopeRows"
  >;
  topManagement: TopManagementStored[];
  person: {
    person_name: string;
    designation: string;
    educational_qualification: string;
    experience_years: string;
  };
}) {
  const [uploading, setUploading] = useState(false);
  const [showCreator, setShowCreator] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const supabase = createClient();
      const path = technicalStaffDocumentPath(
        projectId,
        rowId,
        "appointment-letter",
        file.name,
      );
      const result = await uploadTechnicalStaffDocument(supabase, path, file);
      if ("error" in result) {
        window.alert("Upload failed: " + result.error);
        return;
      }
      onChange(result.ref);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <>
      <div className="min-w-0 flex-1">
        <label className="block text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
          Appointment Letter
        </label>
        <div className="mt-1.5 flex flex-col items-stretch gap-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <label className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-zinc-600 bg-zinc-800 px-2 py-1.5 text-[11px] font-medium text-zinc-200 hover:bg-zinc-700">
              {uploading ? "Uploading…" : "Upload"}
              <input
                type="file"
                className="hidden"
                onChange={(e) => void handleFile(e)}
                disabled={uploading}
              />
            </label>
            <button
              type="button"
              onClick={() => {
                (document.activeElement as HTMLElement | null)?.blur?.();
                window.requestAnimationFrame(() => setShowCreator(true));
              }}
              className="inline-flex items-center justify-center rounded-lg border border-emerald-700/60 bg-emerald-950/30 px-2 py-1.5 text-[11px] font-medium text-emerald-300 hover:bg-emerald-950/50"
            >
              Create
            </button>
          </div>
          {value ? (
            <StorageDocumentLink
              value={value}
              className="inline-flex w-fit items-center justify-center gap-1 rounded-lg border border-sky-800 bg-sky-950/30 px-2 py-1.5 text-[11px] font-medium text-sky-300 hover:bg-sky-950/50"
            />
          ) : null}
        </div>
      </div>

      {showCreator && (
        <AppointmentLetterCreatorModal
          key={`${person.person_name}|${person.designation}|${person.educational_qualification}|${person.experience_years}`}
          projectId={projectId}
          rowId={rowId}
          letterData={letterData}
          topManagement={topManagement}
          person={person}
          onCreated={(url) => {
            onChange(url);
            setShowCreator(false);
          }}
          onClose={() => setShowCreator(false)}
        />
      )}
    </>
  );
}

const fieldInputClass =
  "mt-1.5 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30";

const fieldLabelClass =
  "block text-xs font-semibold uppercase tracking-wide text-zinc-400";

const TECH_STAFF_COMBO_SHELL =
  "flex overflow-hidden rounded-lg border border-zinc-700 bg-zinc-950 shadow-sm focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/30";

function TechnicalStaffDropdownField({
  label,
  optionKey,
  dialogTitle,
  addPlaceholder,
  manageAriaLabel,
  value,
  onChange,
  options,
  onOptionsChanged,
  commitOnBlur = true,
  searchPlaceholder,
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
  commitOnBlur?: boolean;
  searchPlaceholder?: string;
}) {
  return (
    <div className="min-w-0">
      <span className={fieldLabelClass}>{label}</span>
      <div className="mt-1.5">
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
          listZIndexClass="z-[460]"
          overlayZIndexClass="z-[470]"
          inputRowShellClassName={TECH_STAFF_COMBO_SHELL}
          suffixButtonClassName="border-zinc-600 bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
          onOptionAdded={onOptionsChanged}
          onOptionDeleted={onOptionsChanged}
          commitOnBlur={commitOnBlur}
          searchPlaceholder={searchPlaceholder}
        />
      </div>
    </div>
  );
}

export function TechnicalStaffFormModal({
  projectId,
  letterData,
  topManagement,
  initial,
  onSave,
  onClose,
}: {
  projectId: string;
  letterData: Omit<
    ManufacturingScopeDeclarationData,
    "licenseScope" | "licenseScopeFormat" | "licenseScopeRows"
  >;
  topManagement: TopManagementStored[];
  initial?: TechnicalStaffRow | null;
  onSave: (row: TechnicalStaffRow) => void;
  onClose: () => void;
}) {
  const isEdit = Boolean(initial);
  const draftId = initial?.id ?? createTechnicalStaffRow().id;

  const [personName, setPersonName] = useState(initial?.person_name ?? "");
  const [designation, setDesignation] = useState(initial?.designation ?? "");
  const [qualification, setQualification] = useState(
    initial?.educational_qualification ?? "",
  );
  const [experienceYears, setExperienceYears] = useState(initial?.experience_years ?? "");
  const [appointmentLetter, setAppointmentLetter] = useState(
    initial?.appointment_letter ?? "",
  );
  const [educationalCertificate, setEducationalCertificate] = useState(
    initial?.educational_certificate ?? "",
  );
  const [photo, setPhoto] = useState(initial?.photo ?? "");
  const [sealSign, setSealSign] = useState(initial?.seal_sign ?? "");
  const [error, setError] = useState<string | null>(null);
  const [dropdownOptions, setDropdownOptions] = useState<
    Record<string, AppDropdownOptionRow[]>
  >({});

  const reloadDropdowns = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("app_dropdown_options")
      .select("*")
      .in("option_key", [...TECHNICAL_STAFF_DROPDOWN_KEYS])
      .order("value", { ascending: true });

    const grouped: Record<string, AppDropdownOptionRow[]> = {};
    for (const key of TECHNICAL_STAFF_DROPDOWN_KEYS) grouped[key] = [];
    for (const opt of (data ?? []) as (AppDropdownOptionRow & { option_key?: string })[]) {
      const key = opt.option_key ?? "";
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(opt);
    }
    setDropdownOptions(grouped);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("app_dropdown_options")
        .select("*")
        .in("option_key", [...TECHNICAL_STAFF_DROPDOWN_KEYS])
        .order("value", { ascending: true });

      if (cancelled) return;

      const grouped: Record<string, AppDropdownOptionRow[]> = {};
      for (const key of TECHNICAL_STAFF_DROPDOWN_KEYS) grouped[key] = [];
      for (const opt of (data ?? []) as (AppDropdownOptionRow & { option_key?: string })[]) {
        const key = opt.option_key ?? "";
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(opt);
      }
      setDropdownOptions(grouped);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function handleSubmit() {
    if (!personName.trim()) {
      setError("Name of person is required.");
      return;
    }
    setError(null);
    onSave({
      id: draftId,
      ...defaultTechnicalStaffEntry(),
      person_name: personName.trim(),
      designation: designation.trim(),
      educational_qualification: qualification.trim(),
      experience_years: experienceYears.trim(),
      appointment_letter: appointmentLetter.trim(),
      educational_certificate: educationalCertificate.trim(),
      photo: photo.trim(),
      seal_sign: sealSign.trim(),
    });
  }

  return (
    <div
      className="fixed inset-0 z-[450] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="technical-staff-form-title"
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-800 px-5 py-4">
          <h2 id="technical-staff-form-title" className="text-sm font-bold text-white">
            {isEdit ? "Edit Technical Staff" : "Add Technical Staff"}
          </h2>
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

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="ts_person_name" className={fieldLabelClass}>
                Name of Person <span className="text-red-400">*</span>
              </label>
              <input
                id="ts_person_name"
                type="text"
                value={personName}
                onChange={(e) => setPersonName(e.target.value)}
                placeholder="Full name…"
                className={fieldInputClass}
              />
            </div>
            <TechnicalStaffDropdownField
              label="Designation"
              optionKey={DROPDOWN_KEY_TECHNICAL_STAFF_DESIGNATION}
              dialogTitle="Manage Designations"
              addPlaceholder="Add designation…"
              manageAriaLabel="Add or remove designations"
              value={designation}
              onChange={setDesignation}
              options={dropdownOptions[DROPDOWN_KEY_TECHNICAL_STAFF_DESIGNATION] ?? []}
              onOptionsChanged={reloadDropdowns}
              commitOnBlur
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TechnicalStaffDropdownField
              label="Educational Qualification"
              optionKey={DROPDOWN_KEY_TECHNICAL_STAFF_QUALIFICATION}
              dialogTitle="Manage Educational Qualifications"
              addPlaceholder="Add qualification…"
              manageAriaLabel="Add or remove qualifications"
              value={qualification}
              onChange={setQualification}
              options={dropdownOptions[DROPDOWN_KEY_TECHNICAL_STAFF_QUALIFICATION] ?? []}
              onOptionsChanged={reloadDropdowns}
              commitOnBlur
            />
            <TechnicalStaffDropdownField
              label="Experience in Year"
              optionKey={DROPDOWN_KEY_TECHNICAL_STAFF_EXPERIENCE}
              dialogTitle="Manage Experience (Years)"
              addPlaceholder="Add years…"
              manageAriaLabel="Add or remove experience options"
              value={experienceYears}
              onChange={setExperienceYears}
              options={dropdownOptions[DROPDOWN_KEY_TECHNICAL_STAFF_EXPERIENCE] ?? []}
              onOptionsChanged={reloadDropdowns}
              searchPlaceholder="Years…"
              commitOnBlur
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <AppointmentLetterField
              value={appointmentLetter}
              onChange={setAppointmentLetter}
              projectId={projectId}
              rowId={draftId}
              letterData={letterData}
              topManagement={topManagement}
              person={{
                person_name: personName,
                designation,
                educational_qualification: qualification,
                experience_years: experienceYears,
              }}
            />
            <FileUploadField
              label="Educational Certificate"
              value={educationalCertificate}
              onChange={setEducationalCertificate}
              projectId={projectId}
              rowId={draftId}
              field="educational-certificate"
            />
            <FileUploadField
              label="Photo"
              value={photo}
              onChange={setPhoto}
              projectId={projectId}
              rowId={draftId}
              field="photo"
              accept="image/*"
            />
            <FileUploadField
              label="Seal & Sign"
              value={sealSign}
              onChange={setSealSign}
              projectId={projectId}
              rowId={draftId}
              field="seal-sign"
              accept="image/*"
              removeBackgroundOnUpload
            />
          </div>

          {error ? (
            <p className="rounded-lg border border-red-800 bg-red-950/40 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 gap-2 border-t border-zinc-800 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-zinc-600 py-2 text-sm font-semibold text-zinc-300 hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="flex-1 rounded-lg bg-sky-600 py-2 text-sm font-semibold text-white hover:bg-sky-500"
          >
            {isEdit ? "Save Changes" : "Add to List"}
          </button>
        </div>
      </div>
    </div>
  );
}
