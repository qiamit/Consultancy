"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AiChatModal } from "@/components/dashboard/ai-chat-modal";
import {
  IsCodeCombobox,
  type IsCodeComboboxOption,
} from "@/components/modules/bis-projects/is-code-combobox";
import { emptyForm as isCodeEmptyForm } from "@/components/modules/is-code-master/constants";
import { IsCodeMasterForm } from "@/components/modules/is-code-master/form";
import { formatIsCodeRevisionLabel } from "@/components/modules/test-parameter-master/constants";
import type { ChatMessage } from "@/lib/actions/ai-chat";
import { loadTestParameterAssistantData } from "@/lib/actions/test-parameter-assistant";
import {
  handleTestParameterAssistantMessage,
  runTestParameterImportForSelectedIsCode,
} from "@/lib/actions/test-parameter-import-from-is";
import type { IsCodeFormDropdownOptions } from "@/lib/data/is-code-form-dropdowns";

const MODULE_CONFIG = {
  title: "QE Assistant",
  subtitle: "Test Parameter · AI Powered",
  systemPrompt: `You are QE Assistant, an AI helper for Quality Engineering Consultancy's Test Parameter management.
You help with:
- Test parameters linked to Indian Standard (IS) codes
- Clause numbers, test methods, units, and specified values
- Mapping lab tests to IS code requirements
- BIS certification testing scope and compliance

To bulk-add test parameters: select an IS code above, then click "Import test parameters" or send a message like "Add test parameters for IS 6988:2017".
The app reads the uploaded IS document from IS Code Master and adds extracted parameters automatically.

Be concise, practical, and use Indian BIS/ISI certification context.`,
  starters: [
    "Add test parameters for the selected IS code",
    "What is a clause number in IS standards?",
    "How are specified values used in BIS testing?",
  ],
};

export function TestParameterQeAssistantModal({
  onClose,
}: {
  onClose: () => void;
}) {
  const router = useRouter();
  const [isCodeOptions, setIsCodeOptions] = useState<IsCodeComboboxOption[]>(
    [],
  );
  const [isCodeFormDropdowns, setIsCodeFormDropdowns] =
    useState<IsCodeFormDropdownOptions | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedIsCodeId, setSelectedIsCodeId] = useState("");
  const [selectedModelId, setSelectedModelId] = useState("");
  const [embedIsCodeOpen, setEmbedIsCodeOpen] = useState(false);
  const [embedIsCodeForm, setEmbedIsCodeForm] = useState(() =>
    isCodeEmptyForm(),
  );
  const [importing, startImport] = useTransition();
  const [importFeedback, setImportFeedback] = useState<string | null>(null);

  const reloadIsCodeOptions = useCallback(async () => {
    const data = await loadTestParameterAssistantData();
    setIsCodeOptions(data.isCodeOptions);
    setIsCodeFormDropdowns(data.isCodeFormDropdowns);
    setLoadingData(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const data = await loadTestParameterAssistantData();
      if (cancelled) return;
      setIsCodeOptions(data.isCodeOptions);
      setIsCodeFormDropdowns(data.isCodeFormDropdowns);
      setLoadingData(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleCustomSend = useCallback(
    async (text: string, _messages: ChatMessage[], modelId: string | undefined) => {
      setImportFeedback(null);
      const importResult = await handleTestParameterAssistantMessage(
        text,
        modelId,
        selectedIsCodeId || undefined,
      );
      if (importResult.handled) {
        if (importResult.refreshPage) {
          router.refresh();
          window.dispatchEvent(new CustomEvent("test-parameters:refresh"));
        }
        return {
          reply: importResult.reply,
          refreshPage: importResult.refreshPage,
        };
      }
      return null;
    },
    [router, selectedIsCodeId],
  );

  function handleImportClick() {
    if (!selectedIsCodeId || importing) return;
    setImportFeedback(null);
    startImport(async () => {
      const result = await runTestParameterImportForSelectedIsCode(
        selectedIsCodeId,
        selectedModelId || undefined,
      );
      if (!result.ok) {
        setImportFeedback(result.reply);
        return;
      }
      router.refresh();
      window.dispatchEvent(new CustomEvent("test-parameters:refresh"));
      setImportFeedback(result.reply);
    });
  }

  const selectedLabel =
    isCodeOptions.find((o) => o.id === selectedIsCodeId)?.label ?? "";

  return (
    <>
      <AiChatModal
        title={MODULE_CONFIG.title}
        subtitle={MODULE_CONFIG.subtitle}
        systemPrompt={MODULE_CONFIG.systemPrompt}
        starterQuestions={MODULE_CONFIG.starters}
        accentColor="violet"
        onClose={onClose}
        onCustomSend={handleCustomSend}
        onModelChange={setSelectedModelId}
        inputPlaceholder="Ask a question or type “Add test parameters”…"
        beforeInput={
          <div className="mb-3 space-y-2">
            <div className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
              <IsCodeCombobox
                name="qe_assistant_is_code"
                label="IS Code"
                value={selectedIsCodeId}
                onChange={setSelectedIsCodeId}
                options={isCodeOptions}
                disabled={loadingData}
                listZIndexClass="z-[210]"
                onAddClick={() => {
                  setEmbedIsCodeForm(isCodeEmptyForm());
                  setEmbedIsCodeOpen(true);
                }}
                addButtonAriaLabel="Add new IS code"
              />
              <button
                type="button"
                disabled={!selectedIsCodeId || importing || loadingData}
                onClick={handleImportClick}
                className="mt-2 w-full rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-violet-700 dark:hover:bg-violet-600"
              >
                {importing
                  ? "Reading IS file & importing…"
                  : selectedLabel
                    ? `Import test parameters from ${selectedLabel}`
                    : "Import test parameters from IS file"}
              </button>
              {importFeedback ? (
                <p
                  className={`mt-2 whitespace-pre-wrap text-xs ${
                    importFeedback.startsWith("Done.")
                      ? "text-emerald-700 dark:text-emerald-400"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {importFeedback}
                </p>
              ) : null}
            </div>
          </div>
        }
      />

      {embedIsCodeOpen && isCodeFormDropdowns ? (
        <div
          className="fixed inset-0 z-[220] flex items-start justify-center overflow-y-auto bg-zinc-950/50 p-4 pt-10 sm:pt-16 dark:bg-black/55"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEmbedIsCodeOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="is-code-master-form-title"
            className="mb-10 w-full max-w-5xl rounded-xl border-[4mm] border-zinc-300 bg-zinc-50 shadow-2xl dark:border-zinc-600 dark:bg-zinc-900 dark:shadow-black/40"
            onClick={(e) => e.stopPropagation()}
          >
            <IsCodeMasterForm
              visible
              overlay
              formValues={embedIsCodeForm}
              isNewParam
              idParam={null}
              existingFiles={[]}
              onClose={() => setEmbedIsCodeOpen(false)}
              onAddNew={() => setEmbedIsCodeForm(isCodeEmptyForm())}
              onUpdateField={(key, value) =>
                setEmbedIsCodeForm((f) => ({ ...f, [key]: value }))
              }
              aspectOptions={isCodeFormDropdowns.aspectOptions}
              unitOptions={isCodeFormDropdowns.unitOptions}
              embeddedInBis
              onEmbeddedSaveSuccess={(id) => {
                const savedLabel = formatIsCodeRevisionLabel(
                  embedIsCodeForm.is_number,
                  embedIsCodeForm.revision_year
                    ? Number(embedIsCodeForm.revision_year)
                    : undefined,
                );
                void reloadIsCodeOptions().then(() => {
                  setSelectedIsCodeId(id);
                  setIsCodeOptions((prev) => {
                    if (prev.some((o) => o.id === id)) return prev;
                    return [
                      ...prev,
                      {
                        id,
                        label: savedLabel,
                        filterText: `${embedIsCodeForm.is_number} ${embedIsCodeForm.is_code_title ?? ""}`,
                      },
                    ];
                  });
                });
                setEmbedIsCodeOpen(false);
                router.refresh();
              }}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
