"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { AiChatModal } from "@/components/dashboard/ai-chat-modal";
import {
  autoGenerateProcessDescriptionPoints,
  getLicenseScopeAssistantIsCodeStatus,
  handleProcessDescriptionQeAssistantMessage,
} from "@backend/actions/process-description-qe-assistant";
import type { ChatMessage } from "@backend/actions/ai-chat";
import type { LicenseScopeFormat } from "@backend/modules/bis/license-scope-format";
import type { ProcessFlowChartStored } from "@backend/modules/bis/process-flow-chart";
import {
  applyProcessDescriptionQeUpdate,
  parseProcessDescriptionQeReply,
} from "@backend/modules/bis/process-description-qe-assistant";
import type { ProcessDescriptionStored } from "@backend/modules/bis/process-description";

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

  const scopeText =
    licenseScopeFormat === "plain"
      ? plainScope.trim()
      : tableRows
          .filter((r) => r.component.trim() || r.value.trim())
          .map((r) =>
            r.component.trim() && r.value.trim()
              ? `${r.component.trim()}: ${r.value.trim()}`
              : r.component.trim() || r.value.trim(),
          )
          .join("; ");
  const scopePreview = scopeText
    ? scopeText.length > 140
      ? `${scopeText.slice(0, 137)}…`
      : scopeText
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
      size="wide"
      onClose={onClose}
      onCustomSend={handleCustomSend}
      inputPlaceholder="Ask to generate, rewrite, or update process description points…"
      beforeMessages={
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs dark:border-amber-900/50 dark:bg-amber-950/30">
          <p className="font-semibold leading-snug text-amber-950 dark:text-amber-100">
            {isReference !== "—" ? isReference : "IS code not linked"}
            {isTitle ? ` · ${isTitle}` : ""}
          </p>
          <dl className="mt-2 grid grid-cols-1 gap-1.5 text-amber-900/90 dark:text-amber-200/90 sm:grid-cols-2">
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-amber-700/70 dark:text-amber-400/70">
                IS file
              </dt>
              <dd className="truncate">
                {fileStatus.loading
                  ? "Loading…"
                  : fileStatus.hasFiles
                    ? `${fileStatus.fileCount} uploaded${fileStatus.fileName ? ` · ${fileStatus.fileName}` : ""}`
                    : "None — upload in IS Code Master"}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-amber-700/70 dark:text-amber-400/70">
                Flow chart / points
              </dt>
              <dd>
                {flowSteps > 0 ? `${flowSteps} steps` : "No flow steps"} · {currentPointsPreview}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-amber-700/70 dark:text-amber-400/70">
                License scope
              </dt>
              <dd className="leading-relaxed">{scopePreview}</dd>
            </div>
          </dl>
          <button
            type="button"
            onClick={handleAutoGenerate}
            disabled={generating}
            className="mt-3 w-full rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-amber-500 dark:hover:bg-amber-400"
          >
            {generating ? "Generating points…" : "Auto-generate process description points"}
          </button>
        </div>
      }
    />
  );
}
