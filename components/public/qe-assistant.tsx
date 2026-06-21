"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";

const WA_PATH = "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z";

interface Message {
  role: "user" | "assistant";
  content: string;
  quick?: string[];
}

const QUICK_STARTERS = [
  "Does my product need BIS certification?",
  "How long does BIS ISI Mark take?",
  "What is NABL accreditation?",
  "ISO 9001 certification process?",
  "CE Marking for export to Europe",
];

const FALLBACK = "I'm having trouble connecting to AI right now. Please WhatsApp us at +91 9009413040 or ask me another way — our team responds within 2 hours!";

export function QEAssistant() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [pulse, setPulse] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const isHomepage = pathname === "/";
  const isAboutPage = pathname === "/about";
  const isDashboard = pathname.startsWith("/dashboard");
  const hasCustomTrigger = isHomepage || isAboutPage || pathname.startsWith("/services/");
  const hideFloatingTrigger = hasCustomTrigger;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    const t = setTimeout(() => setPulse(false), 6000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const handler = () => {
      setOpen(true);
      if (messages.length === 0) showWelcome();
    };
    window.addEventListener("open-qe-assistant", handler);
    return () => window.removeEventListener("open-qe-assistant", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  useEffect(() => {
    if (open && messages.length === 0) showWelcome();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  const showWelcome = () => {
    setMessages([{
      role: "assistant",
      content: "👋 Namaste! I'm **QE Assistant** — your AI guide for BIS certification, NABL accreditation, ISO standards, and more.\n\nAsk me anything in English or Hindi, or pick a topic below:",
      quick: QUICK_STARTERS,
    }]);
  };

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: "user", content: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const history = [...messages, userMsg]
        .filter(m => !m.quick)
        .map(m => ({ role: m.role, content: m.content }));

      const res = await fetch("/api/qe-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });

      const data = await res.json();

      if (data.fallback || data.error) {
        setMessages(prev => [...prev, { role: "assistant", content: FALLBACK }]);
      } else {
        setMessages(prev => [...prev, {
          role: "assistant",
          content: data.text,
          quick: prev.length > 6 ? undefined : ["Tell me about your services", "How to get started?", "Contact the team"],
        }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: FALLBACK }]);
    } finally {
      setLoading(false);
    }
  }, [loading, messages]);

  const startVoice = () => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      alert("Voice input is not supported in your browser. Please use Chrome.");
      return;
    }
    const SR = (window as Window & { webkitSpeechRecognition?: typeof SpeechRecognition; SpeechRecognition?: typeof SpeechRecognition }).SpeechRecognition ||
               (window as Window & { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = "hi-IN,en-IN";
    rec.continuous = false;
    rec.interimResults = true;
    rec.onstart = () => setListening(true);
    rec.onresult = (e: SpeechRecognitionEvent) => {
      const transcript = Array.from(e.results).map(r => r[0].transcript).join("");
      setInput(transcript);
      if (e.results[e.results.length - 1].isFinal) {
        rec.stop();
        sendMessage(transcript);
      }
    };
    rec.onerror = () => { setListening(false); };
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    rec.start();
  };

  const stopVoice = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  function renderContent(text: string) {
    return text.split("\n").map((line, i) => {
      const parts = line.split(/\*\*(.*?)\*\*/g);
      const formatted = parts.map((p, j) =>
        j % 2 === 1 ? <strong key={j} className="text-zinc-900 dark:text-white font-bold">{p}</strong> : p
      );
      if (!line.trim()) return <div key={i} className="h-1" />;
      return <p key={i} className="leading-relaxed">{formatted}</p>;
    });
  }

  if (isDashboard) return null;

  return (
    <>
      {/* Floating trigger — hidden on homepage */}

      {/* Chat window */}
      {open && (
        <div
          className="fixed z-[60] flex flex-col rounded-2xl shadow-2xl shadow-black/20 border border-zinc-200 dark:border-zinc-700 overflow-hidden bg-white dark:bg-zinc-900 transition-all bottom-24 right-6 w-[min(380px,calc(100vw-3rem))]"
          style={{ maxHeight: "min(520px, calc(100vh - 10rem))" }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-sky-600 via-sky-500 to-indigo-600 flex-shrink-0">
            <div className="relative">
              <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="white" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-sky-600" />
            </div>
            <div className="flex-1">
              <div className="text-white font-black text-sm">QE Assistant</div>
              <div className="text-blue-200 text-[9px] flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-emerald-400" />
                AI-Powered · Quality Engineering
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setMessages([]); showWelcome(); }}
                title="Reset chat"
                className="text-white/50 hover:text-white p-1 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              <button onClick={() => setOpen(false)} className="text-white/50 hover:text-white p-1 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 scrollbar-thin">
            {messages.map((msg, i) => (
              <div key={i}>
                {msg.role === "assistant" ? (
                  <div className="flex items-start gap-2">
                    <div className="w-6 h-6 bg-sky-600 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="white" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl rounded-tl-sm px-3 py-2.5 text-zinc-700 dark:text-zinc-300 text-xs space-y-0.5 mb-2">
                        {renderContent(msg.content)}
                      </div>
                      {msg.quick && i === messages.length - 1 && !loading && (
                        <div className="flex flex-col gap-1">
                          {msg.quick.map(q => (
                            <button
                              key={q}
                              onClick={() => sendMessage(q)}
                              className="text-left text-[10px] px-2.5 py-1.5 bg-zinc-100 dark:bg-zinc-800/50 hover:bg-sky-600/60 border border-zinc-200 dark:border-zinc-800 hover:border-sky-600/60 text-gray-400 hover:text-white rounded-lg transition-all"
                            >
                              {q}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-end">
                    <div className="bg-gradient-to-br from-sky-600 to-indigo-600 rounded-2xl rounded-tr-sm px-3 py-2 text-white text-xs max-w-[85%]">
                      {msg.content}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 bg-sky-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="white" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div className="bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl rounded-tl-sm px-4 py-3">
                  <div className="flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Voice listening indicator */}
          {listening && (
            <div className="flex-shrink-0 bg-red-900/30 border-t border-red-500/20 px-4 py-2 flex items-center gap-2">
              <div className="flex gap-0.5 items-center">
                {[1,2,3,4,5].map(b => (
                  <div key={b} className="w-0.5 bg-red-400 rounded-full animate-pulse" style={{ height: `${8 + b * 3}px`, animationDelay: `${b * 80}ms` }} />
                ))}
              </div>
              <span className="text-red-300 text-[10px] font-semibold">Listening… speak now</span>
              <button onClick={stopVoice} className="ml-auto text-red-300 hover:text-red-100 text-[10px] font-bold">Stop</button>
            </div>
          )}

          {/* Input area */}
          <div className="flex-shrink-0 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3 py-2.5">
            <div className="flex gap-2 items-end">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Type your question… (Enter to send)"
                rows={1}
                disabled={loading || listening}
                className="flex-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:border-sky-500/50 rounded-xl px-3 py-2 text-zinc-900 dark:text-zinc-100 text-xs placeholder-zinc-400 resize-none focus:outline-none transition-colors leading-relaxed"
                style={{ minHeight: "36px", maxHeight: "80px" }}
                onInput={e => {
                  const t = e.target as HTMLTextAreaElement;
                  t.style.height = "auto";
                  t.style.height = Math.min(t.scrollHeight, 80) + "px";
                }}
              />

              {/* Voice button */}
              <button
                onClick={listening ? stopVoice : startVoice}
                disabled={loading}
                title={listening ? "Stop voice" : "Voice input (Hindi/English)"}
                className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
                  listening
                    ? "bg-red-500 text-white animate-pulse"
                    : "bg-white/8 text-gray-400 hover:bg-white/15 hover:text-white"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </button>

              {/* Send button */}
              <button
                onClick={() => sendMessage(input)}
                disabled={loading || !input.trim()}
                className="w-9 h-9 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white rounded-xl flex items-center justify-center flex-shrink-0 transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between mt-2">
              <span className="text-gray-600 text-[9px]">AI · Quality Engineering</span>
              <a href="https://wa.me/919009413040" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-[9px] text-[#25D366] font-bold hover:text-emerald-400">
                <svg className="w-2.5 h-2.5 fill-current" viewBox="0 0 24 24"><path d={WA_PATH} /></svg>
                Talk to Human
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
