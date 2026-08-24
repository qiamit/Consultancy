"use client";

import { useCallback, useEffect, useState } from "react";
import { AiChatModal } from "@/components/dashboard/ai-chat-modal";
import {
  getFtrAssistantIsCodeStatus,
  handleFtrAssistantMessage,
} from "@backend/actions/ftr-assistant";
import type { ChatMessage } from "@backend/actions/ai-chat";
import type { FactoryTestReportStored } from "@backend/modules/bis/factory-test-report";
import { sortFtrTestRowsByClause } from "@backend/modules/bis/factory-test-report";

const FTR_QE_STARTERS = [
  "Review this Factory Test Report against the IS standard. Is it OK?",
  "Check all observed values vs specified requirements",
  "List any failing tests or missing data",
];

export function FtrQeAssistantModal({
  isCodeId,
  isReference,
  isTitle,
  companyName,
  report,
  onClose,
}: {
  isCodeId: string | null;
  isReference: string;
  isTitle: string;
  companyName: string;
  report: FactoryTestReportStored;
  onClose: () => void;
}) {
  const [fileStatus, setFileStatus] = useState<{
    loading: boolean;
    hasFiles: boolean;
    fileCount: number;
    fileName: string | null;
  }>({ loading: true, hasFiles: false, fileCount: 0, fileName: null });

  useEffect(() => {
    let cancelled = false;
    void getFtrAssistantIsCodeStatus(isCodeId).then((status) => {
      if (cancelled) return;
      setFileStatus({ loading: false, ...status });
    });
    return () => {
      cancelled = true;
    };
  }, [isCodeId]);

  const testCount = sortFtrTestRowsByClause(report.test_rows ?? []).length;

  const handleCustomSend = useCallback(
    async (text: string, messages: ChatMessage[], modelId: string | undefined) => {
      const res = await handleFtrAssistantMessage(text, messages, modelId, {
        isCodeId,
        isReference,
        isTitle,
        companyName,
        report,
      });
      if (!res.ok) {
        return { reply: `⚠️ ${res.error}` };
      }
      return { reply: res.reply };
    },
    [isCodeId, isReference, isTitle, companyName, report],
  );

  return (
    <AiChatModal
      title="QE Assistant"
      subtitle="Factory Test Report · Compliance Review"
      systemPrompt=""
      starterQuestions={FTR_QE_STARTERS}
      accentColor="amber"
      overlayZIndexClass="z-[550]"
      onClose={onClose}
      onCustomSend={handleCustomSend}
      inputPlaceholder="Ask about FTR compliance, test results, or IS requirements…"
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
            <span>Test rows: {testCount}</span>
            {report.sample_label ? <span>Sample: {report.sample_label}</span> : null}
          </div>
          <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80">
            QE Assistant reads the IS document and your FTR results to check compliance and whether
            the report is OK for submission.
          </p>
        </div>
      }
    />
  );
}
