"use client";

import { useCallback, useEffect, useState } from "react";
import { AiChatModal } from "@/components/dashboard/ai-chat-modal";
import {
  getSubcontractedTestsAssistantIsCodeStatus,
  handleSubcontractedTestsAssistantMessage,
} from "@/lib/actions/subcontracted-tests-assistant";
import type { ChatMessage } from "@/lib/actions/ai-chat";
import type { SubcontractedTestStored, SubcontractedTestsDocumentStored } from "@/lib/subcontracted-tests";
import { rowHasContent } from "@/lib/subcontracted-tests";

const SUBCONTRACTED_QE_STARTERS = [
  "Which test parameters should we subcontract for this IS?",
  "Review my subcontracted tests list for BIS submission",
  "What BIS requirements apply to subcontracted testing?",
];

export function SubcontractedTestsQeAssistantModal({
  isCodeId,
  isReference,
  isTitle,
  companyName,
  rows,
  document,
  onClose,
}: {
  isCodeId: string | null;
  isReference: string;
  isTitle: string;
  companyName: string;
  rows: SubcontractedTestStored[];
  document: SubcontractedTestsDocumentStored;
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
    void getSubcontractedTestsAssistantIsCodeStatus(isCodeId).then((status) => {
      if (cancelled) return;
      setFileStatus({ loading: false, ...status });
    });
    return () => {
      cancelled = true;
    };
  }, [isCodeId]);

  const testCount = rows.filter(rowHasContent).length;

  const handleCustomSend = useCallback(
    async (text: string, messages: ChatMessage[], modelId: string | undefined) => {
      const res = await handleSubcontractedTestsAssistantMessage(text, messages, modelId, {
        isCodeId,
        isReference,
        isTitle,
        companyName,
        rows,
        document,
      });
      if (!res.ok) {
        return { reply: `⚠️ ${res.error}` };
      }
      return { reply: res.reply };
    },
    [isCodeId, isReference, isTitle, companyName, rows, document],
  );

  return (
    <AiChatModal
      title="QE Assistant"
      subtitle="Test Subcontracted · BIS Declaration"
      systemPrompt=""
      starterQuestions={SUBCONTRACTED_QE_STARTERS}
      accentColor="amber"
      overlayZIndexClass="z-[500]"
      onClose={onClose}
      onCustomSend={handleCustomSend}
      inputPlaceholder="Ask about subcontracted tests, labs, or declaration wording…"
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
            <span>Subcontracted rows: {testCount}</span>
          </div>
          <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80">
            QE Assistant reads the IS document and your subcontracted test list to suggest parameters,
            review completeness, and help with BIS declaration wording.
          </p>
        </div>
      }
    />
  );
}
