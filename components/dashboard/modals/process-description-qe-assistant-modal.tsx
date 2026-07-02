"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { AiChatModal } from "@/components/dashboard/ai-chat-modal";
import {
  autoGenerateProcessDescriptionPoints,
  getLicenseScopeAssistantIsCodeStatus,
  handleProcessDescriptionQeAssistantMessage,
} from "@/lib/actions/process-description-qe-assistant";
import type { ChatMessage } from "@/lib/actions/ai-chat";
import type { LicenseScopeFormat } from "@/lib/license-scope-format";
import type { ProcessFlowChartStored } from "@/lib/process-flow-chart";
import {
  applyProcessDescriptionQeUpdate,
  parseProcessDescriptionQeReply,
} from "@/lib/process-description-qe-assistant";
import type { ProcessDescriptionStored } from "@/lib/process-description";

const PROCESS_DESCRIPTION_QE_STARTERS = [
  "Generate process description points from IS, flow chart & license scope",
  "Rewrite my process description for clearer BIS compliance",
  "Review my points and suggest improvements",
];

export function ProcessDescriptionQeAssistantModal({
  isCodeId,
  isReference,
  isTitle,
  companyName,
  applicationNumber,
  licenseScopeFormat,
  plainScope,
  tableRows,
  processFlowChart,
  document,
  onApplyUpdate,
  onClose,
}: {
  isCodeId: string | null;
  isReference: string;
  isTitle: string;
  companyName: string;
  applicationNumber: string;
  licenseScopeFormat: LicenseScopeFormat;
  plainScope: string;
  tableRows: { component: string; value: string }[];
  processFlowChart: ProcessFlowChartStored;
  document: ProcessDescriptionStored;
  onApplyUpdate: (document: ProcessDescriptionStored) => void;
  onClose: () => void;
}) {
  const [fileStatus, setFileStatus] = useState<{
    loading: boolean;
    hasFiles: boolean;
    fileCount: number;
    fileName: string | null;
  }>({ loading: true, hasFiles: false, fileCount: 0, fileName: null });
  const [generating, startGenerate] = useTransition();

  useEffect(() => {
    let cancelled = false;
    void getLicenseScopeAssistantIsCodeStatus(isCodeId).then((status) => {
      if (cancelled) return;
      setFileStatus({ loading: false, ...status });
    });
    return () => {
      cancelled = true;
    };
  }, [isCodeId]);

  const flowSteps =
    processFlowChart.outline_items?.filter((item) => item.text.trim()).length ??
    processFlowChart.shapes.filter((s) => s.type === "rectangle" && s.label.trim()).length;

  const scopePreview =
    licenseScopeFormat === "plain"
      ? plainScope.trim() || "(empty)"
      : tableRows.filter((r) => r.component.trim() || r.value.trim()).length > 0
        ? `${tableRows.filter((r) => r.component.trim() || r.value.trim()).length} table row(s)`
        : "(empty)";

  const currentPointsPreview =
    document.description_points.filter((p) => p.trim()).length > 0
      ? `${document.description_points.filter((p) => p.trim()).length} point(s)`
      : "(empty)";

  const assistantPayload = {
    isCodeId,
    isReference,
    isTitle,
    companyName,
    applicationNumber,
    format: licenseScopeFormat,
    plainScope,
    tableRows,
    processFlowChart,
    currentPoints: document.description_points,
  };

  const handleAutoGenerate = () => {
    startGenerate(async () => {
      const result = await autoGenerateProcessDescriptionPoints({
        isCodeId,
        isReference,
        isTitle,
        companyName,
        applicationNumber,
        format: licenseScopeFormat,
        plainScope,
        tableRows,
        processFlowChart,
      });
      if (!result.ok) {
        window.alert(result.error);
        return;
      }
      onApplyUpdate(applyProcessDescriptionQeUpdate({ apply: true, points: result.points }, document));
    });
  };

  const handleCustomSend = useCallback(
    async (text: string, messages: ChatMessage[], modelId: string | undefined) => {
      const res = await handleProcessDescriptionQeAssistantMessage(
        text,
        messages,
        modelId,
        assistantPayload,
      );
      if (!res.ok) {
        return { reply: `⚠️ ${res.error}` };
      }

      const { displayReply, update } = parseProcessDescriptionQeReply(res.reply);
      if (update) {
        onApplyUpdate(applyProcessDescriptionQeUpdate(update, document));
        const appliedNote =
          "\n\n✅ **Applied to process description editor.** Review the points and click Save when ready.";
        return { reply: (displayReply || "Updated process description points.") + appliedNote };
      }

      return { reply: displayReply };
    },
    [assistantPayload, document, onApplyUpdate],
  );

  return (
    <AiChatModal
      title="QE Assistant"
      subtitle="Process Description · Auto-generate from IS & Flow Chart"
      systemPrompt=""
      starterQuestions={PROCESS_DESCRIPTION_QE_STARTERS}
      accentColor="amber"
      overlayZIndexClass="z-[500]"
      onClose={onClose}
      onCustomSend={handleCustomSend}
      inputPlaceholder="Ask to generate, rewrite, or update process description points…"
      beforeInput={
        <div className="mb-3 space-y-2 rounded-lg border border-amber-200/60 bg-amber-50/80 px-3 py-2.5 text-xs dark:border-amber-900/50 dark:bg-amber-950/20">
          <p className="font-semibold text-amber-900 dark:text-amber-200">
            {isReference !== "—" ? isReference : "IS code not linked"}
            {isTitle ? ` · ${isTitle}` : ""}
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-amber-800/90 dark:text-amber-300/90">
            <span>
              IS files:{" "}
              {fileStatus.loading
                ? "Loading…"
                : fileStatus.hasFiles
                  ? `${fileStatus.fileCount} uploaded${fileStatus.fileName ? ` (${fileStatus.fileName})` : ""}`
                  : "None — upload in IS Code Master"}
            </span>
            <span>License scope: {scopePreview}</span>
            <span>Flow chart steps: {flowSteps > 0 ? flowSteps : "(empty)"}</span>
            <span>Current points: {currentPointsPreview}</span>
          </div>
          <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80">
            QE Assistant reads the IS document, your license scope, and process flow chart to draft
            numbered process description points and apply them to the editor.
          </p>
          <button
            type="button"
            onClick={handleAutoGenerate}
            disabled={generating}
            className="w-full rounded-lg border border-amber-600/50 bg-amber-500/20 px-3 py-2 text-xs font-semibold text-amber-100 hover:bg-amber-500/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {generating ? "Generating points…" : "Auto-generate process description points"}
          </button>
        </div>
      }
    />
  );
}
