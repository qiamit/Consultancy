"use client";

import {
  ChecklistDocumentImportDialog,
} from "@/components/dashboard/modals/checklist-document-import-dialog";
import type { ChecklistImportExclude } from "@backend/modules/bis/checklist-document-import-meta";
import type { ProcessFlowChartStored } from "@backend/modules/bis/process-flow-chart";

/** Thin wrapper kept for existing Process Flow Chart call sites. */
export function ProcessFlowChartImportDialog({
  defaultClientId,
  exclude,
  onImport,
  onClose,
}: {
  defaultClientId?: string | null;
  exclude?: ChecklistImportExclude | null;
  onImport: (
    document: ProcessFlowChartStored,
    meta: { label: string },
  ) => boolean | void;
  onClose: () => void;
}) {
  return (
    <ChecklistDocumentImportDialog
      documentKey="process_flow_chart"
      title="Import Chart"
      defaultClientId={defaultClientId}
      exclude={exclude}
      onImport={(payload, meta) => {
        if (payload.key !== "process_flow_chart") return false;
        return onImport(payload.document, meta);
      }}
      onClose={onClose}
    />
  );
}
