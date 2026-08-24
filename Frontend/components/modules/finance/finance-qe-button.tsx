"use client";

import { useState } from "react";
import { AiChatModal } from "@/components/dashboard/ai-chat-modal";

const SYSTEM_PROMPT = `You are QE Assistant, an AI helper for Quality Engineering Consultancy's Finance Management.
You help with:
- Sales: Quotations, Sales Orders, Proforma Invoices, Tax Invoices, Credit Notes, Payment IN, Customer Statements
- Purchase: Purchase Requisitions, Purchase Orders, Purchase Invoices, Debit Notes, Payment OUT, Expense Management
- Accounting & Banking: Chart of Accounts, Journal Entries, General Ledger, Bank Reconciliation, Cash/Bank Book
- Financial Reports: Trial Balance, P&L Statement, Balance Sheet, Accounts Receivable/Payable, Cash Flow Statement
- Taxation: GST/VAT Reports, TDS/TCS Management, Audit Logs
- GST compliance, invoice numbering, TDS deduction, reconciliation procedures
Be concise, practical, and use Indian accounting and GST context.`;

const STARTERS = [
  "How do I create a GST-compliant tax invoice?",
  "What is the difference between Proforma and Tax Invoice?",
  "How to reconcile bank statements?",
  "How is TDS calculated and deducted?",
];

export function FinanceQEButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg bg-violet-600/20 px-3 py-1.5 text-xs font-semibold text-violet-300 ring-1 ring-violet-500/40 transition hover:bg-violet-600/30 hover:text-violet-200"
      >
        <span className="text-sm">✦</span>
        QE Assistant
      </button>

      {open && (
        <AiChatModal
          title="QE Assistant"
          subtitle="Finance · AI Powered"
          systemPrompt={SYSTEM_PROMPT}
          starterQuestions={STARTERS}
          accentColor="violet"
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
