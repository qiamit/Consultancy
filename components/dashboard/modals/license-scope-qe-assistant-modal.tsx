"use client";

import { useCallback, useEffect, useState } from "react";
import { AiChatModal } from "@/components/dashboard/ai-chat-modal";
import {
  getLicenseScopeAssistantIsCodeStatus,
  handleLicenseScopeAssistantMessage,
} from "@/lib/actions/license-scope-assistant";
import type { ChatMessage } from "@/lib/actions/ai-chat";
import type { LicenseScopeFormat } from "@/lib/license-scope-format";
import {
  applyLicenseScopeUpdate,
  parseLicenseScopeAssistantReply,
} from "@/lib/license-scope-assistant";

const LICENSE_SCOPE_STARTERS = [
  "Draft license scope for this IS and apply it to the editor",
  "Rewrite my license scope for clearer BIS compliance",
  "Review my current scope and suggest improvements",
];

export function LicenseScopeQeAssistantModal({
  isCodeId,
  isReference,
  isTitle,
  companyName,
  licenseScopeFormat,
  plainScope,
  tableRows,
  onApplyUpdate,
  onClose,
}: {
  isCodeId: string | null;
  isReference: string;
  isTitle: string;
  companyName: string;
  licenseScopeFormat: LicenseScopeFormat;
  plainScope: string;
  tableRows: { component: string; value: string }[];
  onApplyUpdate: (
    update: Parameters<typeof applyLicenseScopeUpdate>[0],
  ) => void;
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
    void getLicenseScopeAssistantIsCodeStatus(isCodeId).then((status) => {
      if (cancelled) return;
      setFileStatus({ loading: false, ...status });
    });
    return () => {
      cancelled = true;
    };
  }, [isCodeId]);

  const scopePreview =
    licenseScopeFormat === "plain"
      ? plainScope.trim() || "(empty)"
      : tableRows.filter((r) => r.component.trim() || r.value.trim()).length > 0
        ? `${tableRows.filter((r) => r.component.trim() || r.value.trim()).length} table row(s)`
        : "(empty)";

  const handleCustomSend = useCallback(
    async (text: string, messages: ChatMessage[], modelId: string | undefined) => {
      const res = await handleLicenseScopeAssistantMessage(text, messages, modelId, {
        isCodeId,
        isReference,
        isTitle,
        companyName,
        format: licenseScopeFormat,
        plainScope,
        tableRows,
      });
      if (!res.ok) {
        return { reply: `⚠️ ${res.error}` };
      }

      const { displayReply, update } = parseLicenseScopeAssistantReply(res.reply);
      if (update) {
        onApplyUpdate(update);
        const appliedNote =
          "\n\n✅ **Applied to license scope editor.** Review the editor and click Save when ready.";
        return { reply: (displayReply || "Updated license scope.") + appliedNote };
      }

      return { reply: displayReply };
    },
    [
      isCodeId,
      isReference,
      isTitle,
      companyName,
      licenseScopeFormat,
      plainScope,
      tableRows,
      onApplyUpdate,
    ],
  );

  return (
    <AiChatModal
      title="QE Assistant"
      subtitle="License Scope · Draft & Apply"
      systemPrompt=""
      starterQuestions={LICENSE_SCOPE_STARTERS}
      accentColor="amber"
      overlayZIndexClass="z-[500]"
      onClose={onClose}
      onCustomSend={handleCustomSend}
      inputPlaceholder="Ask to draft, rewrite, or update license scope…"
      beforeInput={
        <div className="mb-3 space-y-2 rounded-lg border border-amber-200/60 bg-amber-50/80 px-3 py-2.5 text-xs dark:border-amber-900/50 dark:bg-amber-950/20">
          <p className="font-semibold text-amber-900 dark:text-amber-200">
            {isReference !== "—" ? isReference : "IS code not linked"}
            {isTitle ? ` · ${isTitle}` : ""}
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-amber-800/90 dark:text-amber-300/90">
            <span>Format: {licenseScopeFormat === "table" ? "Table" : "Plain text"}</span>
            <span>
              IS files:{" "}
              {fileStatus.loading
                ? "Loading…"
                : fileStatus.hasFiles
                  ? `${fileStatus.fileCount} uploaded${fileStatus.fileName ? ` (${fileStatus.fileName})` : ""}`
                  : "None — upload in IS Code Master"}
            </span>
            <span>Current scope: {scopePreview}</span>
          </div>
          <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80">
            QE Assistant can read the IS document and your current scope, then draft or rewrite
            license scope text and apply it directly to the editor when you ask.
          </p>
        </div>
      }
    />
  );
}
