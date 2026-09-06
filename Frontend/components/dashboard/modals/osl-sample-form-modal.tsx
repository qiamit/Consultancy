"use client";

import { useState } from "react";
import { ClientDropdownField } from "@/components/modules/client-master/client-dropdown-field";
import { ClientMasterEmbedModal } from "@/components/modules/finance/client-master-embed-modal";
import { createClient } from "@backend/db/client/client";
import { DROPDOWN_KEY_BIS_PROJECT_CLIENT } from "@backend/shared/dropdown-keys";
import type { AppDropdownOptionRow } from "@backend/shared/types/app-dropdown-option";
import {
  createOslSampleRequirementRow,
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
    draft.sample_description,
  );
  const [declaredValue, setDeclaredValue] = useState(draft.declared_value);
  const [batchNumber, setBatchNumber] = useState(draft.batch_number);
  const [dateOfManufacturing, setDateOfManufacturing] = useState(
    draft.date_of_manufacturing,
  );
  const [sampleQuantity, setSampleQuantity] = useState(draft.sample_quantity);
  const [batchQuantity, setBatchQuantity] = useState(draft.batch_quantity);
  const [sampleCode, setSampleCode] = useState(draft.sample_code);
  const [qrCode, setQrCode] = useState(draft.qr_code);
  const [sampleType, setSampleType] = useState(draft.sample_type);
  const [priority, setPriority] = useState<OslSamplePriority>(draft.priority);
  const [laboratoryName, setLaboratoryName] = useState(draft.laboratory_name);
  const [showAddClient, setShowAddClient] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sampleDescription.trim() && !declaredValue.trim() && !batchNumber.trim()) {
      setError("Enter at least Sample Description, Declared Value, or Batch Number.");
      return;
    }
    onSave({
      id: draft.id,
      sample_description: sampleDescription.trim(),
      declared_value: declaredValue.trim(),
      batch_number: batchNumber.trim(),
      date_of_manufacturing: dateOfManufacturing.trim(),
      sample_quantity: sampleQuantity.trim(),
      batch_quantity: batchQuantity.trim(),
      sample_code: sampleCode.trim(),
      qr_code: qrCode.trim(),
      sample_type: sampleType.trim(),
      priority,
      laboratory_name: laboratoryName.trim(),
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
              onClick={onClose}
              className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white"
              aria-label="Close"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
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
                <div className="sm:col-span-2">
                  <label className={fieldLabelClass} htmlFor="osl-declared-value">
                    Declared Value
                  </label>
                  <textarea
                    id="osl-declared-value"
                    rows={3}
                    value={declaredValue}
                    onChange={(e) => setDeclaredValue(e.target.value)}
                    className={fieldInputClass}
                    placeholder="Declared values / composition…"
                  />
                </div>
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
                  <label className={fieldLabelClass} htmlFor="osl-sample-qty">
                    Sample Quantity
                  </label>
                  <input
                    id="osl-sample-qty"
                    type="text"
                    value={sampleQuantity}
                    onChange={(e) => setSampleQuantity(e.target.value)}
                    className={fieldInputClass}
                    placeholder="Qty…"
                  />
                </div>
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
                    placeholder="Qty…"
                  />
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
                  <label className={fieldLabelClass} htmlFor="osl-sample-type">
                    Sample Type
                  </label>
                  <input
                    id="osl-sample-type"
                    type="text"
                    value={sampleType}
                    onChange={(e) => setSampleType(e.target.value)}
                    className={fieldInputClass}
                    placeholder="Type…"
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
                <div className="sm:col-span-2">
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
                      onChange={setLaboratoryName}
                      options={clientOptions}
                      selectedValue={laboratoryName}
                      onClearSelection={() => setLaboratoryName("")}
                      includeEmptyOption={false}
                      searchPlaceholder="Search client…"
                      blankInputWhenNoSelection
                      onSuffixButtonClick={() => setShowAddClient(true)}
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
          onClose={() => setShowAddClient(false)}
          onSuccess={async (clientId) => {
            setShowAddClient(false);
            await onClientsChanged();
            const supabase = createClient();
            const { data } = await supabase
              .from("clients")
              .select("name, company_name")
              .eq("id", clientId)
              .maybeSingle();
            if (data) {
              setLaboratoryName(clientDisplayLabel(data));
            }
          }}
        />
      ) : null}
    </>
  );
}
