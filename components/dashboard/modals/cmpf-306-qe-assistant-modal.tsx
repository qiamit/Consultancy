"use client";

import { useCallback, useEffect, useState } from "react";
import { AiChatModal } from "@/components/dashboard/ai-chat-modal";
import {
  getCmpf306AssistantIsCodeStatus,
  handleCmpf306AssistantMessage,
} from "@/lib/actions/cmpf-306-assistant";
import type { ChatMessage } from "@/lib/actions/ai-chat";
import { equipmentRowHasContent, type Cmpf306EquipmentStored } from "@/lib/cmpf-306";

const CMPF306_QE_STARTERS = [
  "What test equipment should we list for this IS?",
  "Review my CMPF 306 equipment list for BIS submission",
  "What calibration details does BIS expect on Form II?",
];

export function Cmpf306QeAssistantModal({
  isCodeId,
  isReference,
  isTitle,
  companyName,
  applicationNumber,
  firmRepName,
  firmRepDesignation,
  equipment,
  onClose,
}: {
  isCodeId: string | null;
  isReference: string;
  isTitle: string;
  companyName: string;
  applicationNumber: string;
  firmRepName: string;
  firmRepDesignation: string;
  equipment: Cmpf306EquipmentStored[];
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
    void getCmpf306AssistantIsCodeStatus(isCodeId).then((status) => {
      if (cancelled) return;
      setFileStatus({ loading: false, ...status });
    });
    return () => {
      cancelled = true;
    };
  }, [isCodeId]);

  const equipmentCount = equipment.filter(equipmentRowHasContent).length;

  const handleCustomSend = useCallback(
    async (text: string, messages: ChatMessage[], modelId: string | undefined) => {
      const res = await handleCmpf306AssistantMessage(text, messages, modelId, {
        isCodeId,
        isReference,
        isTitle,
        companyName,
        applicationNumber,
        firmRepName,
        firmRepDesignation,
        equipment,
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
      equipment,
    ],
  );

  return (
    <AiChatModal
      title="QE Assistant"
      subtitle="CMPF 306 · Testing Equipments"
      systemPrompt=""
      starterQuestions={CMPF306_QE_STARTERS}
      accentColor="amber"
      overlayZIndexClass="z-[500]"
      onClose={onClose}
      onCustomSend={handleCustomSend}
      inputPlaceholder="Ask about test equipment, chemicals, or CMPF 306 Form II…"
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
            <span>Equipment rows: {equipmentCount}</span>
            {firmRepName ? <span>Firm rep: {firmRepName}</span> : null}
          </div>
          <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80">
            QE Assistant reads the IS document and your equipment list to suggest test equipment,
            review completeness, and help with CMPF 306 Form II for BIS factory inspection.
          </p>
        </div>
      }
    />
  );
}
