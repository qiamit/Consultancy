"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { createClient } from "@backend/db/client/client";
import Link from "next/link";
import { FinanceManagementCard } from "@/components/dashboard/finance-management-card";
import { PendingRenewalsSection } from "@/components/dashboard/pending-renewals-section";
import { PendingApplicationsSection } from "@/components/dashboard/pending-applications-section";
import { SurveillanceSection, type SurveillanceRow } from "@/components/dashboard/surveillance-section";
import { AiChatModal } from "@/components/dashboard/ai-chat-modal";
import { formatDisplayDate } from "@backend/shared/format-date";
import {
  syncStopMarkingFromManak,
  type SyncStopMarkingResult,
} from "@backend/actions/stop-marking-sync";
import { MANAK_STOP_MARKING_REPORT_URL } from "@backend/modules/bis/manak-online-portal";

// ── Types ─────────────────────────────────────────────────────────────────────
type FinanceModule = {
  label: string;
  count: number;
  href: string;
  color: string;
  bg: string;
};

type RenewalRow = {
  id: string;
  title: string;
  status: string;
  project_kind: string;
  cm_l_digits: string | null;
  license_number: string | null;
  license_validity_date: string | null;
  target_date: string | null;
  client_id: string | null;
  client_name: string;
  client_email?: string | null;
  is_number: string | null;
  is_revision_year: number | null;
  is_code_title: string | null;
  is_code_id: string | null;
  notes: string | null;
};

type ApplicationRow = {
  id: string;
  title: string;
  status: string;
  project_kind: string;
  created_at: string | null;
  target_date: string | null;
  client_id: string | null;
  cm_l_digits: string | null;
  license_validity_date: string | null;
  client_name: string;
  is_number: string | null;
  is_revision_year: number | null;
  is_code_title: string | null;
  is_code_id: string | null;
  notes: string | null;
  source?: "bis_projects" | "bis_new_applications";
};

type BisRow = {
  id: string;
  title: string;
  status: string;
  license_number: string | null;
  license_validity_date: string | null;
  target_date: string | null;
  client_name: string;
};

type Stats = {
  totalClients: number;
  totalIsCodes: number;
  totalProducts: number;
};

// ── Tab config ────────────────────────────────────────────────────────────────
const TABS = [
  { id: "general",      label: "General"      },
  { id: "finance",      label: "Finance"      },
  { id: "renewals",     label: "Renewal"      },
  { id: "deferred",     label: "Deferred"     },
  { id: "stop_marking", label: "Stop Marking" },
  { id: "applications", label: "Applications" },
  { id: "surveillance", label: "Surveillance" },
  { id: "expired",      label: "Expired"      },
];
const TAB_IDS = new Set(TABS.map((t) => t.id));

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(dateStr: string | null): string {
  return formatDisplayDate(dateStr);
}

// ── Generic BIS table (Deferred / Cancelled) ──────────────────────────────────
// Blue for Deferred matches the date-based status color used in the table
const DEFERRED_PROMPT = `You are QE Assistant for BIS Deferred License Management.
Help with:
- Reasons for license deferral and next steps
- Documents needed to reactivate a deferred license
- BIS deferral timelines and penalties
- Reapplication procedures after deferral
Use Indian BIS/ISI certification context.`;

const EXPIRED_PROMPT = `You are QE Assistant for BIS Expired License Management.
Help with:
- How to apply for a fresh BIS license after expiry
- Documents needed for fresh application
- BIS fresh application process and timelines
- Difference between renewal and fresh application
Use Indian BIS/ISI certification context.`;

const EXPIRED_STARTERS = [
  "How to apply for a fresh BIS license?",
  "Documents needed for fresh application?",
  "What is the fresh application timeline?",
  "Can an expired license be reinstated?",
];

const CANCELLED_PROMPT = `You are QE Assistant for BIS Cancelled License Management.
Help with:
- Reasons for cancellation and appeal procedures
- Fresh application after cancellation
- Documents needed for reapplication
- BIS reinstatement procedures
Use Indian BIS/ISI certification context.`;

const DEFERRED_STARTERS = [
  "Why is a BIS license deferred?",
  "How to reactivate a deferred license?",
  "Documents needed after deferral?",
  "How long can a license stay deferred?",
];

const CANCELLED_STARTERS = [
  "Can I appeal a BIS cancellation?",
  "How to reapply after cancellation?",
  "What causes BIS cancellation?",
  "Timeline for fresh application?",
];

// ── Stop Marking Add Modal ────────────────────────────────────────────────────
type ClientOption = { id: string; name: string; company_name: string | null };
type ProjectOption = { id: string; cm_l_digits: string | null; is_number: string | null; is_revision_year: number | null; is_code_id: string | null };

function StopMarkingAiSyncResultModal({
  result,
  onClose,
}: {
  result: SyncStopMarkingResult;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl dark:bg-zinc-900">
        <div
          className={`flex items-center justify-between rounded-t-2xl px-5 py-4 ${
            result.ok ? "bg-violet-600" : "bg-rose-600"
          }`}
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-white/70">
              Manak Sync
            </p>
            <h2 className="text-base font-bold text-white">
              {result.ok ? "AI Sync complete" : "AI Sync failed"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-3 px-5 py-5 text-sm text-zinc-700 dark:text-zinc-200">
          {result.ok ? (
            <>
              <ul className="space-y-1.5">
                <li>
                  Manak CMLs found:{" "}
                  <span className="font-semibold tabular-nums">{result.manakCount}</span>
                </li>
                <li>
                  Matched in your DB:{" "}
                  <span className="font-semibold tabular-nums">{result.matched}</span>
                </li>
                <li>
                  Newly marked Stop Marking:{" "}
                  <span className="font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                    {result.added}
                  </span>
                </li>
                <li>
                  Already on Stop Marking:{" "}
                  <span className="font-semibold tabular-nums">{result.alreadyMarked}</span>
                </li>
                <li>
                  On Manak but not in DB:{" "}
                  <span className="font-semibold tabular-nums">{result.notInDbCount}</span>
                </li>
              </ul>
              {result.notInDbSample.length > 0 && (
                <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 font-mono text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-300">
                  Sample not in DB: {result.notInDbSample.join(", ")}
                  {result.notInDbCount > result.notInDbSample.length ? "…" : ""}
                </p>
              )}
            </>
          ) : (
            <>
              <p className="text-rose-700 dark:text-rose-300">{result.error}</p>
              <a
                href={result.reportUrl || MANAK_STOP_MARKING_REPORT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-violet-700 underline-offset-2 hover:underline dark:text-violet-300"
              >
                Open Manak report
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </>
          )}
        </div>

        <div className="flex justify-end rounded-b-2xl border-t border-zinc-100 px-5 py-4 dark:border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function StopMarkingAddModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [clientSearch, setClientSearch] = useState("");
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [clientLoading, setClientLoading] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientOption | null>(null);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [projLoading, setProjLoading] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectOption | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = clientSearch.trim();
    if (!q) return;
    debounceRef.current = setTimeout(async () => {
      setClientLoading(true);
      const supabase = createClient();
      const { data } = await supabase
        .from("clients")
        .select("id, name, company_name")
        .or(`name.ilike.%${q}%,company_name.ilike.%${q}%`)
        .limit(10);
      setClients((data ?? []) as ClientOption[]);
      setClientLoading(false);
    }, 300);
  }, [clientSearch]);

  const visibleClients = clientSearch.trim() ? clients : [];

  useEffect(() => {
    if (!selectedClient) return;
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) setProjLoading(true);
    });
    const supabase = createClient();
    supabase
      .from("bis_projects")
      .select("id, cm_l_digits, is_code_id, is_codes(is_number, revision_year)")
      .eq("client_id", selectedClient.id)
      .neq("project_kind", "application")
      .not("license_validity_date", "is", null)
      .or("status.is.null,status.eq.in_progress")
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (cancelled) return;
        const rows = (data ?? []).map((r: Record<string, unknown>) => {
          const ic = Array.isArray(r.is_codes) ? r.is_codes[0] : r.is_codes as { is_number?: string; revision_year?: number } | null;
          return {
            id: r.id as string,
            cm_l_digits: r.cm_l_digits as string | null,
            is_code_id: r.is_code_id as string | null,
            is_number: ic?.is_number ?? null,
            is_revision_year: ic?.revision_year ?? null,
          };
        });
        setProjects(rows);
        setProjLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedClient]);

  async function handleAdd() {
    if (!selectedProject) return;
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { error: err } = await supabase
      .from("bis_projects")
      .update({ status: "stop_marking" })
      .eq("id", selectedProject.id);
    if (err) { setError(err.message); setSaving(false); return; }
    onAdded();
    onClose();
  }

  const inputCls = "w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 placeholder-zinc-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100";

  function cmlDisplay(p: ProjectOption): string {
    const d = p.cm_l_digits?.trim();
    return d ? `CM/L-${d}` : "—";
  }

  function isDisplay(p: ProjectOption): string {
    if (!p.is_number) return "—";
    return p.is_revision_year ? `${p.is_number}: ${p.is_revision_year}` : p.is_number;
  }

  const clientLabel = (c: ClientOption) => c.company_name?.trim() || c.name?.trim() || "Unknown";

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl dark:bg-zinc-900">
        {/* Header */}
        <div className="flex items-center justify-between rounded-t-2xl bg-orange-500 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-white/70">Mark License</p>
            <h2 className="text-base font-bold text-white">Add to Stop Marking</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="space-y-5 px-5 py-5">
          {/* Step 1: Client */}
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              1. Search Client
            </label>
            {selectedClient ? (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 dark:border-emerald-800 dark:bg-emerald-950/30">
                <span className="flex-1 text-sm font-semibold text-emerald-800 dark:text-emerald-200">{clientLabel(selectedClient)}</span>
                <button type="button" onClick={() => { setSelectedClient(null); setSelectedProject(null); setProjects([]); }} className="text-xs text-emerald-600 hover:text-emerald-800 dark:text-emerald-400">Change</button>
              </div>
            ) : (
              <div className="relative">
                <input type="text" placeholder="Type client name…" value={clientSearch} onChange={(e) => setClientSearch(e.target.value)} className={inputCls} autoFocus />
                {clientLoading && <div className="absolute right-3 top-1/2 -translate-y-1/2"><div className="h-4 w-4 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" /></div>}
                {visibleClients.length > 0 && (
                  <div className="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
                    {visibleClients.map((c) => (
                      <button key={c.id} type="button" onClick={() => { setSelectedClient(c); setClientSearch(""); setClients([]); }} className="w-full px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-700">
                        {clientLabel(c)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Step 2: IS Number / Project */}
          {selectedClient && (
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                2. Select IS Number
              </label>
              {projLoading ? (
                <div className="flex justify-center py-4"><div className="h-5 w-5 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" /></div>
              ) : projects.length === 0 ? (
                <p className="rounded-lg border border-dashed border-zinc-200 px-4 py-3 text-center text-xs text-zinc-400 dark:border-zinc-700">No active licenses found for this client.</p>
              ) : (
                <div className="max-h-48 overflow-y-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
                  {projects.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedProject(p)}
                      className={`flex w-full items-center justify-between gap-3 border-b border-zinc-100 px-3 py-2 text-left text-sm last:border-0 dark:border-zinc-800 ${selectedProject?.id === p.id ? "bg-orange-50 dark:bg-orange-950/30" : "hover:bg-zinc-50 dark:hover:bg-zinc-800"}`}
                    >
                      <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-100">{isDisplay(p)}</span>
                      <span className="shrink-0 font-mono text-xs text-zinc-500 dark:text-zinc-400">{cmlDisplay(p)}</span>
                      {selectedProject?.id === p.id && (
                        <svg className="h-4 w-4 shrink-0 text-orange-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 3: CML Auto-fill */}
          {selectedProject && (
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                3. CM/L Number (Auto-fetched)
              </label>
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800/60">
                <p className="font-mono text-sm font-semibold text-zinc-800 dark:text-zinc-100">{cmlDisplay(selectedProject)}</p>
              </div>
            </div>
          )}

          {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 rounded-b-2xl border-t border-zinc-100 px-5 py-4 dark:border-zinc-800">
          <button type="button" onClick={onClose} className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800">Cancel</button>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!selectedProject || saving}
            className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? "Saving…" : "Add to Stop Marking"}
          </button>
        </div>
      </div>
    </div>
  );
}

function BisTable({
  rows,
  emptyMsg,
  accentColor,
  systemPrompt,
  starters,
  chatLabel,
}: {
  rows: BisRow[];
  emptyMsg: string;
  accentColor: "amber" | "sky" | "emerald" | "violet";
  systemPrompt: string;
  starters: string[];
  chatLabel: string;
}) {
  const [search, setSearch] = useState("");
  const [chatOpen, setChatOpen] = useState(false);

  const filtered = rows.filter((r) => {
    const q = search.trim().toLowerCase();
    return (
      !q ||
      r.client_name.toLowerCase().includes(q) ||
      (r.license_number ?? "").toLowerCase().includes(q) ||
      r.title.toLowerCase().includes(q)
    );
  });

  const assistantBtnCls = {
    amber:   "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-300 dark:hover:bg-amber-950/50",
    sky:     "border-sky-300 bg-sky-50 text-sky-700 hover:bg-sky-100 dark:border-sky-700 dark:bg-sky-950/30 dark:text-sky-300 dark:hover:bg-sky-950/50",
    emerald: "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300 dark:hover:bg-emerald-950/50",
    violet:  "border-violet-300 bg-violet-50 text-violet-700 hover:bg-violet-100 dark:border-violet-700 dark:bg-violet-950/30 dark:text-violet-300 dark:hover:bg-violet-950/50",
  }[accentColor];

  return (
    <>
      <div className="rounded-2xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <h2 className="flex-1 text-base font-bold text-zinc-900 dark:text-white">{chatLabel}</h2>
          <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            {rows.length} records
          </span>
          <button
            type="button"
            onClick={() => setChatOpen(true)}
            className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-semibold shadow-sm transition-colors ${assistantBtnCls}`}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            Ask QE Assistant
          </button>
        </div>

        {/* Search */}
        <div className="border-b border-zinc-100 px-6 py-3 dark:border-zinc-800/60">
          <div className="relative">
            <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search client or license…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2 pl-9 pr-3 text-sm text-zinc-800 placeholder-zinc-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {rows.length === 0 ? (
            <p className="px-6 py-12 text-center text-sm text-zinc-500">{emptyMsg}</p>
          ) : filtered.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-zinc-500">No records match your search.</p>
          ) : (
            <table className="w-full min-w-[520px] text-sm">
              <thead className="border-b border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/60">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-zinc-500">Client Name</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-zinc-500">License Details</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-zinc-500">Validity</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-zinc-500">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                    <td className="px-4 py-3 font-semibold text-zinc-800 dark:text-zinc-100">{r.client_name}</td>
                    <td className="px-4 py-3">
                      <div className="font-mono text-xs font-semibold text-zinc-800 dark:text-zinc-200">{r.license_number ?? "—"}</div>
                      <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{r.title}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-600 dark:text-zinc-300">{formatDate(r.license_validity_date)}</td>
                    <td className="px-4 py-3 text-center">
                      <Link href={`/dashboard/bis-projects?id=${r.id}`} className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-700 dark:bg-zinc-700 dark:hover:bg-zinc-600">
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {chatOpen && (
        <AiChatModal
          title="QE Assistant"
          subtitle={`${chatLabel} · AI Powered`}
          systemPrompt={systemPrompt}
          starterQuestions={starters}
          accentColor={accentColor}
          onClose={() => setChatOpen(false)}
        />
      )}
    </>
  );
}

// ── General Tab KPIs ─────────────────────────────────────────────────────────
function KpiCard({
  label, value, sub, color, href,
}: {
  label: string; value: number; sub?: string;
  color: "sky" | "emerald" | "violet" | "amber" | "blue" | "orange" | "red" | "zinc";
  href?: string;
}) {
  const colors = {
    sky:     { bg: "bg-sky-50 dark:bg-sky-950/30",     border: "border-sky-200/80 dark:border-sky-800",     text: "text-sky-700 dark:text-sky-300",     num: "text-sky-900 dark:text-sky-100" },
    emerald: { bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-emerald-200/80 dark:border-emerald-800", text: "text-emerald-700 dark:text-emerald-300", num: "text-emerald-900 dark:text-emerald-100" },
    violet:  { bg: "bg-violet-50 dark:bg-violet-950/30",  border: "border-violet-200/80 dark:border-violet-800",  text: "text-violet-700 dark:text-violet-300",  num: "text-violet-900 dark:text-violet-100" },
    amber:   { bg: "bg-amber-50 dark:bg-amber-950/30",    border: "border-amber-200/80 dark:border-amber-800",    text: "text-amber-700 dark:text-amber-300",    num: "text-amber-900 dark:text-amber-100" },
    blue:    { bg: "bg-blue-50 dark:bg-blue-950/30",      border: "border-blue-200/80 dark:border-blue-800",      text: "text-blue-700 dark:text-blue-300",      num: "text-blue-900 dark:text-blue-100" },
    orange:  { bg: "bg-orange-50 dark:bg-orange-950/30",  border: "border-orange-200/80 dark:border-orange-800",  text: "text-orange-700 dark:text-orange-300",  num: "text-orange-900 dark:text-orange-100" },
    red:     { bg: "bg-red-50 dark:bg-red-950/30",        border: "border-red-200/80 dark:border-red-800",        text: "text-red-700 dark:text-red-300",        num: "text-red-900 dark:text-red-100" },
    zinc:    { bg: "bg-zinc-50 dark:bg-zinc-800/40",      border: "border-zinc-200/80 dark:border-zinc-700",      text: "text-zinc-500 dark:text-zinc-400",      num: "text-zinc-900 dark:text-zinc-100" },
  }[color];

  const inner = (
    <div className={`rounded-2xl border ${colors.border} ${colors.bg} p-5 flex flex-col gap-2 shadow-sm transition-all ${href ? "hover:shadow-md hover:scale-[1.01]" : ""}`}>
      <p className={`text-xs font-bold uppercase tracking-wider ${colors.text}`}>{label}</p>
      <p className={`font-display text-4xl font-extrabold tabular-nums ${colors.num}`}>{value}</p>
      {sub && <p className={`text-sm font-medium ${colors.text} opacity-80`}>{sub}</p>}
    </div>
  );

  if (href) return <Link href={href}>{inner}</Link>;
  return inner;
}

function GeneralTab({
  stats, renewalCount, deferredCount, stopMarkingCount, applicationCount, expiredCount,
}: {
  stats: Stats;
  renewalCount: number; deferredCount: number; stopMarkingCount: number;
  applicationCount: number; expiredCount: number;
}) {
  return (
    <div className="space-y-6">
      <div>
        <p className="mb-3 text-sm font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Master Data</p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <KpiCard label="Total Clients"    value={stats.totalClients}  color="sky"     href="/dashboard/clients"          sub="Active client accounts" />
          <KpiCard label="Total IS Codes"   value={stats.totalIsCodes}  color="emerald" href="/dashboard/is-code-master"   sub="Indian Standards tracked" />
          <KpiCard label="Total Products"   value={stats.totalProducts} color="violet"  href="/dashboard/products"         sub="Product & service items" />
        </div>
      </div>

      <div>
        <p className="mb-3 text-sm font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">BIS License Status</p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <KpiCard label="Pending Renewal"   value={renewalCount}      color="amber"  sub="Expiring within 90 days" />
          <KpiCard label="Deferred"          value={deferredCount}     color="blue"   sub="Past validity, within 90d grace" />
          <KpiCard label="Stop Marking"      value={stopMarkingCount}  color="orange" sub="Non-compliance marked" />
          <KpiCard label="Pending Applications" value={applicationCount} color="sky"  sub="Fresh applications in progress" />
          <KpiCard label="Expired"           value={expiredCount}      color="red"    sub="Beyond 90-day grace period" />
        </div>
      </div>
    </div>
  );
}

// ── Stats Bar ─────────────────────────────────────────────────────────────────
function StatsBar({ stats }: { stats: Stats }) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {[
        { label: "Total Clients", count: stats.totalClients, color: "sky", addHref: "/dashboard/clients?new=1", allHref: "/dashboard/clients", addLabel: "+ Add New Client" },
        { label: "Total IS Codes", count: stats.totalIsCodes, color: "emerald", addHref: "/dashboard/is-code-master?new=1", allHref: "/dashboard/is-code-master", addLabel: "+ Add IS Code" },
        { label: "Total Items", count: stats.totalProducts, color: "violet", addHref: "/dashboard/products?new=1", allHref: "/dashboard/products", addLabel: "+ Add New Item" },
      ].map((s) => (
        <div key={s.label} className={`flex flex-col justify-between rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900`}>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">{s.label}</p>
            <p className={`mt-1 text-4xl font-black tabular-nums text-zinc-950 dark:text-white`}>{s.count}</p>
          </div>
          <div className="mt-4 flex gap-2">
            <Link href={s.addHref} className={`flex-1 rounded-lg bg-${s.color}-600 px-3 py-2 text-center text-xs font-semibold text-white hover:bg-${s.color}-700 dark:bg-${s.color}-700 dark:hover:bg-${s.color}-600`}>
              {s.addLabel}
            </Link>
            <Link href={s.allHref} className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">
              View All
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main Tabs Component ───────────────────────────────────────────────────────
export function DashboardTabs({
  financeModules,
  renewalRows,
  applicationRows,
  deferredRows,
  stopMarkingRows,
  surveillanceRows,
  expiredRows,
  cancelledRows,
  stats,
}: {
  financeModules: FinanceModule[];
  renewalRows: RenewalRow[];
  applicationRows: ApplicationRow[];
  deferredRows: RenewalRow[];
  stopMarkingRows: RenewalRow[];
  surveillanceRows: SurveillanceRow[];
  expiredRows: RenewalRow[];
  cancelledRows: BisRow[];
  stats: Stats;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [stopMarkingModalOpen, setStopMarkingModalOpen] = useState(false);
  const [aiSyncPending, startAiSync] = useTransition();
  const [aiSyncResult, setAiSyncResult] = useState<SyncStopMarkingResult | null>(null);
  const tabParam = searchParams.get("tab");
  const activeTab = tabParam && TAB_IDS.has(tabParam) ? tabParam : "general";

  const tabCounts: Record<string, number> = {
    renewals: renewalRows.length,
    deferred: deferredRows.length,
    stop_marking: stopMarkingRows.length,
    applications: applicationRows.length,
    surveillance: surveillanceRows.length,
    expired: expiredRows.length,
  };

  function setActiveTab(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", id);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function runAiSyncFromManak() {
    const ok = window.confirm(
      "Fetch Manak suspension list and mark matching CM/L as Stop Marking?",
    );
    if (!ok) return;
    startAiSync(async () => {
      const result = await syncStopMarkingFromManak();
      setAiSyncResult(result);
      if (result.ok) router.refresh();
    });
  }

  return (
    <div className="space-y-0">
      {/* Tab Bar */}
      <div className="sticky top-0 z-10 border-b border-zinc-200/80 bg-white/95 py-1.5 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/95">
        <nav
          className="flex w-full gap-1 rounded-none border border-zinc-200/80 bg-gradient-to-b from-zinc-50 to-zinc-100/90 p-0.5 shadow-sm dark:border-zinc-700/80 dark:from-zinc-900 dark:to-zinc-900/70 sm:gap-1.5 sm:p-1"
          aria-label="Dashboard tabs"
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const count = tabCounts[tab.id];

            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex min-w-0 flex-1 items-center justify-center gap-1 rounded-none px-1 py-1.5 text-center text-xs font-semibold leading-tight transition-all duration-200 sm:gap-1.5 sm:px-2 sm:py-2 md:px-3 ${
                  isActive
                    ? "bg-white text-sky-700 shadow-md ring-1 ring-sky-200/80 dark:bg-zinc-800 dark:text-sky-300 dark:ring-sky-700/40"
                    : "text-zinc-600 hover:bg-white/70 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/70 dark:hover:text-zinc-100"
                }`}
              >
                <span className="truncate">{tab.label}</span>
                {count !== undefined && (
                  <span
                    className={`min-w-[1.05rem] shrink-0 rounded-full px-1 py-px text-center text-[9px] font-bold tabular-nums leading-none sm:min-w-[1.2rem] sm:text-[10px] ${
                      isActive
                        ? "bg-sky-100 text-sky-700 dark:bg-sky-950/70 dark:text-sky-200"
                        : count > 0
                          ? "bg-zinc-200/90 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200"
                          : "bg-zinc-200/50 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="pt-6 space-y-6">
        {activeTab === "general" && (
          <GeneralTab
            stats={stats}
            renewalCount={renewalRows.length}
            deferredCount={deferredRows.length}
            stopMarkingCount={stopMarkingRows.length}
            applicationCount={applicationRows.length}
            expiredCount={expiredRows.length}
          />
        )}

        {activeTab === "finance" && (
          <>
            <FinanceManagementCard modules={financeModules} />
            <StatsBar stats={stats} />
          </>
        )}

        {activeTab === "renewals" && (
          <PendingRenewalsSection rows={renewalRows} />
        )}

        {activeTab === "applications" && (
          <PendingApplicationsSection rows={applicationRows} />
        )}

        {activeTab === "surveillance" && (
          <SurveillanceSection rows={surveillanceRows} />
        )}

        {activeTab === "deferred" && (
          <PendingRenewalsSection rows={deferredRows} sectionLabel="Deferred Licenses" emptyMsg="No deferred licenses found." />
        )}

        {activeTab === "stop_marking" && (
          <>
            <PendingRenewalsSection
              rows={stopMarkingRows}
              sectionLabel="Under Stop Marking"
              emptyMsg="No licenses under Stop Marking."
              extraHeaderButton={
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={runAiSyncFromManak}
                    disabled={aiSyncPending}
                    className="inline-flex items-center gap-2 rounded-lg border border-violet-300 bg-violet-50 px-3.5 py-2 text-sm font-semibold text-violet-700 shadow-sm transition-colors hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-violet-700 dark:bg-violet-950/30 dark:text-violet-300 dark:hover:bg-violet-950/50"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                      />
                    </svg>
                    {aiSyncPending ? "Syncing…" : "AI Sync from Manak"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStopMarkingModalOpen(true)}
                    className="inline-flex items-center gap-2 rounded-lg border border-orange-300 bg-orange-50 px-3.5 py-2 text-sm font-semibold text-orange-700 shadow-sm transition-colors hover:bg-orange-100 dark:border-orange-700 dark:bg-orange-950/30 dark:text-orange-300 dark:hover:bg-orange-950/50"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Add to Stop Marking
                  </button>
                </div>
              }
            />
            {stopMarkingModalOpen && (
              <StopMarkingAddModal
                onClose={() => setStopMarkingModalOpen(false)}
                onAdded={() => router.refresh()}
              />
            )}
            {aiSyncResult && (
              <StopMarkingAiSyncResultModal
                result={aiSyncResult}
                onClose={() => setAiSyncResult(null)}
              />
            )}
          </>
        )}

        {activeTab === "expired" && (
          <PendingApplicationsSection
            variant="expired_licenses"
            rows={expiredRows.map((r) => ({
              ...r,
              created_at: r.license_validity_date,
              source: "bis_projects" as const,
            }))}
          />
        )}

        {activeTab === "cancelled" && (
          <BisTable
            rows={cancelledRows}
            emptyMsg="No cancelled licenses found."
            accentColor="sky"
            systemPrompt={CANCELLED_PROMPT}
            starters={CANCELLED_STARTERS}
            chatLabel="Cancelled Licenses"
          />
        )}
      </div>
    </div>
  );
}
