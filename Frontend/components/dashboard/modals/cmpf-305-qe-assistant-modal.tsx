"use client";

import { useCallback, useEffect, useState } from "react";
import { AiChatModal } from "@/components/dashboard/ai-chat-modal";
import {
  getCmpf305AssistantIsCodeStatus,
  handleCmpf305AssistantMessage,
} from "@backend/actions/cmpf-305-assistant";
import type { ChatMessage } from "@backend/actions/ai-chat";
import { rowHasContent, type Cmpf305MachineryStored } from "@backend/modules/bis/cmpf-305";

const CMPF305_QE_STARTERS = [
  "What plant and machinery should we list for this IS?",
  "Review my CMPF 305 machinery list for BIS submission",
  "What production capacity details does BIS expect on Form I?",
];

export function Cmpf305QeAssistantModal({
  isCodeId,
  isReference,
  isTitle,
  companyName,
  applicationNumber,
  firmRepName,
  firmRepDesignation,
  rows,
  onClose,
}: {
  isCodeId: string | null;
  isReference: string;
  isTitle: string;
  companyName: string;
  applicationNumber: string;
  firmRepName: string;
  firmRepDesignation: string;
  rows: Cmpf305MachineryStored[];
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
    void getCmpf305AssistantIsCodeStatus(isCodeId).then((status) => {
      if (cancelled) return;
      setFileStatus({ loading: false, ...status });
    });
    return () => {
      cancelled = true;
    };
  }, [isCodeId]);

  const machineryCount = rows.filter(rowHasContent).length;

  const handleCustomSend = useCallback(
    async (text: string, messages: ChatMessage[], modelId: string | undefined) => {
      const res = await handleCmpf305AssistantMessage(text, messages, modelId, {
        isCodeId,
        isReference,
        isTitle,
        companyName,
        applicationNumber,
        firmRepName,
        firmRepDesignation,
        rows,
      });
      if (!res.ok) {
        return { reply: `⚠️ ${res.error}` };
      }
      return { reply: res.reply };
    },
    [
      isCodeId,
      isReference,
      isTitle,
      companyName,
      applicationNumber,
      firmRepName,
      firmRepDesignation,
      rows,
    ],
  );

  return (
    <AiChatModal
      title="QE Assistant"
      subtitle="CMPF 305 · Plant & Machinery"
      systemPrompt=""
      starterQuestions={CMPF305_QE_STARTERS}
      accentColor="amber"
      overlayZIndexClass="z-[500]"
      onClose={onClose}
      onCustomSend={handleCustomSend}
      inputPlaceholder="Ask about plant, machinery, or CMPF 305 Form I…"
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
            <span>Machinery rows: {machineryCount}</span>
            {firmRepName ? <span>Firm rep: {firmRepName}</span> : null}
          </div>
          <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80">
            QE Assistant reads the IS document and your machinery list to suggest equipment, review
            completeness, and help with CMPF 305 Form I for BIS factory inspection.
          </p>
        </div>
      }
    />
  );
}
