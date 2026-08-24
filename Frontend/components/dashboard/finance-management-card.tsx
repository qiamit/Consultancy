"use client";

import Link from "next/link";
import { useState } from "react";
import { AiChatModal } from "@/components/dashboard/ai-chat-modal";

const FINANCE_SYSTEM_PROMPT = `You are QE Assistant, an AI helper for Quality Engineering Consultancy's Finance Management.
You help with:
- Quotations: drafting, pricing, and follow-ups
- Sales Orders: processing and tracking
- Tax Invoices (GST): GST calculations, invoice formats, compliance
- Proforma Invoices: pre-shipment estimates
- Credit Notes: adjustments and refunds
- Customer Statements: account summaries and reconciliation

Be concise, practical, and use Indian business/GST context where relevant.`;

const FINANCE_STARTERS = [
  "How do I create a GST invoice?",
  "What is a proforma invoice?",
  "When should I issue a credit note?",
  "Explain customer statement",
];

type FinanceModule = {
  label: string;
  count: number;
  href: string;
  color: string;
  bg: string;
};

export function FinanceManagementCard({ modules }: { modules: FinanceModule[] }) {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <>
      <section className="rounded-2xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-white">
              Finance Management
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              Quotations, invoices, orders, and credit notes
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setChatOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3.5 py-2 text-sm font-semibold text-amber-700 shadow-sm transition-colors hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-300 dark:hover:bg-amber-950/50"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              Ask QE Assistant
            </button>
            <Link
              href="/dashboard/finance"
              className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-500 dark:bg-sky-700 dark:hover:bg-sky-600"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Open Finance
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-px bg-zinc-100 dark:bg-zinc-800 sm:grid-cols-3 lg:grid-cols-6">
          {modules.map((m) => (
            <Link
              key={m.href}
              href={m.href}
              className="group flex flex-col gap-1.5 bg-white px-4 py-4 transition-colors hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800/60"
            >
              <span className={`text-xs font-semibold ${m.color}`}>{m.label}</span>
              <span className={`inline-flex w-fit rounded-full px-2 py-0.5 text-xs font-bold tabular-nums ${m.bg} ${m.color}`}>
                {m.count}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {chatOpen && (
        <AiChatModal
          title="QE Assistant"
          subtitle="Finance Management · AI Powered"
          systemPrompt={FINANCE_SYSTEM_PROMPT}
          starterQuestions={FINANCE_STARTERS}
          accentColor="amber"
          onClose={() => setChatOpen(false)}
        />
      )}
    </>
  );
}
