"use client";

import { useState } from "react";
import { ClientDropdownField } from "@/components/modules/client-master/client-dropdown-field";
import { ClientMasterEmbedModal } from "@/components/modules/finance/client-master-embed-modal";
import { StorageDocumentLink } from "@/components/dashboard/storage-document-link";
import { createClient } from "@backend/db/client/client";
import { uploadTechnicalStaffDocument } from "@backend/modules/storage/technical-staff-documents";
import { DROPDOWN_KEY_BIS_PROJECT_CLIENT } from "@backend/shared/dropdown-keys";
import type { AppDropdownOptionRow } from "@backend/shared/types/app-dropdown-option";
import {
  createOslSampleRequirementRow,
  parseSampleFor,
  resolveGradeAndDescription,
  todayYmdLocal,
  type OslSampleFor,
  type OslSamplePriority,
  type OslSampleRequirementRow,
} from "@backend/modules/bis/osl-sample-requirements";

const fieldInputClass =
  "mt-1.5 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30";

const fieldLabelClass =
  "block text-xs font-semibold uppercase tracking-wide text-zinc-400";

const labShell =
  "flex overflow-hidden rounded-lg border border-zinc-700 bg-zinc-950 shadow-sm focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/30";

function clientDisplayLabel(c: {
  name: string | null;
  company_name: string | null;
}): string {
  const company = (c.company_name ?? "").trim();
  if (company) return company;
  return (c.name ?? "").trim() || "—";
}

export function OslSampleFormModal({
  initial = null,
  clientOptions,
  onClientsChanged,
  onSave,
  onClose,
}: {
  initial?: OslSampleRequirementRow | null;
  clientOptions: AppDropdownOptionRow[];
  onClientsChanged: () => void | Promise<void>;
  onSave: (row: OslSampleRequirementRow) => void;
  onClose: () => void;
}) {
  const isEdit = Boolean(initial);
  const [draft] = useState(() => initial ?? createOslSampleRequirementRow());
  const [sampleDescription, setSampleDescription] = useState(
    () => resolveGradeAndDescription(draft).sample_description,
  );
  const [gradeTypeVariety, setGradeTypeVariety] = useState(
    () => resolveGradeAndDescription(draft).grade_type_variety,
  );
  const [declaredValue, setDeclaredValue] = useState(draft.declared_value);
  const [declaredDrawingRef, setDeclaredDrawingRef] = useState(
    draft.declared_drawing_ref ?? "",
  );
  const [declaredDrawingName, setDeclaredDrawingName] = useState(
    draft.declared_drawing_name ?? "",
  );
  const [declaredDrawingUploading, setDeclaredDrawingUploading] = useState(false);
  const [batchNumber, setBatchNumber] = useState(draft.batch_number);
  const [dateOfManufacturing, setDateOfManufacturing] = useState(
    draft.date_of_manufacturing?.trim() || todayYmdLocal(),
  );
  const [sampleQuantity, setSampleQuantity] = useState(
    draft.sample_quantity?.trim() || "1 Mtr X 2 Nos + 50 mm X 5 Nos",
  );
  const [batchQuantity, setBatchQuantity] = useState(
    draft.batch_quantity?.trim() || "0.50 Tonne Approx",
  );
  const [sampleCode, setSampleCode] = useState(draft.sample_code);
  const [qrCode, setQrCode] = useState(draft.qr_code);
  const [sampleType, setSampleType] = useState(
    draft.sample_type?.trim() || "AS",
  );
  const [priority, setPriority] = useState<OslSamplePriority>(draft.priority);
  const [laboratoryName, setLaboratoryName] = useState(draft.laboratory_name);
  function applyLaboratoryName(next: string) {
    const prev = laboratoryName;
    setLaboratoryName(next);
    setDestinationLab((current) => {
      if (!current.trim() || current === prev) return next;
      return current;
    });
  }
  const [shelfLife, setShelfLife] = useState(
    draft.shelf_life?.trim() || "Life Long",
  );
  const [modeOfDisposal, setModeOfDisposal] = useState(
    draft.mode_of_disposal?.trim() || "To be Disposed",
  );
  const [testingCharges, setTestingCharges] = useState(
    draft.testing_charges ?? "",
  );
  const [testRequired, setTestRequired] = useState(
    draft.test_required?.trim() || "All Test",
  );
  const [serialNumber, setSerialNumber] = useState(draft.serial_number ?? "");
  const [additionalInformation, setAdditionalInformation] = useState(
    draft.additional_information ?? "",
  );
  const [destinationLab, setDestinationLab] = useState(
    (draft.destination_lab ?? "").trim() || draft.laboratory_name,
  );
  const [paymentRef, setPaymentRef] = useState(
    draft.payment_ref?.trim() || "654321",
  );
  const [paymentDate, setPaymentDate] = useState(
    draft.payment_date?.trim() || todayYmdLocal(),
  );
  const [paymentMode, setPaymentMode] = useState(
    draft.payment_mode?.trim() || "Cheque",
  );
  const [sampleFor, setSampleFor] = useState<OslSampleFor>(
    parseSampleFor(draft.sample_for),
  );
  const [showAddClient, setShowAddClient] = useState<"lab" | "destination" | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  async function attachDeclaredDrawing(file: File | null) {
    if (!file) return;
    setDeclaredDrawingUploading(true);
    try {
      const safeName = file.name.replace(/[^\w.\-]+/g, "-").slice(0, 120) || "drawing";
      const safeId = draft.id.replace(/[^\w.\-]+/g, "-").slice(0, 80);
      const path = `osl-sample-declared-drawings/${safeId}/${Date.now()}-${safeName}`;
      const result = await uploadTechnicalStaffDocument(createClient(), path, file);
      if ("error" in result) {
        window.alert(`Drawing / PDF upload failed: ${result.error}`);
        return;
      }
      setDeclaredDrawingRef(result.ref);
      setDeclaredDrawingName(file.name.trim() || safeName);
    } finally {
      setDeclaredDrawingUploading(false);
    }
  }

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (
      !sampleDescription.trim() &&
      !gradeTypeVariety.trim() &&
      !declaredValue.trim() &&
      !batchNumber.trim()
    ) {
      setError("Enter at least Sample Description, Grade / Type / Variety, Declared Value, or Batch Number.");
      return;
    }
    onSave({
      id: draft.id,
      sample_description: sampleDescription.trim(),
      grade_type_variety: gradeTypeVariety.trim(),
      declared_value: declaredValue.trim(),
      declared_drawing_ref: declaredDrawingRef.trim(),
      declared_drawing_name: declaredDrawingName.trim(),
      batch_number: batchNumber.trim(),
      date_of_manufacturing: dateOfManufacturing.trim(),
      sample_quantity: sampleQuantity.trim(),
      batch_quantity: batchQuantity.trim(),
      sample_code: sampleCode.trim(),
      qr_code: qrCode.trim(),
      sample_type: sampleType.trim(),
      priority,
      laboratory_name: laboratoryName.trim(),
      shelf_life: shelfLife.trim(),
      mode_of_disposal: modeOfDisposal.trim(),
      testing_charges: testingCharges.trim(),
      test_required: testRequired.trim(),
      serial_number: serialNumber.trim(),
      additional_information: additionalInformation.trim(),
      destination_lab: destinationLab.trim(),
      payment_ref: paymentRef.trim(),
      payment_date: paymentDate.trim(),
      payment_mode: paymentMode.trim(),
      sample_for: sampleFor,
      include_in_print: draft.include_in_print !== false,
      test_report_ref: (draft.test_report_ref ?? "").trim(),
      test_report_name: (draft.test_report_name ?? "").trim(),
      test_request_ref: (draft.test_request_ref ?? "").trim(),
      test_request_name: (draft.test_request_name ?? "").trim(),
    });
  }

  return (
    <>
      <div
        className="fixed inset-0 z-[500] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="osl-sample-form-title"
      >
        <div className="flex max-h-[min(92vh,820px)] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl">
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-800 px-4 py-3">
            <h2
              id="osl-sample-form-title"
              className="text-sm font-semibold text-zinc-100"
            >
              {isEdit ? "Edit Sample" : "Add Sample"}
            </h2>
            <button
              type="button"
              onClick={() => handleSubmit()}
              className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white"
              aria-label="Save & Close"
              title="Save & Close"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label className={fieldLabelClass} htmlFor="osl-sample-for">
                      Sample For
                    </label>
                    <select
                      id="osl-sample-for"
                      value={sampleFor}
                      onChange={(e) =>
                        setSampleFor(parseSampleFor(e.target.value))
                      }
                      className={fieldInputClass}
                    >
                      <option value="osl">OSL</option>
                      <option value="ft">FT</option>
                      <option value="it">IT</option>
                    </select>
                  </div>
                  <div>
                    <label className={fieldLabelClass} htmlFor="osl-sample-code">
                      Sample Code
                    </label>
                    <input
                      id="osl-sample-code"
                      type="text"
                      value={sampleCode}
                      onChange={(e) => setSampleCode(e.target.value)}
                      className={fieldInputClass}
                      placeholder="Code…"
                    />
                  </div>
                  <div>
                    <label className={fieldLabelClass} htmlFor="osl-qr-code">
                      QR Code
                    </label>
                    <input
                      id="osl-qr-code"
                      type="text"
                      value={qrCode}
                      onChange={(e) => setQrCode(e.target.value)}
                      className={fieldInputClass}
                      placeholder="QR…"
                    />
                  </div>
                  <div>
                    <label className={fieldLabelClass} htmlFor="osl-priority">
                      Priority
                    </label>
                    <select
                      id="osl-priority"
                      value={priority}
                      onChange={(e) =>
                        setPriority(e.target.value as OslSamplePriority)
                      }
                      className={fieldInputClass}
                    >
                      <option value="Priority">Priority</option>
                      <option value="Non Priority">Non Priority</option>
                    </select>
                  </div>
                </div>
                <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label className={fieldLabelClass} htmlFor="osl-batch-number">
                      Batch Number
                    </label>
                    <input
                      id="osl-batch-number"
                      type="text"
                      value={batchNumber}
                      onChange={(e) => setBatchNumber(e.target.value)}
                      className={fieldInputClass}
                      placeholder="Batch…"
                    />
                  </div>
                  <div>
                    <label className={fieldLabelClass} htmlFor="osl-dom">
                      Date of Manufacturing
                    </label>
                    <input
                      id="osl-dom"
                      type="date"
                      value={dateOfManufacturing}
                      onChange={(e) => setDateOfManufacturing(e.target.value)}
                      className={fieldInputClass}
                    />
                  </div>
                  <div>
                    <label className={fieldLabelClass} htmlFor="osl-shelf-life">
                      Shelf Life
                    </label>
                    <input
                      id="osl-shelf-life"
                      type="text"
                      value={shelfLife}
                      onChange={(e) => setShelfLife(e.target.value)}
                      className={fieldInputClass}
                      placeholder="Life Long"
                    />
                  </div>
                  <div>
                    <label className={fieldLabelClass} htmlFor="osl-sample-qty">
                      Sample Quantity
                    </label>
                    <input
                      id="osl-sample-qty"
                      type="text"
                      value={sampleQuantity}
                      onChange={(e) => setSampleQuantity(e.target.value)}
                      className={fieldInputClass}
                      placeholder="1 Mtr X 2 Nos + 50 mm X 5 Nos"
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label className={fieldLabelClass} htmlFor="osl-sample-type">
                      Sample Type
                    </label>
                    <input
                      id="osl-sample-type"
                      type="text"
                      value={sampleType}
                      onChange={(e) => setSampleType(e.target.value)}
                      className={fieldInputClass}
                      placeholder="AS"
                    />
                  </div>
                  <div>
                    <label className={fieldLabelClass} htmlFor="osl-mode-disposal">
                      Mode Of Disposal
                    </label>
                    <input
                      id="osl-mode-disposal"
                      type="text"
                      value={modeOfDisposal}
                      onChange={(e) => setModeOfDisposal(e.target.value)}
                      className={fieldInputClass}
                      placeholder="To be Disposed"
                    />
                  </div>
                  <div>
                    <label className={fieldLabelClass} htmlFor="osl-test-required">
                      Test Required
                    </label>
                    <input
                      id="osl-test-required"
                      type="text"
                      value={testRequired}
                      onChange={(e) => setTestRequired(e.target.value)}
                      className={fieldInputClass}
                      placeholder="All Test"
                    />
                  </div>
                  <div>
                    <label className={fieldLabelClass} htmlFor="osl-serial-number">
                      Serial Number
                    </label>
                    <input
                      id="osl-serial-number"
                      type="text"
                      value={serialNumber}
                      onChange={(e) => setSerialNumber(e.target.value)}
                      className={fieldInputClass}
                      placeholder="Serial number…"
                    />
                  </div>
                </div>
                <div>
                  <label className={fieldLabelClass} htmlFor="osl-grade-type-variety">
                    Grade / Type / Variety / Size / Class / Rating
                  </label>
                  <textarea
                    id="osl-grade-type-variety"
                    rows={3}
                    value={gradeTypeVariety}
                    onChange={(e) => setGradeTypeVariety(e.target.value)}
                    className={fieldInputClass}
                    placeholder="Grade, type, variety, size, class, rating…"
                  />
                </div>
                <div>
                  <label className={fieldLabelClass} htmlFor="osl-declared-value">
                    Declared Value
                  </label>
                  <div className="relative mt-1.5">
                    <textarea
                      id="osl-declared-value"
                      rows={3}
                      value={declaredValue}
                      onChange={(e) => setDeclaredValue(e.target.value)}
                      className={`${fieldInputClass} mt-0 pb-8 pr-24`}
                      placeholder="Declared values / composition…"
                    />
                    <div className="absolute bottom-1.5 right-1.5 flex items-center gap-1">
                      {declaredDrawingRef.trim() ? (
                        <StorageDocumentLink
                          value={declaredDrawingRef}
                          download={declaredDrawingName.trim() || true}
                          title={declaredDrawingName.trim() || "Download drawing / PDF"}
                          label={
                            <>
                              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M7.5 12L12 16.5m0 0L16.5 12M12 16.5V3" />
                              </svg>
                              <span>Download</span>
                            </>
                          }
                          className="inline-flex items-center gap-1 rounded-md border border-sky-600/50 bg-sky-950/80 px-1.5 py-0.5 text-[10px] font-semibold text-sky-200 hover:bg-sky-950"
                        />
                      ) : null}
                      <label
                        className={`inline-flex cursor-pointer items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${
                          declaredDrawingRef.trim()
                            ? "border-emerald-600/50 bg-emerald-950/80 text-emerald-200 hover:bg-emerald-950"
                            : "border-zinc-600 bg-zinc-900/90 text-zinc-200 hover:bg-zinc-800"
                        } ${declaredDrawingUploading ? "pointer-events-none opacity-60" : ""}`}
                        title={
                          declaredDrawingUploading
                            ? "Uploading…"
                            : declaredDrawingName.trim()
                              ? `Replace drawing / PDF (${declaredDrawingName.trim()})`
                              : "Attach PDF or drawing"
                        }
                      >
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 8.25l-10.94 10.939a1.5 1.5 0 01-2.121-2.121l6.97-6.97" />
                        </svg>
                        <span>
                          {declaredDrawingUploading
                            ? "Uploading…"
                            : declaredDrawingRef.trim()
                              ? "Replace"
                              : "Attach"}
                        </span>
                        <input
                          type="file"
                          className="hidden"
                          accept=".pdf,.dwg,.dxf,.jpg,.jpeg,.png,.tif,.tiff,.webp"
                          disabled={declaredDrawingUploading}
                          onChange={(e) => {
                            const file = e.target.files?.[0] ?? null;
                            e.target.value = "";
                            void attachDeclaredDrawing(file);
                          }}
                        />
                      </label>
                    </div>
                  </div>
                </div>
                <div className="grid gap-4 sm:col-span-2 sm:grid-cols-3">
                  <div>
                    <label className={fieldLabelClass} htmlFor="osl-batch-qty">
                      Batch Quantity
                    </label>
                    <input
                      id="osl-batch-qty"
                      type="text"
                      value={batchQuantity}
                      onChange={(e) => setBatchQuantity(e.target.value)}
                      className={fieldInputClass}
                      placeholder="0.50 Tonne Approx"
                    />
                  </div>
                  <div>
                    <span className={fieldLabelClass}>Name of the Laboratory</span>
                    <div className="mt-1.5">
                      <ClientDropdownField
                        hideLabel
                        inputRowShellClassName={labShell}
                        listZIndexClass="z-[520]"
                        overlayZIndexClass="z-[530]"
                        optionKey={DROPDOWN_KEY_BIS_PROJECT_CLIENT}
                        name={`osl_lab_form_${draft.id}`}
                        label="Name of the Laboratory"
                        dialogTitle="Clients"
                        addPlaceholder="New client label"
                        manageAriaLabel="Add new client"
                        value={laboratoryName}
                        onChange={applyLaboratoryName}
                        options={clientOptions}
                        selectedValue={laboratoryName}
                        onClearSelection={() => applyLaboratoryName("")}
                        includeEmptyOption={false}
                        searchPlaceholder="Search client…"
                        blankInputWhenNoSelection
                        onSuffixButtonClick={() => setShowAddClient("lab")}
                      />
                    </div>
                  </div>
                  <div>
                    <span className={fieldLabelClass}>Destination Lab</span>
                    <div className="mt-1.5">
                      <ClientDropdownField
                        hideLabel
                        inputRowShellClassName={labShell}
                        listZIndexClass="z-[520]"
                        overlayZIndexClass="z-[530]"
                        optionKey={DROPDOWN_KEY_BIS_PROJECT_CLIENT}
                        name={`osl_dest_lab_form_${draft.id}`}
                        label="Destination Lab"
                        dialogTitle="Clients"
                        addPlaceholder="New client label"
                        manageAriaLabel="Add new destination lab"
                        value={destinationLab}
                        onChange={setDestinationLab}
                        options={clientOptions}
                        selectedValue={destinationLab}
                        onClearSelection={() => setDestinationLab("")}
                        includeEmptyOption={false}
                        searchPlaceholder="Search client…"
                        blankInputWhenNoSelection
                        onSuffixButtonClick={() => setShowAddClient("destination")}
                      />
                    </div>
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                    Manak Test Request
                  </p>
                </div>
                <div>
                  <label className={fieldLabelClass} htmlFor="osl-sample-description">
                    Sample Description
                  </label>
                  <textarea
                    id="osl-sample-description"
                    rows={3}
                    value={sampleDescription}
                    onChange={(e) => setSampleDescription(e.target.value)}
                    className={fieldInputClass}
                    placeholder="Describe the sample…"
                  />
                </div>
                <div>
                  <label className={fieldLabelClass} htmlFor="osl-additional-info">
                    Additional Information
                  </label>
                  <textarea
                    id="osl-additional-info"
                    rows={3}
                    value={additionalInformation}
                    onChange={(e) => setAdditionalInformation(e.target.value)}
                    className={fieldInputClass}
                    placeholder="Any extra note for Manak…"
                  />
                </div>
                <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label className={fieldLabelClass} htmlFor="osl-testing-charges">
                      Testing Charges
                    </label>
                    <input
                      id="osl-testing-charges"
                      type="text"
                      value={testingCharges}
                      onChange={(e) => setTestingCharges(e.target.value)}
                      className={fieldInputClass}
                      placeholder="Rs. …"
                    />
                  </div>
                  <div>
                    <label className={fieldLabelClass} htmlFor="osl-payment-ref">
                      UTR / UPI / Cheque Number
                    </label>
                    <input
                      id="osl-payment-ref"
                      type="text"
                      value={paymentRef}
                      onChange={(e) => setPaymentRef(e.target.value)}
                      className={fieldInputClass}
                      placeholder="Payment reference…"
                    />
                  </div>
                  <div>
                    <label className={fieldLabelClass} htmlFor="osl-payment-date">
                      Date of Transaction
                    </label>
                    <input
                      id="osl-payment-date"
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className={fieldInputClass}
                    />
                  </div>
                  <div>
                    <label className={fieldLabelClass} htmlFor="osl-payment-mode">
                      Mode of Payment
                    </label>
                    <input
                      id="osl-payment-mode"
                      type="text"
                      value={paymentMode}
                      onChange={(e) => setPaymentMode(e.target.value)}
                      className={fieldInputClass}
                      placeholder="UPI / NEFT / Cheque…"
                    />
                  </div>
                </div>
              </div>
              {error ? (
                <p className="text-xs text-red-400" role="alert">
                  {error}
                </p>
              ) : null}
            </div>

            <div className="flex shrink-0 items-center justify-end gap-2 border-t border-zinc-800 px-4 py-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-zinc-600 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-500"
              >
                {isEdit ? "Update Sample" : "Save Sample"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {showAddClient ? (
        <ClientMasterEmbedModal
          onClose={() => setShowAddClient(null)}
          onSuccess={async (clientId) => {
            const target = showAddClient;
            setShowAddClient(null);
            await onClientsChanged();
            const supabase = createClient();
            const { data } = await supabase
              .from("clients")
              .select("name, company_name")
              .eq("id", clientId)
              .maybeSingle();
            if (data) {
              const label = clientDisplayLabel(data);
              if (target === "destination") setDestinationLab(label);
              else applyLaboratoryName(label);
            }
          }}
        />
      ) : null}
    </>
  );
}
