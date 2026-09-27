"use client";

import type { ReactNode } from "react";
import {
  parseSampleFor,
  resolveGradeAndDescription,
  sampleForLabel,
  type OslSampleRequirementStored,
} from "@backend/modules/bis/osl-sample-requirements";
import { ftrSourceTag, type FtrSampleSource } from "@backend/modules/bis/factory-test-report";
import { formatDisplayDate } from "@backend/shared/format-date";
import { StorageDocumentLink } from "@/components/dashboard/storage-document-link";

function displayValue(value: ReactNode): ReactNode {
  if (typeof value === "string") return value.trim() || "—";
  return value ?? "—";
}

function DetailCell({
  label,
  value,
  wide = false,
}: {
  label: string;
  value: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={`min-w-0 ${wide ? "sm:col-span-2" : ""}`}>
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
        {label}
      </dt>
      <dd className="mt-1 break-words text-sm leading-snug text-zinc-100">
        {displayValue(value)}
      </dd>
    </div>
  );
}

function FileLink({
  refValue,
  name,
  fallback,
}: {
  refValue?: string;
  name?: string;
  fallback: string;
}) {
  const ref = (refValue ?? "").trim();
  if (!ref) return "—";
  const label = (name ?? "").trim() || fallback;
  return (
    <StorageDocumentLink
      value={ref}
      label={label}
      title={label}
      className="inline-flex max-w-full items-center truncate rounded-md border border-sky-600/40 bg-sky-500/10 px-2 py-0.5 text-[11px] font-semibold text-sky-200 hover:bg-sky-500/20"
    />
  );
}

export function FtrSampleDetailsModal({
  source,
  sampleIndex,
  sample,
  onEdit,
  onClose,
}: {
  source: FtrSampleSource;
  sampleIndex: number;
  sample: OslSampleRequirementStored;
  onEdit: () => void;
  onClose: () => void;
}) {
  const sourceLabel = `${ftrSourceTag(source)} Sample Offer Letter`;
  const srNo = String(sampleIndex + 1).padStart(2, "0");
  const gradeAndDescription = resolveGradeAndDescription(sample);
  const sampleFor = sampleForLabel(parseSampleFor(sample.sample_for));

  return (
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-zinc-800 px-5 py-4">
          <h3 className="text-sm font-semibold text-white">Sample Details</h3>
          <p className="mt-0.5 text-xs text-zinc-400">
            {sourceLabel} · Sample {srNo} · {sampleFor}
          </p>
        </div>

        <dl className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
            <DetailCell label="Sample For" value={sampleFor} />
            <DetailCell label="Priority" value={sample.priority} />
            <DetailCell label="Sample Code" value={sample.sample_code} />
            <DetailCell label="QR Code" value={sample.qr_code} />
            <DetailCell label="Sample Type" value={sample.sample_type} />
            <DetailCell label="Serial Number" value={sample.serial_number} />
            <DetailCell label="Batch Number" value={sample.batch_number} />
            <DetailCell
              label="Date of Manufacturing"
              value={formatDisplayDate(sample.date_of_manufacturing)}
            />
            <DetailCell label="Shelf Life" value={sample.shelf_life} />
            <DetailCell label="Sample Quantity" value={sample.sample_quantity} />
            <DetailCell label="Batch Quantity" value={sample.batch_quantity} />
            <DetailCell label="Mode of Disposal" value={sample.mode_of_disposal} />
            <DetailCell label="Test Required" value={sample.test_required} />
            <DetailCell label="Testing Charges" value={sample.testing_charges} />
          </div>

          <div className="grid grid-cols-1 gap-x-6 gap-y-3 border-t border-zinc-800 pt-4 sm:grid-cols-2">
            <DetailCell
              label="Grade / Type / Variety"
              value={gradeAndDescription.grade_type_variety}
              wide
            />
            <DetailCell
              label="Sample Description"
              value={gradeAndDescription.sample_description}
              wide
            />
            <DetailCell label="Declared Value" value={sample.declared_value} />
            <DetailCell
              label="Declared Drawing"
              value={
                <FileLink
                  refValue={sample.declared_drawing_ref}
                  name={sample.declared_drawing_name}
                  fallback="Drawing"
                />
              }
            />
            <DetailCell label="Laboratory" value={sample.laboratory_name} />
            <DetailCell label="Destination Lab" value={sample.destination_lab} />
            <DetailCell
              label="Additional Information"
              value={sample.additional_information}
              wide
            />
          </div>

          <div className="grid grid-cols-1 gap-x-6 gap-y-3 border-t border-zinc-800 pt-4 sm:grid-cols-2">
            <DetailCell label="Payment Ref" value={sample.payment_ref} />
            <DetailCell
              label="Payment Date"
              value={formatDisplayDate(sample.payment_date)}
            />
            <DetailCell label="Payment Mode" value={sample.payment_mode} />
            <DetailCell
              label="Test Request"
              value={
                <FileLink
                  refValue={sample.test_request_ref}
                  name={sample.test_request_name}
                  fallback="Test Request"
                />
              }
            />
            <DetailCell
              label="Test Report"
              value={
                <FileLink
                  refValue={sample.test_report_ref}
                  name={sample.test_report_name}
                  fallback="Test Report"
                />
              }
            />
          </div>
        </dl>

        <div className="flex items-center justify-end gap-2 border-t border-zinc-800 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800"
          >
            Close
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-500"
          >
            Edit
          </button>
        </div>
      </div>
    </div>
  );
}
