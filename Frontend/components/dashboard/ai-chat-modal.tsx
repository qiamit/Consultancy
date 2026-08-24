"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { sendAiMessage, type ChatMessage } from "@backend/actions/ai-chat";
import { fetchActiveAiModels, type ActiveModelOption } from "@backend/actions/ai-models";

type AccentColor = "amber" | "sky" | "emerald" | "violet";

type AttachedFile = { name: string; content: string };

const ACCENT = {
  amber: {
    headerBg: "from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20",
    iconBg: "bg-amber-500",
    badge: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950/50",
    bubble: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    send: "bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-500",
    icon: "bg-amber-50 dark:bg-amber-950/30",
    iconText: "text-amber-500",
    select: "focus:border-amber-400 focus:ring-amber-200",
  },
  sky: {
    headerBg: "from-sky-50 to-blue-50 dark:from-sky-950/30 dark:to-blue-950/20",
    iconBg: "bg-sky-600",
    badge: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-950/50",
    bubble: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
    send: "bg-sky-600 hover:bg-sky-700 dark:bg-sky-700 dark:hover:bg-sky-600",
    icon: "bg-sky-50 dark:bg-sky-950/30",
    iconText: "text-sky-500",
    select: "focus:border-sky-400 focus:ring-sky-200",
  },
  emerald: {
    headerBg: "from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20",
    iconBg: "bg-emerald-600",
    badge: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-950/50",
    bubble: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    send: "bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600",
    icon: "bg-emerald-50 dark:bg-emerald-950/30",
    iconText: "text-emerald-500",
    select: "focus:border-emerald-400 focus:ring-emerald-200",
  },
  violet: {
    headerBg: "from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/20",
    iconBg: "bg-violet-600",
    badge: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/30 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-950/50",
    bubble: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
    send: "bg-violet-600 hover:bg-violet-700 dark:bg-violet-700 dark:hover:bg-violet-600",
    icon: "bg-violet-50 dark:bg-violet-950/30",
    iconText: "text-violet-500",
    select: "focus:border-violet-400 focus:ring-violet-200",
  },
} satisfies Record<AccentColor, Record<string, string>>;

export function AiChatModal({
  title,
  subtitle,
  systemPrompt,
  starterQuestions,
  accentColor,
  onClose,
  overlayZIndexClass = "z-[200]",
  onCustomSend,
  beforeInput,
  inputPlaceholder,
  onModelChange,
}: {
  title: string;
  subtitle: string;
  systemPrompt: string;
  starterQuestions: string[];
  accentColor: AccentColor;
  onClose: () => void;
  overlayZIndexClass?: string;
  onCustomSend?: (
    text: string,
    messages: ChatMessage[],
    modelId: string | undefined,
  ) => Promise<{ reply: string; refreshPage?: boolean } | null>;
  beforeInput?: React.ReactNode;
  inputPlaceholder?: string;
  onModelChange?: (modelId: string) => void;
}) {
  const accent = ACCENT[accentColor];

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, startSend] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [models, setModels] = useState<ActiveModelOption[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>("");
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [listening, setListening] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Load active models
  useEffect(() => {
    fetchActiveAiModels().then((list) => {
      setModels(list);
      if (list.length > 0) setSelectedModelId(list[0].id);
    });
  }, []);

  useEffect(() => {
    onModelChange?.(selectedModelId);
  }, [selectedModelId, onModelChange]);

  function handleSend() {
    const text = input.trim();
    if (!text || sending) return;

    // Build message content — include file contents if attached
    let content = text;
    if (attachedFiles.length > 0) {
      const fileBlock = attachedFiles
        .map((f) => `\n\n[Attached file: ${f.name}]\n${f.content}`)
        .join("");
      content = text + fileBlock;
    }

    setInput("");
    setAttachedFiles([]);
    setError(null);

    const next: ChatMessage[] = [...messages, { role: "user", content }];
    setMessages(next);

    startSend(async () => {
      if (onCustomSend) {
        const custom = await onCustomSend(
          content,
          next,
          selectedModelId || undefined,
        );
        if (custom) {
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: custom.reply },
          ]);
          if (custom.refreshPage) {
            window.dispatchEvent(new CustomEvent("test-parameters:refresh"));
          }
          setTimeout(
            () => bottomRef.current?.scrollIntoView({ behavior: "smooth" }),
            50,
          );
          return;
        }
      }

      const res = await sendAiMessage(next, systemPrompt, selectedModelId || undefined);
      if (!res.ok) { setError(res.error); return; }
      setMessages((prev) => [...prev, { role: "assistant", content: res.reply }]);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    });
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  // File attachment
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const content = ev.target?.result as string;
        setAttachedFiles((prev) => [...prev, { name: file.name, content }]);
      };
      reader.readAsText(file);
    });
    e.target.value = "";
  }

  function removeFile(name: string) {
    setAttachedFiles((prev) => prev.filter((f) => f.name !== name));
  }

  // Voice input via Web Speech API
  function toggleVoice() {
    const SR =
      (typeof window !== "undefined" &&
        (window.SpeechRecognition || (window as unknown as Record<string, unknown>).webkitSpeechRecognition)) as
        | (new () => SpeechRecognition)
        | undefined;

    if (!SR) {
      setError("Voice input is not supported in this browser.");
      return;
    }

    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const rec = new SR();
    rec.lang = "en-IN";
    rec.interimResults = true;
    rec.continuous = false;
    recognitionRef.current = rec;

    const baseBeforeVoice = input.trim();

    rec.onresult = (e) => {
      let finalText = "";
      let interimText = "";
      for (let i = 0; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalText += e.results[i][0].transcript;
        else interimText += e.results[i][0].transcript;
      }
      const spoken = (finalText || interimText).trim();
      setInput(baseBeforeVoice ? baseBeforeVoice + " " + spoken : spoken);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);

    rec.start();
    setListening(true);
  }

  return (
    <div
      className={`fixed inset-0 ${overlayZIndexClass} flex items-end justify-end bg-black/40 p-4 backdrop-blur-sm sm:items-center sm:justify-center`}
      role="presentation"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="flex h-[70vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900 sm:h-[55vh] sm:max-h-[560px]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div className={`border-b border-zinc-200 bg-gradient-to-r px-5 py-3 dark:border-zinc-700 ${accent.headerBg}`}>
          <div className="flex items-center gap-3">
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-white shadow-sm ${accent.iconBg}`}>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-1.5">
                <h2 className="shrink-0 text-sm font-bold text-zinc-900 dark:text-zinc-100">{title}</h2>
              </div>
            </div>
            {/* Model selector */}
            {models.length > 0 && (
              <select
                value={selectedModelId}
                onChange={(e) => setSelectedModelId(e.target.value)}
                className={`max-w-[180px] shrink rounded-lg border border-zinc-200 bg-white/80 px-2 py-1 text-xs font-medium text-zinc-700 shadow-sm outline-none focus:ring-2 dark:border-zinc-600 dark:bg-zinc-800/80 dark:text-zinc-300 ${accent.select}`}
              >
                {models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.display_name} ({m.provider})
                  </option>
                ))}
              </select>
            )}
            <button type="button" onClick={onClose} className="shrink-0 rounded-lg p-1.5 text-zinc-400 hover:bg-white/80 hover:text-zinc-600 dark:hover:bg-zinc-700 dark:hover:text-zinc-200" aria-label="Close">
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Messages ──────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <div className={`rounded-2xl p-4 ${accent.icon}`}>
                <svg className={`h-8 w-8 ${accent.iconText}`} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">Ask QE Assistant</p>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{subtitle}</p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 mt-1">
                {starterQuestions.map((q) => (
                  <button key={q} type="button" onClick={() => setInput(q)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${accent.badge}`}>
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${m.role === "user" ? "bg-sky-600 text-white" : accent.bubble}`}>
                {m.role === "user" ? "You" : "AI"}
              </div>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${m.role === "user" ? "rounded-tr-sm bg-sky-600 text-white" : "rounded-tl-sm bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100"}`}>
                {m.content}
              </div>
            </div>
          ))}

          {sending && (
            <div className="flex gap-3">
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${accent.bubble}`}>AI</div>
              <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm bg-zinc-100 px-4 py-3 dark:bg-zinc-800">
                <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:0ms]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:150ms]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:300ms]" />
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">{error}</div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* ── Input area ────────────────────────────────────────────────────── */}
        <div className="border-t border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900/80">

          {beforeInput}

          {/* Attached file chips */}
          {attachedFiles.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {attachedFiles.map((f) => (
                <span key={f.name} className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                  <svg className="h-3 w-3 text-zinc-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  {f.name}
                  <button type="button" onClick={() => removeFile(f.name)} className="ml-0.5 text-zinc-400 hover:text-red-500">×</button>
                </span>
              ))}
            </div>
          )}

          {/* Textarea with toolbar inside */}
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder={
                inputPlaceholder ??
                "Type your question… (Enter to send, Shift+Enter for new line)"
              }
              rows={3}
              disabled={sending}
              className="w-full resize-none bg-transparent px-3 pt-3 pb-1 text-sm text-zinc-800 placeholder-zinc-400 outline-none disabled:opacity-50 dark:text-zinc-100"
            />

            {/* Toolbar row */}
            <div className="flex items-center justify-between px-2 pb-2 pt-1">
              <div className="flex items-center gap-1">
                {/* Attach file */}
                <input
                  ref={fileRef}
                  type="file"
                  accept=".txt,.csv,.json,.md,.pdf,.doc,.docx,.xls,.xlsx"
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                />
                <button
                  type="button"
                  title="Attach file"
                  onClick={() => fileRef.current?.click()}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                </button>

                {/* Voice input */}
                <button
                  type="button"
                  title={listening ? "Stop listening" : "Voice input"}
                  onClick={toggleVoice}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                    listening
                      ? "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400"
                      : "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
                  }`}
                >
                  {listening ? (
                    /* animated mic — pulsing dot */
                    <span className="relative flex h-4 w-4 items-center justify-center">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-50" />
                      <svg className="relative h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4M12 3a4 4 0 014 4v4a4 4 0 01-8 0V7a4 4 0 014-4z" />
                      </svg>
                    </span>
                  ) : (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4M12 3a4 4 0 014 4v4a4 4 0 01-8 0V7a4 4 0 014-4z" />
                    </svg>
                  )}
                </button>

                {listening && (
                  <span className="text-xs font-medium text-red-500 dark:text-red-400 animate-pulse">
                    Listening…
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-400 dark:text-zinc-500">Enter to send</span>
                {/* Send button */}
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!input.trim() || sending}
                  aria-label="Send"
                  className={`flex h-8 w-8 items-center justify-center rounded-lg text-white shadow-sm transition-colors disabled:opacity-40 ${accent.send}`}
                >
                  <svg className="h-4 w-4 rotate-90" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
