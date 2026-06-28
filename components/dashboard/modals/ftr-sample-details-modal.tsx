"use client";

import type { OslSampleRequirementStored } from "@/lib/osl-sample-requirements";
import type { FtrSampleSource } from "@/lib/factory-test-report";
import { formatDisplayDate } from "@/lib/format-date";

function DetailRow({ label, value }: { label: string; value: string }) {
  const display = value.trim() || "—";
  return (
    <div className="grid grid-cols-[minmax(0,140px)_1fr] gap-3 border-b border-zinc-800 py-2.5 last:border-b-0">
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">{label}</dt>
      <dd className="text-sm text-zinc-100">{display}</dd>
    </div>
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
  const sourceLabel = source === "osl" ? "OSL Sample Offer Letter" : "PI Sample Offer Letter";
  const srNo = String(sampleIndex + 1).padStart(2, "0");

  return (
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-zinc-800 px-5 py-4">
          <h3 className="text-sm font-semibold text-white">Sample Details</h3>
          <p className="mt-0.5 text-xs text-zinc-400">
            {sourceLabel} · Sample {srNo}
          </p>
        </div>

        <dl className="min-h-0 flex-1 overflow-y-auto px-5 py-2">
          <DetailRow label="Sample Description" value={sample.sample_description} />
          <DetailRow label="Declared Value" value={sample.declared_value} />
          <DetailRow label="Batch Number" value={sample.batch_number} />
          <DetailRow
            label="Date of Manufacturing"
            value={formatDisplayDate(sample.date_of_manufacturing)}
          />
          <DetailRow label="Sample Quantity" value={sample.sample_quantity} />
          <DetailRow label="Batch Quantity" value={sample.batch_quantity} />
          <DetailRow label="Sample Code" value={sample.sample_code} />
          <DetailRow label="QR Code" value={sample.qr_code} />
          <DetailRow label="Sample Type" value={sample.sample_type} />
          <DetailRow label="Priority" value={sample.priority} />
          <DetailRow label="Laboratory" value={sample.laboratory_name} />
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
