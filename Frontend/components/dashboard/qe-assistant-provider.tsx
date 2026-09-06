"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AiChatModal } from "@/components/dashboard/ai-chat-modal";
import { TestParameterQeAssistantModal } from "@/components/modules/test-parameter-master/qe-assistant-modal";

type QEModule = "bis-projects" | "is-codes" | "products" | "clients" | string;

const MODULE_CONFIG: Record<string, { title: string; subtitle: string; systemPrompt: string; starters: string[] }> = {
  "bis-projects": {
    title: "QE Assistant",
    subtitle: "BIS Projects · AI Powered",
    systemPrompt: `You are QE Assistant, an AI helper for Quality Engineering Consultancy's BIS License Management.
You help with:
- BIS license status (Operative, Deferred, Expired, Stop Marking)
- License renewal timelines, procedures, and validity tracking
- CM/L number management and marking fee queries
- MANAK Online portal procedures and eBIS login
- Documents required for renewal and fresh applications
- Stop Marking compliance and restoration
- Applying for renewal within 90-day window before/after validity
Be concise, practical, and use Indian BIS/ISI certification context.`,
    starters: [
      "How do I renew a BIS license?",
      "What is Stop Marking and how to restore it?",
      "What is the 90-day renewal window?",
      "Difference between Deferred and Expired?",
    ],
  },
  "bis-license-renewals": {
    title: "QE Assistant",
    subtitle: "BIS License Renewals · AI Powered",
    systemPrompt: `You are QE Assistant, an AI helper for Quality Engineering Consultancy's BIS License Renewal Management.
You help with:
- BIS license renewal timelines and procedures
- License validity tracking and expiry management
- CM/L number and marking fee queries
- Renewal application filing with BIS (Bureau of Indian Standards)
- Documents required for renewal
- MANAK Online portal procedures
- Dealing with expired licenses and emergency renewal steps
- Renewal cost estimation and billing
Be concise, practical, and use Indian BIS/ISI certification context.`,
    starters: [
      "How do I renew a BIS license?",
      "What documents are needed for renewal?",
      "License expired — what are next steps?",
      "How early should I apply for renewal?",
    ],
  },
  "bis-new-applications": {
    title: "QE Assistant",
    subtitle: "BIS Applications · AI Powered",
    systemPrompt: `You are QE Assistant, an AI helper for Quality Engineering Consultancy's BIS Applications Management.
You help with:
- New BIS license applications and procedures
- Application status tracking and follow-ups
- Documents required for fresh applications
- MANAK Online portal filing procedures
- IS code selection and product inclusion
- Application timelines and BIS inspection process
Be concise, practical, and use Indian BIS/ISI certification context.`,
    starters: [
      "How do I apply for a new BIS license?",
      "What documents are needed for a fresh application?",
      "How long does BIS approval take?",
      "What is product inclusion in BIS?",
    ],
  },
  "is-codes": {
    title: "QE Assistant",
    subtitle: "IS Code Master · AI Powered",
    systemPrompt: `You are QE Assistant, an AI helper for Quality Engineering Consultancy's IS Code Management.
You help with:
- Indian Standard (IS) codes and their scope
- Revision years and applicability
- Marking and Monitoring Fee (MMF) slabs and calculation
- Testing charges and lab requirements
- Product inclusion under IS codes
- BIS certification scope and coverage
Be concise, practical, and use Indian BIS/ISI certification context.`,
    starters: [
      "How to find the right IS code for a product?",
      "What is MMF and how is it calculated?",
      "How to add a product under an IS code?",
      "What are slab rates in BIS certification?",
    ],
  },
  "test-parameters": {
    title: "QE Assistant",
    subtitle: "Test Parameter · AI Powered",
    systemPrompt: `You are QE Assistant, an AI helper for Quality Engineering Consultancy's Test Parameter management.
You help with:
- Test parameters linked to Indian Standard (IS) codes
- Clause numbers, test methods, units, and specified values
- Mapping lab tests to IS code requirements
- BIS certification testing scope and compliance

IMPORTANT ACTION:
When the user asks to add/import test parameters for an IS number (e.g. "Add test parameters for IS 6988:2017"),
the app reads the uploaded IS document from IS Code Master and bulk-adds extracted parameters automatically.
Tell users they can say: "Add test parameters for IS 3025:2022" after uploading the IS PDF in IS Code Master.

Be concise, practical, and use Indian BIS/ISI certification context.`,
    starters: [
      "Add test parameters for IS 6988:2017",
      "How do I add a test parameter for an IS code?",
      "What is a clause number in IS standards?",
      "Import all tests from an IS document",
    ],
  },
  "products": {
    title: "QE Assistant",
    subtitle: "Product Master · AI Powered",
    systemPrompt: `You are QE Assistant, an AI helper for Quality Engineering Consultancy's Product Management.
You help with:
- Product catalog management for BIS certification
- MRP, sale price, and billing setup
- Product inclusion and IS code mapping
- HSN codes and GST classification
- Product-level compliance tracking
Be concise, practical, and use Indian BIS/ISI certification context.`,
    starters: [
      "How to map a product to an IS code?",
      "What details are needed for product master?",
      "How does product inclusion work in BIS?",
      "What is HSN code and why is it needed?",
    ],
  },
  "clients": {
    title: "QE Assistant",
    subtitle: "Client Master · AI Powered",
    systemPrompt: `You are QE Assistant, an AI helper for Quality Engineering Consultancy's Client Management.
You help with:
- Client onboarding and account setup
- Company types (Pvt Ltd, LLP, Proprietorship, etc.)
- Company scale classification (Micro, Small, Medium, Large)
- GST registration and compliance details
- Payment terms and opening balance setup
- Client portal credentials for MANAK Online
Be concise, practical, and use Indian BIS/ISI certification context.`,
    starters: [
      "What client details are required for BIS?",
      "How is company scale classified in BIS?",
      "What is the difference between company types?",
      "How to set up payment terms for a client?",
    ],
  },
  "finance-quotation": {
    title: "QE Assistant",
    subtitle: "Quotations · AI Powered",
    systemPrompt: `You are QE Assistant, an AI helper for Quality Engineering Consultancy's Quotation Management.
You help with:
- Creating and managing service/supply quotations
- GST calculation, CGST/SGST/IGST applicability
- Discount and pricing strategies
- Quotation validity and follow-up
- Converting quotations to sales orders or invoices
- Standard terms and conditions for BIS consultancy services
Be concise and practical for Indian GST and BIS consultancy context.`,
    starters: [
      "How to apply GST on a quotation?",
      "What is the difference between CGST, SGST and IGST?",
      "How to convert a quotation to a sales order?",
      "What should be in T&C for BIS consulting?",
    ],
  },
  "finance-proforma": {
    title: "QE Assistant",
    subtitle: "Proforma Invoice · AI Powered",
    systemPrompt: `You are QE Assistant, an AI helper for Quality Engineering Consultancy's Proforma Invoice Management.
You help with:
- Proforma invoice purpose and when to use it
- Advance payment collection against proforma
- GST on proforma invoices
- Converting proforma to tax invoice
- Difference between proforma and tax invoice
Be concise and practical for Indian GST and BIS consultancy context.`,
    starters: [
      "What is a proforma invoice used for?",
      "Can GST be charged on proforma invoice?",
      "How to convert proforma to tax invoice?",
      "When should I raise a proforma vs tax invoice?",
    ],
  },
  "finance-sales-order": {
    title: "QE Assistant",
    subtitle: "Sales Orders · AI Powered",
    systemPrompt: `You are QE Assistant, an AI helper for Quality Engineering Consultancy's Sales Order Management.
You help with:
- Sales order workflow and approval
- Service orders vs supply orders
- Linking sales orders to tax invoices
- Order tracking and status management
- GST applicability on service orders
Be concise and practical for Indian GST and BIS consultancy context.`,
    starters: [
      "What is a sales order workflow?",
      "How to link a sales order to an invoice?",
      "Difference between service and supply orders?",
      "How to track order status?",
    ],
  },
  "finance-tax-invoice": {
    title: "QE Assistant",
    subtitle: "Tax Invoice · AI Powered",
    systemPrompt: `You are QE Assistant, an AI helper for Quality Engineering Consultancy's Tax Invoice Management.
You help with:
- GST invoice mandatory fields and formats
- CGST, SGST, IGST calculation rules
- E-invoicing and IRN requirements
- HSN/SAC code selection for BIS services
- Invoice amendment and cancellation rules
- Input tax credit (ITC) implications
Be concise and practical for Indian GST compliance context.`,
    starters: [
      "What are mandatory fields in a GST tax invoice?",
      "Which SAC code for BIS certification services?",
      "When is e-invoicing required?",
      "Can I amend or cancel a tax invoice?",
    ],
  },
  "finance-credit-note": {
    title: "QE Assistant",
    subtitle: "Credit Notes · AI Powered",
    systemPrompt: `You are QE Assistant, an AI helper for Quality Engineering Consultancy's Credit Note Management.
You help with:
- When and how to issue credit notes
- GST credit note rules and time limits
- Adjusting credit notes against future invoices
- Impact on GST returns (GSTR-1, GSTR-3B)
- Difference between credit note and refund
Be concise and practical for Indian GST compliance context.`,
    starters: [
      "When should I issue a credit note?",
      "What is the time limit for GST credit note?",
      "How does credit note affect GSTR-1?",
      "Credit note vs refund — what is the difference?",
    ],
  },
  "finance-customer-statement": {
    title: "QE Assistant",
    subtitle: "Customer Statements · AI Powered",
    systemPrompt: `You are QE Assistant, an AI helper for Quality Engineering Consultancy's Customer Statement Management.
You help with:
- Customer account reconciliation
- Outstanding invoice tracking
- Payment follow-up strategies
- Ageing analysis and overdue management
- Statement of account preparation and sharing
Be concise and practical for Indian accounting and collections context.`,
    starters: [
      "How to reconcile a customer account?",
      "How do I follow up on overdue payments?",
      "What is ageing analysis?",
      "How to prepare a statement of account?",
    ],
  },
  "finance-payment-in": {
    title: "QE Assistant",
    subtitle: "Payment IN · AI Powered",
    systemPrompt: `You are QE Assistant, an AI helper for Quality Engineering Consultancy's Payment Receipt Management.
You help with:
- Recording customer payments (bank, UPI, cheque, NEFT/RTGS)
- Payment reconciliation with invoices
- Part payments and advance payments
- TDS deduction on payments
- Payment receipt and acknowledgement
Be concise and practical for Indian accounting context.`,
    starters: [
      "How to record a bank transfer payment?",
      "How to handle part payment from a client?",
      "What is TDS and when does it apply?",
      "How to reconcile payment with invoice?",
    ],
  },
  "finance-payment-out": {
    title: "QE Assistant",
    subtitle: "Payment OUT · AI Powered",
    systemPrompt: `You are QE Assistant, an AI helper for Quality Engineering Consultancy's Payment Voucher Management.
You help with:
- Recording vendor and expense payments
- Payment modes (bank, UPI, cash, cheque)
- Expense categorization and documentation
- TDS on vendor payments
- Payment approval workflow
Be concise and practical for Indian accounting context.`,
    starters: [
      "How to record a vendor payment?",
      "What documents are needed for payment voucher?",
      "When is TDS applicable on vendor payments?",
      "How to categorize business expenses?",
    ],
  },
};

const DEFAULT_CONFIG = {
  title: "QE Assistant",
  subtitle: "Quality Engineering · AI Powered",
  systemPrompt: `You are QE Assistant, an AI helper for Quality Engineering Consultancy.
You help with BIS certification, IS codes, license management, and client compliance.
Be concise, practical, and use Indian BIS/ISI certification context.`,
  starters: [
    "What is BIS certification?",
    "How does ISI mark work?",
    "What is the BIS license renewal process?",
    "How to apply for a new BIS license?",
  ],
};

export function QEAssistantProvider() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [module, setModule] = useState<QEModule>("bis-projects");

  useEffect(() => {
    function handleRefresh() {
      if (window.location.pathname.includes("/dashboard/test-parameters")) {
        router.refresh();
      }
    }
    window.addEventListener("test-parameters:refresh", handleRefresh);
    return () =>
      window.removeEventListener("test-parameters:refresh", handleRefresh);
  }, [router]);

  useEffect(() => {
    function handleOpen(e: Event) {
      const detail = (e as CustomEvent<{ module?: string }>).detail;
      setModule(detail?.module ?? "bis-projects");
      setOpen(true);
    }
    window.addEventListener("qe-assistant:open", handleOpen);
    return () => window.removeEventListener("qe-assistant:open", handleOpen);
  }, []);

  if (!open) return null;

  if (module === "test-parameters") {
    return <TestParameterQeAssistantModal onClose={() => setOpen(false)} />;
  }

  const cfg = MODULE_CONFIG[module] ?? DEFAULT_CONFIG;

  return (
    <AiChatModal
      title={cfg.title}
      subtitle={cfg.subtitle}
      systemPrompt={cfg.systemPrompt}
      starterQuestions={cfg.starters}
      accentColor="violet"
      onClose={() => setOpen(false)}
    />
  );
}
