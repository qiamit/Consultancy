"use client";

import { useMemo, useState, useEffect, useTransition } from "react";
import { AiChatModal } from "@/components/dashboard/ai-chat-modal";
import { ClientSnapshotModal } from "@/components/dashboard/modals/client-snapshot-modal";
import { formatCmDisplay } from "@backend/modules/bis/bis-project-license-status";
import { formatDisplayDate, parseDisplayDateInput, toYmdDateString } from "@backend/shared/format-date";
import {
  fetchRenewalApplication,
  upsertRenewalApplication,
  type RenewalApplication,
} from "@backend/actions/renewals";
import {
  downloadRenewalExcel,
  openRenewalPrintWindow,
  type RenewalExportData,
} from "@backend/modules/bis/renewal-form-export";
import { createClient } from "@backend/db/supabase/client";
import { IsCodeViewModal } from "@/components/dashboard/modals/is-code-view-modal";

const RENEWAL_SYSTEM_PROMPT = `You are QE Assistant, an AI helper for Quality Engineering Consultancy's BIS License Renewal Management.
You help with:
- BIS license renewal timelines and procedures
- License validity tracking and expiry management
- CM/L number and marking fee queries
- Renewal application filing with BIS (Bureau of Indian Standards)
- Documents required for renewal
- MANAK Online portal procedures
- Dealing with expired licenses and emergency renewal steps
- Renewal cost estimation and billing

Be concise, practical, and use Indian BIS/ISI certification context.`;

const RENEWAL_STARTERS = [
  "How do I renew a BIS license?",
  "What documents are needed for renewal?",
  "License expired — what are next steps?",
  "How early should I apply for renewal?",
];

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
  is_number: string | null;
  is_revision_year: number | null;
  is_code_title: string | null;
  is_code_id: string | null;
  notes: string | null;
};

function formatIsDisplay(isNumber: string | null, revisionYear: number | null): string {
  if (!isNumber) return "—";
  return revisionYear ? `${isNumber}: ${revisionYear}` : isNumber;
}

function formatCmLDisplay(projectKind: string, cmDigits: string | null): string {
  return formatCmDisplay(projectKind, cmDigits);
}

type PeriodRow = {
  from: string;
  to: string;
  total_production: string;
  rejection: string;
  /** True when row was created via split — dates become editable */
  datesEditable?: boolean;
  /** Original month bounds before split — used to restore row on merge */
  parentFrom?: string;
  parentTo?: string;
};

const APPLICATION_FEE = 1000;
const ANNUAL_LICENSE_FEE_PER_YEAR = 1000;

type RenewalFormSnapshot = {
  version: 1;
  periodFrom: string;
  periodTo: string;
  unitRate: string;
  renewalYears: string;
  lateFee: string;
  previousDues: string;
  productionDecimals: number;
  tableGenerated: boolean;
  periodRows: PeriodRow[];
  mmf: number;
  gst: number;
  total: number;
  totalConformingQty: number;
};

function parseRenewalFormSnapshot(notes: string | null): Partial<RenewalFormSnapshot> | null {
  if (!notes?.trim().startsWith("{")) return null;
  try {
    const parsed = JSON.parse(notes) as RenewalFormSnapshot;
    return parsed.version === 1 ? parsed : null;
  } catch {
    return null;
  }
}

function buildRenewalFormSnapshot(input: {
  periodFrom: string;
  periodTo: string;
  unitRate: string;
  renewalYears: string;
  lateFee: string;
  previousDues: string;
  productionDecimals: number;
  tableGenerated: boolean;
  periodRows: PeriodRow[];
  mmf: number;
  gst: number;
  total: number;
  totalConformingQty: number;
}): RenewalFormSnapshot {
  return { version: 1, ...input };
}

function parseDecimal(raw: string): number {
  const n = Number(String(raw).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}

function sanitizeDecimalInput(raw: string): string {
  return raw.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1");
}

function formatDecimalDisplay(n: number): string {
  if (n === 0) return "";
  return n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function formatProductionDecimal(n: number, decimals: number): string {
  if (n === 0) return "";
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatProductionDecimalTotal(n: number, decimals: number): string {
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatCurrencyDisplay(n: number): string {
  if (n === 0) return "";
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function rowConforming(r: PeriodRow): number {
  return Math.max(0, parseDecimal(r.total_production) - parseDecimal(r.rejection));
}

function rowApproxValue(r: PeriodRow, unitRate: string): number {
  return rowConforming(r) * parseDecimal(unitRate);
}

type IsCodeFeeDetail = {
  is_code_title: string | null;
  unit_of_is: string | null;
  mmf_large_scale: number | null;
  mmf_medium_scale: number | null;
  mmf_small_scale: number | null;
  mmf_micro_scale: number | null;
  slab_1_quantity: string | null;
  slab_1_rate: number | null;
  slab_2_quantity: string | null;
  slab_2_rate: number | null;
  slab_3_quantity: string | null;
  slab_3_rate: number | null;
};

function formatInrAmount(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(Number(n))) return "—";
  return `₹ ${Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function mmfAmountForScale(scale: string, isCode: IsCodeFeeDetail | null): number {
  if (!isCode || scale === "—") return 0;
  const s = scale.trim().toLowerCase();
  let val: number | null = null;
  if (s.includes("micro")) val = isCode.mmf_micro_scale;
  else if (s.includes("small")) val = isCode.mmf_small_scale;
  else if (s.includes("medium")) val = isCode.mmf_medium_scale;
  else if (s.includes("large")) val = isCode.mmf_large_scale;
  return val != null && Number.isFinite(val) ? val : 0;
}

function mmfForScale(scale: string, isCode: IsCodeFeeDetail | null): string {
  if (!isCode || scale === "—") return "—";
  return formatInrAmount(mmfAmountForScale(scale, isCode));
}

function parseSlabRange(qtyStr: string): { min: number; max: number | null } | null {
  const s = qtyStr.trim().toLowerCase();
  if (!s || s === "n/a" || s === "na" || s === "—") return null;
  if (s.includes("all")) return { min: 0, max: null };

  const rangeMatch = s.match(/^(\d+(?:\.\d+)?)\s*(?:-|–|to)\s*(\d+(?:\.\d+)?)$/);
  if (rangeMatch) return { min: Number(rangeMatch[1]), max: Number(rangeMatch[2]) };

  const gtMatch = s.match(/^>\s*(\d+(?:\.\d+)?)$/);
  if (gtMatch) return { min: Number(gtMatch[1]), max: null };

  const plusMatch = s.match(/^(\d+(?:\.\d+)?)\s*\+$/);
  if (plusMatch) return { min: Number(plusMatch[1]), max: null };

  const num = Number(s.replace(/[^\d.]/g, ""));
  if (Number.isFinite(num) && /^\d+(?:\.\d+)?$/.test(s)) return { min: 0, max: num };

  return null;
}

type SlabBreakdownRow = {
  label: string;
  rangeLabel: string;
  quantity: number;
  rate: number;
  amount: number;
};

function getAllSlabDefs(isCode: IsCodeFeeDetail | null) {
  if (!isCode) return [];
  return [
    { label: "Slab 1", quantity: isCode.slab_1_quantity ?? "All Quantities", rate: isCode.slab_1_rate },
    { label: "Slab 2", quantity: isCode.slab_2_quantity ?? "N/A", rate: isCode.slab_2_rate },
    { label: "Slab 3", quantity: isCode.slab_3_quantity ?? "N/A", rate: isCode.slab_3_rate },
  ].map((s) => ({
    ...s,
    rate: s.rate != null && Number.isFinite(s.rate) ? s.rate : 0,
    range: parseSlabRange(s.quantity),
  }));
}

function buildSlabBreakdownRows(totalQty: number, isCode: IsCodeFeeDetail | null): SlabBreakdownRow[] {
  const allSlabs = getAllSlabDefs(isCode);
  if (allSlabs.length === 0) return [];

  const activeSlabs = allSlabs.filter((s) => s.range !== null);
  const qtyByLabel = new Map<string, number>();

  if (activeSlabs.length === 1 && activeSlabs[0].quantity.toLowerCase().includes("all")) {
    qtyByLabel.set(activeSlabs[0].label, totalQty);
  } else if (activeSlabs.length > 0) {
    const sorted = [...activeSlabs].sort((a, b) => a.range!.min - b.range!.min);
    let prevCap = 0;
    for (const slab of sorted) {
      const upper = slab.range!.max;
      let qtyInSlab = 0;
      if (upper === null) {
        qtyInSlab = Math.max(0, totalQty - prevCap);
      } else {
        qtyInSlab = Math.max(0, Math.min(totalQty, upper) - prevCap);
        prevCap = upper;
      }
      qtyByLabel.set(slab.label, qtyInSlab);
    }
  }

  return allSlabs.map((s) => {
    const qty = qtyByLabel.get(s.label) ?? 0;
    return {
      label: s.label,
      rangeLabel: s.quantity,
      quantity: qty,
      rate: s.rate,
      amount: qty * s.rate,
    };
  });
}

function computeRenewalMmf(
  scale: string,
  qty: number,
  isCode: IsCodeFeeDetail | null,
): { finalMmf: number; slabRows: SlabBreakdownRow[]; productionFee: number; minimumFee: number } {
  const slabRows = buildSlabBreakdownRows(qty, isCode);
  const productionFee = slabRows.reduce((sum, row) => sum + row.amount, 0);
  const minimumFee = mmfAmountForScale(scale, isCode);
  const finalMmf = Math.max(minimumFee, productionFee);
  return { finalMmf, slabRows, productionFee, minimumFee };
}

function formatQtyAmount(n: number): string {
  return n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function formatInrPlain(n: number): string {
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function toYMD(d: Date): string {
  return toYmdDateString(d);
}

function splitDateRange(fromStr: string, toStr: string, parts: 2 | 3): { from: string; to: string }[] {
  const [fy, fm, fd] = fromStr.split("-").map(Number);
  const [ty, tm, td] = toStr.split("-").map(Number);
  const start = new Date(fy, fm - 1, fd);
  const end = new Date(ty, tm - 1, td);
  const totalDays = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;

  if (parts === 2) {
    const firstDays = Math.ceil(totalDays / 2);
    const midEnd = new Date(start);
    midEnd.setDate(midEnd.getDate() + firstDays - 1);
    const secondStart = new Date(midEnd);
    secondStart.setDate(secondStart.getDate() + 1);
    return [
      { from: toYMD(start), to: toYMD(midEnd) },
      { from: toYMD(secondStart), to: toYMD(end) },
    ];
  }

  const chunk = Math.ceil(totalDays / 3);
  const segments: { from: string; to: string }[] = [];
  let cur = new Date(start);
  for (let i = 0; i < 3; i++) {
    const segEnd = new Date(cur);
    if (i === 2) {
      segEnd.setTime(end.getTime());
    } else {
      segEnd.setDate(segEnd.getDate() + chunk - 1);
      if (segEnd > end) segEnd.setTime(end.getTime());
    }
    segments.push({ from: toYMD(cur), to: toYMD(segEnd) });
    if (segEnd >= end) break;
    cur = new Date(segEnd);
    cur.setDate(cur.getDate() + 1);
  }
  return segments;
}

function generatePeriodRows(fromStr: string, toStr: string): PeriodRow[] {
  const rows: PeriodRow[] = [];
  const [fy, fm, fd] = fromStr.split("-").map(Number);
  const [ty, tm, td] = toStr.split("-").map(Number);
  const to = new Date(ty, tm - 1, td);
  let cur = new Date(fy, fm - 1, fd);
  while (cur <= to) {
    const endDay = lastDayOfMonth(cur.getFullYear(), cur.getMonth());
    const endOfMonth = new Date(cur.getFullYear(), cur.getMonth(), endDay);
    const rowTo = endOfMonth > to ? to : endOfMonth;
    rows.push({
      from: toYMD(cur),
      to: toYMD(rowTo),
      total_production: "",
      rejection: "",
    });
    if (endOfMonth >= to) break;
    cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
  }
  return rows;
}

function fmtDMY(dateStr: string): string {
  if (!dateStr) return "";
  return formatDisplayDate(dateStr, "");
}

function parseDMYInput(raw: string): string | null {
  return parseDisplayDateInput(raw);
}

function PeriodDateInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (ymd: string) => void;
}) {
  const [local, setLocal] = useState(() => (value ? fmtDMY(value) : ""));
  const [focused, setFocused] = useState(false);
  const displayValue = focused ? local : value ? fmtDMY(value) : "";

  return (
    <input
      type="text"
      inputMode="numeric"
      placeholder="DD-MMM-YY"
      value={displayValue}
      onFocus={() => setFocused(true)}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => {
        setFocused(false);
        const parsed = parseDMYInput(local);
        if (parsed) {
          onChange(parsed);
          setLocal(fmtDMY(parsed));
        } else {
          setLocal(value ? fmtDMY(value) : "");
        }
      }}
      className="w-full min-w-[6.75rem] rounded-md border border-sky-300 bg-sky-50 px-2 py-1.5 text-center text-xs font-semibold tabular-nums text-zinc-800 placeholder:font-normal placeholder:text-zinc-400 focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-200 dark:border-sky-700 dark:bg-sky-950/50 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:bg-zinc-800 dark:focus:ring-sky-900"
    />
  );
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr);
  return Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr: string | null): string {
  return formatDisplayDate(dateStr);
}

function ExpiryBadge({ dateStr }: { dateStr: string | null }) {
  const days = daysUntil(dateStr);
  if (days === null) return <span className="text-zinc-400">—</span>;

  let cls = "rounded-full px-2 py-0.5 text-xs font-semibold ";
  let label = "";

  if (days < 0) {
    cls += "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300";
    label = `Deferred ${Math.abs(days)}d`;
  } else if (days === 0) {
    cls += "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300";
    label = "Expires today";
  } else if (days <= 30) {
    cls += "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300";
    label = `${days} Days Left`;
  } else if (days <= 90) {
    cls += "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
    label = `${days} Days Left`;
  } else {
    cls += "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300";
    label = `${days} Days Left`;
  }

  return <span className={cls}>{label}</span>;
}

// ── IS Code View Modal ────────────────────────────────────────────────────────
type IsCodeDetail = {
  is_number: string | null;
  revision_year: number | null;
  is_code_title: string | null;
  aspect_of_is: string | null;
  unit_of_is: string | null;
  testing_charges: number | null;
  mmf_large_scale: number | null;
  mmf_medium_scale: number | null;
  mmf_small_scale: number | null;
  mmf_micro_scale: number | null;
  slab_1_quantity: string | null;
  slab_1_rate: number | null;
  slab_2_quantity: string | null;
  slab_2_rate: number | null;
  slab_3_quantity: string | null;
  slab_3_rate: number | null;
};

function ISInfoRow({
  label,
  value,
  align = "left",
}: {
  label: string;
  value: string | number | null;
  align?: "left" | "center" | "right";
}) {
  const alignCls =
    align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left";

  return (
    <div className={`min-w-0 px-3 first:pl-0 last:pr-0 ${alignCls}`}>
      <p className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">{label}</p>
      <p className="mt-0.5 truncate text-sm font-medium text-zinc-800 dark:text-zinc-100">{value ?? "—"}</p>
    </div>
  );
}

function ISFeeRow({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-800/50">
      <span className="text-xs text-zinc-600 dark:text-zinc-400">{label}</span>
      <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
        {value != null ? `₹ ${value.toLocaleString("en-IN")}` : "—"}
      </span>
    </div>
  );
}

function ISSlabRow({
  label,
  quantity,
  rate,
}: {
  label: string;
  quantity: string | null;
  rate: number | null;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-800/50">
      <div className="min-w-0">
        <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">{label}</span>
        <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">{quantity?.trim() || "—"}</span>
      </div>
      <span className="shrink-0 text-xs font-bold text-zinc-900 dark:text-zinc-100">
        {rate != null ? `₹ ${rate.toLocaleString("en-IN")}` : "—"}
      </span>
    </div>
  );
}

// ── Renewal Application Form Modal ────────────────────────────────────────────
function RenewalFormModal({ row, onClose }: { row: RenewalRow; onClose: () => void }) {
  const [firmAddress, setFirmAddress] = useState("Loading…");
  const [firmScale, setFirmScale] = useState("—");
  const [isCodeDetail, setIsCodeDetail] = useState<IsCodeFeeDetail | null>(null);
  const [periodFrom, setPeriodFrom] = useState("");
  const [periodTo, setPeriodTo] = useState("");
  const [unitRate, setUnitRate] = useState("");
  const [renewalYears, setRenewalYears] = useState("1");
  const [lateFee, setLateFee] = useState("");
  const [previousDues, setPreviousDues] = useState("");
  const [periodRows, setPeriodRows] = useState<PeriodRow[]>([]);
  const [tableGenerated, setTableGenerated] = useState(false);
  const [productionDecimals, setProductionDecimals] = useState(2);
  const [applicationId, setApplicationId] = useState<string | undefined>();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saving, startSave] = useTransition();

  // Auto-fetch client details and IS code title
  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    if (row.client_id) {
      supabase
        .from("clients")
        .select("address, city, state, pin_code, company_scale")
        .eq("id", row.client_id)
        .single()
        .then(({ data }) => {
          if (cancelled) return;
          if (!data) {
            setFirmAddress("—");
            return;
          }
          const addr = [data.address, data.city, data.state, data.pin_code].filter(Boolean).join(", ");
          setFirmAddress(addr || "—");
          setFirmScale((data.company_scale as string | null) ?? "—");
        });
    } else {
      void Promise.resolve().then(() => {
        if (!cancelled) setFirmAddress("—");
      });
    }
    if (row.is_code_id) {
      supabase
        .from("is_codes")
        .select("is_code_title, unit_of_is, mmf_large_scale, mmf_medium_scale, mmf_small_scale, mmf_micro_scale, slab_1_quantity, slab_1_rate, slab_2_quantity, slab_2_rate, slab_3_quantity, slab_3_rate")
        .eq("id", row.is_code_id)
        .single()
        .then(({ data }) => {
          if (!cancelled) setIsCodeDetail((data as IsCodeFeeDetail | null) ?? null);
        });
    } else {
      void Promise.resolve().then(() => {
        if (!cancelled) setIsCodeDetail(null);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [row.client_id, row.is_code_id]);

  useEffect(() => {
    fetchRenewalApplication(row.id).then((app) => {
      if (!app) return;
      if (app.id) setApplicationId(app.id);
      if (app.marking_fee_rate != null) setUnitRate(String(app.marking_fee_rate));

      const snapshot = parseRenewalFormSnapshot(app.notes);
      if (!snapshot) return;

      if (snapshot.periodFrom) setPeriodFrom(snapshot.periodFrom);
      if (snapshot.periodTo) setPeriodTo(snapshot.periodTo);
      if (snapshot.unitRate) setUnitRate(snapshot.unitRate);
      if (snapshot.renewalYears) setRenewalYears(snapshot.renewalYears);
      if (snapshot.lateFee != null) setLateFee(snapshot.lateFee);
      if (snapshot.previousDues != null) setPreviousDues(snapshot.previousDues);
      if (snapshot.productionDecimals != null) setProductionDecimals(snapshot.productionDecimals);
      if (snapshot.periodRows) setPeriodRows(snapshot.periodRows);
      if (snapshot.tableGenerated) setTableGenerated(snapshot.tableGenerated);
    });
  }, [row.id]);

  const isCodeTitle = isCodeDetail?.is_code_title ?? (row.is_code_id ? "Loading…" : "—");
  const minMmfDisplay = mmfForScale(firmScale, isCodeDetail);
  const unitOfProduction = isCodeDetail?.unit_of_is?.trim() || "—";

  function updatePeriodRow(idx: number, field: "total_production" | "rejection", val: string) {
    setPeriodRows((prev) => prev.map((r, i) => i === idx ? { ...r, [field]: val } : r));
  }

  function updatePeriodRowDate(idx: number, field: "from" | "to", val: string) {
    setPeriodRows((prev) => prev.map((r, i) => i === idx ? { ...r, [field]: val } : r));
  }

  function handleSplitRow(idx: number, parts: 2 | 3) {
    setPeriodRows((prev) => {
      const row = prev[idx];
      if (!row) return prev;
      const parentFrom = row.parentFrom ?? row.from;
      const parentTo = row.parentTo ?? row.to;
      const segments = splitDateRange(row.from, row.to, parts).map((seg) => ({
        ...seg,
        total_production: "",
        rejection: "",
        datesEditable: true,
        parentFrom,
        parentTo,
      }));
      return [...prev.slice(0, idx), ...segments, ...prev.slice(idx + 1)];
    });
  }

  function handleRemoveSplitRow(idx: number) {
    setPeriodRows((prev) => {
      const row = prev[idx];
      if (!row?.datesEditable) return prev;

      const parentFrom = row.parentFrom ?? row.from;
      const parentTo = row.parentTo ?? row.to;
      const without = prev.filter((_, i) => i !== idx);
      const siblings = without.filter(
        (r) => r.datesEditable && r.parentFrom === parentFrom && r.parentTo === parentTo,
      );

      if (siblings.length === 0) {
        const restored: PeriodRow = {
          from: parentFrom,
          to: parentTo,
          total_production: "",
          rejection: "",
        };
        const next = [...without];
        next.splice(Math.min(idx, next.length), 0, restored);
        return next;
      }

      return without;
    });
  }

  function applyProductionDecimals(decimals: number) {
    setProductionDecimals(decimals);
    setPeriodRows((prev) =>
      prev.map((r) => ({
        ...r,
        total_production: r.total_production.trim()
          ? formatProductionDecimal(parseDecimal(r.total_production), decimals)
          : "",
        rejection: r.rejection.trim()
          ? formatProductionDecimal(parseDecimal(r.rejection), decimals)
          : "",
      })),
    );
  }

  function blurProductionField(idx: number, field: "total_production" | "rejection") {
    setPeriodRows((prev) =>
      prev.map((r, i) => {
        if (i !== idx || !r[field].trim()) return r;
        return {
          ...r,
          [field]: formatProductionDecimal(parseDecimal(r[field]), productionDecimals),
        };
      }),
    );
  }

  function handleCreateTable() {
    if (!periodFrom || !periodTo) return;
    const rows = generatePeriodRows(periodFrom, periodTo);
    setPeriodRows(rows);
    setTableGenerated(true);
  }

  const totalConformingQty = periodRows.reduce((sum, r) => sum + rowConforming(r), 0);
  const { finalMmf: mmf, slabRows } = computeRenewalMmf(firmScale, totalConformingQty, isCodeDetail);
  const lateFeeAmount = parseDecimal(lateFee);
  const previousDuesAmount = parseDecimal(previousDues);
  const renewalYearsNum = parseInt(renewalYears, 10) || 1;
  const applicationFee = APPLICATION_FEE;
  const annualLicenseFee = ANNUAL_LICENSE_FEE_PER_YEAR * renewalYearsNum;
  const gstBase = mmf + lateFeeAmount + previousDuesAmount + applicationFee + annualLicenseFee;
  const gst = gstBase * 0.18;
  const total = gstBase + gst;

  function buildRenewalPayload(isDraft: boolean): RenewalApplication {
    const snapshot = buildRenewalFormSnapshot({
      periodFrom,
      periodTo,
      unitRate,
      renewalYears,
      lateFee,
      previousDues,
      productionDecimals,
      tableGenerated,
      periodRows,
      mmf,
      gst,
      total,
      totalConformingQty,
    });

    return {
      id: applicationId,
      project_id: row.id,
      client_id: row.client_id,
      application_date: isDraft ? null : new Date().toISOString().slice(0, 10),
      submission_mode: null,
      acknowledgment_number: null,
      bis_office: null,
      bis_desk_officer: null,
      marking_fee_rate: parseDecimal(unitRate) || null,
      marking_fee_quantity: totalConformingQty || null,
      marking_fee_total: total || null,
      fee_challan_number: null,
      fee_payment_date: null,
      fee_payment_mode: null,
      test_report_number: null,
      test_report_date: null,
      test_lab_name: null,
      test_lab_nabl_no: null,
      test_result: null,
      inspection_notice_date: null,
      inspection_date: null,
      bis_inspector_name: null,
      inspection_result: null,
      renewal_granted_date: null,
      new_validity_from: null,
      new_validity_to: null,
      renewal_status: isDraft ? "Initiated" : "Application Filed",
      notes: JSON.stringify(snapshot),
    };
  }

  function handleSaveDraft() {
    setSaveError(null);
    setSaveMessage(null);
    startSave(async () => {
      const res = await upsertRenewalApplication(buildRenewalPayload(true));
      if (!res.ok) {
        setSaveError(res.error);
        return;
      }
      setApplicationId(res.id);
      setSaveMessage("Draft saved");
      window.setTimeout(() => setSaveMessage(null), 2500);
    });
  }

  function handleSave() {
    setSaveError(null);
    setSaveMessage(null);
    if (!periodFrom || !periodTo) {
      setSaveError("Period covered (From and To) is required before saving.");
      return;
    }
    if (!tableGenerated || periodRows.length === 0) {
      setSaveError("Create the production table before saving.");
      return;
    }

    startSave(async () => {
      const res = await upsertRenewalApplication(buildRenewalPayload(false));
      if (!res.ok) {
        setSaveError(res.error);
        return;
      }
      setApplicationId(res.id);
      setSaveMessage("Renewal application saved");
      window.setTimeout(() => setSaveMessage(null), 2500);
    });
  }

  function buildExportData(): RenewalExportData {
    return {
      clientName: row.client_name,
      isNumber: formatIsDisplay(row.is_number, row.is_revision_year),
      cmLNumber: formatCmLDisplay(row.project_kind, row.cm_l_digits),
      isTitle: isCodeTitle,
      firmAddress,
      firmScale,
      mmfFee: minMmfDisplay,
      unit: unitOfProduction,
      validity: formatDate(row.license_validity_date),
      periodFrom,
      periodTo,
      unitRate: parseDecimal(unitRate),
      renewalYears,
      productionDecimals,
      hasProductionTable: tableGenerated && periodRows.length > 0,
      periodRows: periodRows.map((r) => ({
        from: r.from,
        to: r.to,
        totalProduction: parseDecimal(r.total_production),
        rejection: parseDecimal(r.rejection),
        conforming: rowConforming(r),
        approxValue: rowApproxValue(r, unitRate),
      })),
      productionTotals: {
        totalProduction: periodRows.reduce((sum, r) => sum + parseDecimal(r.total_production), 0),
        rejection: periodRows.reduce((sum, r) => sum + parseDecimal(r.rejection), 0),
        conforming: totalConformingQty,
        approxValue: periodRows.reduce((sum, r) => sum + rowApproxValue(r, unitRate), 0),
      },
      slabRows: slabRows.map((s) => ({
        label: s.label,
        rangeLabel: s.rangeLabel,
        quantity: s.quantity,
        rate: s.rate,
        amount: s.amount,
      })),
      mmf,
      applicationFee,
      annualLicenseFee,
      lateFee: lateFeeAmount,
      previousDues: previousDuesAmount,
      gst,
      total,
    };
  }

  function handleTakePrint() {
    setSaveError(null);
    if (!openRenewalPrintWindow(buildExportData())) {
      setSaveError("Unable to open print window. Please allow pop-ups for this site.");
    }
  }

  function handleDownloadExcel() {
    setSaveError(null);
    void downloadRenewalExcel(buildExportData()).catch(() =>
      setSaveError("Unable to download Excel file."),
    );
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="my-4 w-full max-w-5xl rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 bg-sky-50 px-6 py-4 dark:border-zinc-800 dark:bg-sky-950/20">
          <div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-white">Apply for Renewal</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-400 hover:bg-white dark:hover:bg-zinc-800">
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <div className="space-y-6 px-6 py-6">
          {/* Section 1: License Info — auto-filled, read-only */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <h3 className="text-xs font-bold tracking-wider text-zinc-400">License Information</h3>
              <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-400 dark:bg-zinc-800">Auto-filled</span>
            </div>

            {/* Line 1: Firm Name (2/4), IS + CM/L (1/4 each) */}
            <div className="grid grid-cols-4 gap-3">
              <div className="col-span-2">
                <ReadField label="Firm Name" value={row.client_name} />
              </div>
              <ReadField label="IS Number" value={formatIsDisplay(row.is_number, row.is_revision_year)} mono />
              <ReadField label="CM/L Number" value={formatCmLDisplay(row.project_kind, row.cm_l_digits)} mono />
            </div>

            {/* Line 2: IS Title */}
            <div className="mt-3">
              <ReadField label="Title of IS" value={isCodeTitle} />
            </div>

            {/* Line 3: Address */}
            <div className="mt-3">
              <ReadField label="Address of the Firm" value={firmAddress} />
            </div>

            {/* Line 4: Scale, MMF, Unit, Validity */}
            <div className="mt-3 grid grid-cols-4 gap-3">
              <ReadField label="Firm Scale" value={firmScale} />
              <ReadField label="MMF Fee" value={minMmfDisplay} />
              <ReadField label="Unit" value={unitOfProduction} />
              <ReadField label="Validity" value={formatDate(row.license_validity_date)} />
            </div>
          </div>

          {/* Period & report dates — single row */}
          <div>
            <h3 className="mb-3 text-xs font-bold tracking-wider text-zinc-400">Period Covered by Report</h3>
            <div className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] items-end gap-3">
              <Field label="From">
                <input type="date" value={periodFrom}
                  onChange={(e) => { setPeriodFrom(e.target.value); setTableGenerated(false); }}
                  className={inputCls} />
              </Field>
              <Field label="To">
                <input type="date" value={periodTo}
                  onChange={(e) => { setPeriodTo(e.target.value); setTableGenerated(false); }}
                  className={inputCls} />
              </Field>
              <Field label="Unit Rate">
                <CurrencyInput value={unitRate} onChange={setUnitRate} />
              </Field>
              <Field label="Period of Renewal">
                <select value={renewalYears} onChange={(e) => setRenewalYears(e.target.value)} className={inputCls}>
                  {[1, 2, 3, 4, 5].map((y) => (
                    <option key={y} value={String(y)}>{y} Year</option>
                  ))}
                </select>
              </Field>
              <button
                type="button"
                onClick={handleCreateTable}
                disabled={!periodFrom || !periodTo}
                className="inline-flex h-[37px] items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 6h18M3 14h18M3 18h18" />
                </svg>
                Create Table
              </button>
            </div>
          </div>

          {/* Section 3: Production Table (generated) */}
          {tableGenerated && periodRows.length > 0 && (
            <div>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-xs font-bold tracking-wider text-zinc-400">
                  Production Details (in Tonnes)
                </h3>
                <details className="relative shrink-0">
                  <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700/80 [&::-webkit-details-marker]:hidden">
                    <svg className="h-3.5 w-3.5 text-zinc-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                    Decimals
                  </summary>
                  <div className="absolute right-0 top-full z-10 mt-1 min-w-[9rem] rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
                    {[0, 1, 2, 3, 4].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => applyProductionDecimals(n)}
                        className={`block w-full px-3 py-1.5 text-left text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800 ${
                          productionDecimals === n
                            ? "font-semibold text-emerald-600 dark:text-emerald-400"
                            : "text-zinc-600 dark:text-zinc-300"
                        }`}
                      >
                        {n} decimal{n === 1 ? "" : "s"}
                      </button>
                    ))}
                  </div>
                </details>
              </div>
              <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
                <table className="renewal-form-table w-full min-w-[860px] table-fixed text-sm">
                  <colgroup>
                    <col className="w-[12%]" />
                    <col className="w-[12%]" />
                    <col className="w-[19%]" />
                    <col className="w-[11%]" />
                    <col className="w-[19%]" />
                    <col className="w-[17%]" />
                    <col className="w-[10%]" />
                  </colgroup>
                  <thead className="bg-zinc-50 dark:bg-zinc-800">
                    <tr>
                      <th className="border-b border-r border-zinc-200 px-3 py-2 text-center text-xs font-semibold normal-case whitespace-normal break-words leading-snug text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
                        From Date
                      </th>
                      <th className="border-b border-r border-zinc-200 px-3 py-2 text-center text-xs font-semibold normal-case whitespace-normal break-words leading-snug text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
                        To Date
                      </th>
                      <th className="border-b border-r border-zinc-200 px-3 py-2 text-center text-xs font-semibold normal-case whitespace-normal break-words leading-snug text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
                        Total Production of the Article Licensed for Certification Marking
                      </th>
                      <th className="border-b border-r border-zinc-200 px-3 py-2 text-center text-xs font-semibold normal-case whitespace-normal break-words leading-snug text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
                        Qualitative Rejection
                      </th>
                      <th className="border-b border-r border-zinc-200 px-3 py-2 text-center text-xs font-semibold normal-case whitespace-normal break-words leading-snug text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
                        Total Production of the Article Confirming to Indian Standards
                      </th>
                      <th className="border-b border-r border-zinc-200 px-3 py-2 text-center text-xs font-semibold normal-case whitespace-normal break-words leading-snug text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
                        Approx. Production Value (₹)
                      </th>
                      <th className="border-b border-zinc-200 px-2 py-2 text-center text-xs font-semibold normal-case text-zinc-600 dark:text-zinc-300">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {periodRows.map((r, i) => {
                      const conforming = rowConforming(r);
                      const approxValue = rowApproxValue(r, unitRate);
                      return (
                      <tr key={`${r.from}-${r.to}-${i}`} className={`hover:bg-zinc-50 dark:hover:bg-zinc-800/40 ${r.datesEditable ? "bg-sky-50/40 dark:bg-sky-950/10" : ""}`}>
                        <td className="border-r border-zinc-100 px-2 py-1.5 text-center dark:border-zinc-800">
                          {r.datesEditable ? (
                            <PeriodDateInput
                              value={r.from}
                              onChange={(ymd) => updatePeriodRowDate(i, "from", ymd)}
                            />
                          ) : (
                            <span className="font-mono text-xs text-zinc-700 dark:text-zinc-300">{fmtDMY(r.from)}</span>
                          )}
                        </td>
                        <td className="border-r border-zinc-100 px-2 py-1.5 text-center dark:border-zinc-800">
                          {r.datesEditable ? (
                            <PeriodDateInput
                              value={r.to}
                              onChange={(ymd) => updatePeriodRowDate(i, "to", ymd)}
                            />
                          ) : (
                            <span className="font-mono text-xs text-zinc-700 dark:text-zinc-300">{fmtDMY(r.to)}</span>
                          )}
                        </td>
                        <td className="border-r border-zinc-100 px-2 py-1.5 dark:border-zinc-800">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={r.total_production}
                            onChange={(e) => updatePeriodRow(i, "total_production", sanitizeDecimalInput(e.target.value))}
                            onBlur={() => blurProductionField(i, "total_production")}
                            placeholder="0"
                            className={tableInputCls}
                          />
                        </td>
                        <td className="border-r border-zinc-100 px-2 py-1.5 dark:border-zinc-800">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={r.rejection}
                            onChange={(e) => updatePeriodRow(i, "rejection", sanitizeDecimalInput(e.target.value))}
                            onBlur={() => blurProductionField(i, "rejection")}
                            placeholder="0"
                            className={tableInputCls}
                          />
                        </td>
                        <td className="border-r border-zinc-100 px-2 py-1.5 dark:border-zinc-800">
                          <input
                            type="text"
                            readOnly
                            tabIndex={-1}
                            value={formatProductionDecimal(conforming, productionDecimals)}
                            className={tableReadOnlyCls}
                          />
                        </td>
                        <td className="border-r border-zinc-100 px-2 py-1.5 dark:border-zinc-800">
                          <div className="flex overflow-hidden rounded border border-zinc-200 dark:border-zinc-700">
                            <span className="flex shrink-0 items-center border-r border-zinc-200 bg-zinc-50 px-1.5 text-xs font-medium text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-400">
                              ₹
                            </span>
                            <input
                              type="text"
                              readOnly
                              tabIndex={-1}
                              value={formatCurrencyDisplay(approxValue)}
                              className={`${tableReadOnlyCls} rounded-none border-0`}
                            />
                          </div>
                        </td>
                        <td className="px-1 py-1.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {!r.datesEditable ? (
                              <details className="relative inline-block">
                                <summary className="inline-flex cursor-pointer list-none items-center justify-center rounded border border-zinc-200 bg-white p-1 text-zinc-500 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 [&::-webkit-details-marker]:hidden" title="Split row">
                                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12M8 12h12M8 17h12M4 7h.01M4 12h.01M4 17h.01" />
                                  </svg>
                                </summary>
                                <div className="absolute right-0 top-full z-10 mt-1 min-w-[7rem] rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
                                  <button type="button" onClick={() => handleSplitRow(i, 2)} className="block w-full px-3 py-1.5 text-left text-xs text-zinc-600 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800">
                                    Split into 2
                                  </button>
                                  <button type="button" onClick={() => handleSplitRow(i, 3)} className="block w-full px-3 py-1.5 text-left text-xs text-zinc-600 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800">
                                    Split into 3
                                  </button>
                                </div>
                              </details>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleRemoveSplitRow(i)}
                                title="Remove split row"
                                className="inline-flex items-center justify-center rounded border border-red-200 bg-red-50 p-1 text-red-600 hover:bg-red-100 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-950/60"
                              >
                                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      );
                    })}
                    {/* Totals row */}
                    <tr className="bg-zinc-50 font-semibold dark:bg-zinc-800">
                      <td colSpan={2} className="border-r border-zinc-200 px-3 py-2 text-center text-xs font-bold text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
                        Total
                      </td>
                      {[
                        periodRows.reduce((sum, r) => sum + parseDecimal(r.total_production), 0),
                        periodRows.reduce((sum, r) => sum + parseDecimal(r.rejection), 0),
                        periodRows.reduce((sum, r) => sum + rowConforming(r), 0),
                        periodRows.reduce((sum, r) => sum + rowApproxValue(r, unitRate), 0),
                      ].map((total, fi) => (
                        <td key={fi} className={`px-3 py-2 text-right text-xs text-zinc-700 dark:text-zinc-300 ${fi < 3 ? "border-r border-zinc-200 dark:border-zinc-700" : ""}`}>
                          {fi === 3
                            ? `₹ ${formatCurrencyDisplay(total) || "0.00"}`
                            : formatProductionDecimalTotal(total, productionDecimals)}
                        </td>
                      ))}
                      <td />
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Section 4: Marking Fee Calculation */}
          <div>
            <h3 className="mb-3 text-xs font-bold tracking-wider text-zinc-400">Calculation of Marking Fee (Unit Rate Basis)</h3>

            <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
              <table className="renewal-form-table w-full min-w-[620px] text-sm">
                <thead className="bg-zinc-50 dark:bg-zinc-800">
                  <tr>
                    <th className="border-b border-zinc-200 px-3 py-2 text-left text-xs font-semibold normal-case text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">Slab</th>
                    <th className="border-b border-zinc-200 px-3 py-2 text-center text-xs font-semibold normal-case text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">Quantity</th>
                    <th className="border-b border-zinc-200 px-3 py-2 text-center text-xs font-semibold normal-case text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">Actual Quantity</th>
                    <th className="border-b border-zinc-200 px-3 py-2 text-center text-xs font-semibold normal-case text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">Rate</th>
                    <th className="border-b border-zinc-200 px-3 py-2 text-right text-xs font-semibold normal-case text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {slabRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-4 text-center text-xs text-zinc-400">IS code slab data not available.</td>
                    </tr>
                  ) : (
                    slabRows.map((s) => (
                      <tr key={s.label} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                        <td className="px-3 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300">{s.label}</td>
                        <td className="px-3 py-2 text-center text-xs text-zinc-600 dark:text-zinc-400">{s.rangeLabel}</td>
                        <td className="px-3 py-2 text-center font-mono text-xs text-zinc-700 dark:text-zinc-300">{formatQtyAmount(s.quantity)}</td>
                        <td className="px-3 py-2 text-center font-mono text-xs text-zinc-700 dark:text-zinc-300">{formatInrAmount(s.rate)}</td>
                        <td className="px-3 py-2 text-right font-mono text-xs font-semibold text-zinc-800 dark:text-zinc-200">{formatInrAmount(s.amount)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/40">
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between text-zinc-700 dark:text-zinc-300">
                  <span>Final Marking Fee Based on Production</span>
                  <span className="font-mono font-semibold">₹ {formatInrPlain(mmf)}</span>
                </div>
                <div className="flex items-center justify-between text-zinc-700 dark:text-zinc-300">
                  <span>Application Fee</span>
                  <span className="font-mono font-semibold">₹ {formatInrPlain(applicationFee)}</span>
                </div>
                <div className="flex items-center justify-between text-zinc-700 dark:text-zinc-300">
                  <span>Annual License Fee ({renewalYearsNum} Year{renewalYearsNum === 1 ? "" : "s"} × ₹ {formatInrPlain(ANNUAL_LICENSE_FEE_PER_YEAR)})</span>
                  <span className="font-mono font-semibold">₹ {formatInrPlain(annualLicenseFee)}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-zinc-600 dark:text-zinc-400">Late Fee</span>
                  <div className="w-44">
                    <CurrencyInput value={lateFee} onChange={setLateFee} />
                  </div>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-zinc-600 dark:text-zinc-400">Previous Due</span>
                  <div className="w-44">
                    <CurrencyInput value={previousDues} onChange={setPreviousDues} />
                  </div>
                </div>
                <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400">
                  <span>GST @ 18% (on MMF + Application Fee + Annual License Fee + Late Fee + Previous Due)</span>
                  <span className="font-mono">₹ {formatInrPlain(gst)}</span>
                </div>
                <div className="flex items-center justify-between border-t border-zinc-200 pt-3 font-bold text-zinc-900 dark:border-zinc-600 dark:text-white">
                  <span>Total Amount Payable to BIS</span>
                  <span className="font-mono">₹ {formatInrPlain(total)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-100 px-6 py-4 dark:border-zinc-800">
          {(saveError || saveMessage) && (
            <p className={`mb-3 text-sm ${saveError ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
              {saveError ?? saveMessage}
            </p>
          )}
          <div className="flex items-center justify-between">
          <button type="button" onClick={onClose} className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800">
            Cancel
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleTakePrint}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Take Print
            </button>
            <button
              type="button"
              onClick={handleDownloadExcel}
              className="rounded-lg border border-emerald-300 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
            >
              Download Excel
            </button>
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={saving}
              className="rounded-lg border border-sky-300 px-4 py-2 text-sm font-semibold text-sky-700 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-sky-700 dark:text-sky-400 dark:hover:bg-sky-950/30"
            >
              {saving ? "Saving…" : "Save Draft"}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-sky-700 dark:hover:bg-sky-600"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const inputCls = "w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 placeholder-zinc-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100";
const tableInputCls = "w-full rounded border border-zinc-200 bg-white px-2 py-1 text-right text-xs text-zinc-700 focus:border-sky-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200";
const tableReadOnlyCls = "w-full rounded border border-zinc-200 bg-zinc-50 px-2 py-1 text-right text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-300";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-zinc-500 dark:text-zinc-400">{label}</label>
      {children}
    </div>
  );
}

function ReadField({ label, value, mono, wrap }: { label: string; value: string; mono?: boolean; wrap?: boolean }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800/60">
      <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className={`mt-0.5 text-sm font-medium text-zinc-800 dark:text-zinc-100 ${mono ? "font-mono" : ""} ${wrap ? "whitespace-pre-line leading-snug" : "truncate"}`}>{value}</p>
    </div>
  );
}

function CurrencyInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [focused, setFocused] = useState(false);
  const display = focused
    ? value
    : value
      ? formatCurrencyDisplay(parseDecimal(value))
      : "";

  return (
    <div className="flex overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700">
      <span className="flex shrink-0 items-center border-r border-zinc-200 bg-zinc-50 px-3 text-sm font-medium tabular-nums text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-300">
        ₹
      </span>
      <input
        type="text"
        inputMode="decimal"
        value={display}
        placeholder="0.00"
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          const n = parseDecimal(value);
          if (n > 0) onChange(String(Math.round(n * 100) / 100));
        }}
        onChange={(e) => onChange(sanitizeDecimalInput(e.target.value))}
        className={`${inputCls} rounded-none border-0 focus:ring-0`}
      />
    </div>
  );
}

type SortKey = "client_name" | "is_number" | "license_number" | "license_validity_date" | "days_remaining";
type SortDir = "asc" | "desc";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  const icon = active ? (dir === "asc" ? "▲" : "▼") : "↕";
  return (
    <span className={`ml-1 inline-block text-[10px] ${active ? "text-sky-500" : "text-zinc-400"}`}>
      {icon}
    </span>
  );
}

// ── Main Section ──────────────────────────────────────────────────────────────
export function PendingRenewalsSection({ rows, sectionLabel = "Pending Renewals", emptyMsg = "No renewals due within 90 days.", extraHeaderButton }: { rows: RenewalRow[]; sectionLabel?: string; emptyMsg?: string; extraHeaderButton?: React.ReactNode }) {
  const [search, setSearch] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const [viewRow, setViewRow] = useState<RenewalRow | null>(null);
  const [renewalRow, setRenewalRow] = useState<RenewalRow | null>(null);
  const [isCodeView, setIsCodeView] = useState<{ id: string; is_number: string | null; revision_year: number | null } | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("days_remaining");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZE_OPTIONS[0]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
    setPage(1);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = rows.filter((r) =>
      !q ||
      r.client_name.toLowerCase().includes(q) ||
      formatCmLDisplay(r.project_kind, r.cm_l_digits).toLowerCase().includes(q) ||
      formatIsDisplay(r.is_number, r.is_revision_year).toLowerCase().includes(q)
    );
    list.sort((a, b) => {
      let va: string | number = "";
      let vb: string | number = "";
      if (sortKey === "days_remaining") {
        va = daysUntil(a.license_validity_date) ?? -9999;
        vb = daysUntil(b.license_validity_date) ?? -9999;
      } else if (sortKey === "license_validity_date") {
        va = a.license_validity_date ?? "";
        vb = b.license_validity_date ?? "";
      } else if (sortKey === "client_name") {
        va = a.client_name; vb = b.client_name;
      } else if (sortKey === "is_number") {
        va = formatIsDisplay(a.is_number, a.is_revision_year);
        vb = formatIsDisplay(b.is_number, b.is_revision_year);
      } else if (sortKey === "license_number") {
        va = formatCmLDisplay(a.project_kind, a.cm_l_digits);
        vb = formatCmLDisplay(b.project_kind, b.cm_l_digits);
      }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [rows, search, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <>
      <section className="rounded-2xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        {/* Header + controls */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-zinc-200 px-3 py-1.5 dark:border-zinc-800 lg:flex-nowrap">
          <h2 className="shrink-0 text-sm font-bold text-zinc-900 dark:text-white">{sectionLabel}</h2>

          <div className="relative w-full max-w-[min(100%,12rem)] shrink-0 sm:max-w-[14rem]">
            <svg className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-zinc-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full rounded-md border border-zinc-200 bg-zinc-50 py-1 pl-7 pr-2 text-xs text-zinc-800 placeholder-zinc-400 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>

          <span className="shrink-0 text-[11px] text-zinc-400 dark:text-zinc-500">
            {filtered.length} record{filtered.length !== 1 ? "s" : ""}
          </span>

          <label className="flex shrink-0 items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
            <span className="whitespace-nowrap">Show</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="rounded-md border border-zinc-200 bg-white py-1 pl-2 pr-6 text-[11px] font-medium text-zinc-700 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>{size} Entries</option>
              ))}
            </select>
          </label>

          <div className="flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded px-1.5 py-0.5 text-[11px] font-semibold text-zinc-500 hover:bg-zinc-100 disabled:opacity-30 dark:hover:bg-zinc-800"
            >
              ‹ Prev
            </button>
            <span className="rounded bg-zinc-100 px-2 py-0.5 text-[11px] font-bold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded px-1.5 py-0.5 text-[11px] font-semibold text-zinc-500 hover:bg-zinc-100 disabled:opacity-30 dark:hover:bg-zinc-800"
            >
              Next ›
            </button>
          </div>

          <div className="ml-auto flex shrink-0 flex-wrap items-center gap-2">
            {extraHeaderButton}
            <button
              type="button"
              onClick={() => setChatOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 shadow-sm transition-colors hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-300 dark:hover:bg-amber-950/50"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              Ask QE Assistant
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {rows.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-zinc-500">{emptyMsg}</p>
          ) : filtered.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-zinc-500">No renewals match your search.</p>
          ) : (
            <table className="w-full min-w-[760px] text-sm">
              <thead className="border-b border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/60">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    <button onClick={() => handleSort("client_name")} className="flex items-center hover:text-zinc-700 dark:hover:text-zinc-200">
                      Client Name<SortIcon active={sortKey === "client_name"} dir={sortDir} />
                    </button>
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    <button onClick={() => handleSort("is_number")} className="inline-flex items-center hover:text-zinc-700 dark:hover:text-zinc-200">
                      IS Number<SortIcon active={sortKey === "is_number"} dir={sortDir} />
                    </button>
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    <button onClick={() => handleSort("license_number")} className="inline-flex items-center hover:text-zinc-700 dark:hover:text-zinc-200">
                      CM/L Number<SortIcon active={sortKey === "license_number"} dir={sortDir} />
                    </button>
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    <button onClick={() => handleSort("license_validity_date")} className="inline-flex items-center hover:text-zinc-700 dark:hover:text-zinc-200">
                      Validity<SortIcon active={sortKey === "license_validity_date"} dir={sortDir} />
                    </button>
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    <button onClick={() => handleSort("days_remaining")} className="inline-flex items-center hover:text-zinc-700 dark:hover:text-zinc-200">
                      Days Remaining<SortIcon active={sortKey === "days_remaining"} dir={sortDir} />
                    </button>
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-zinc-500 dark:text-zinc-400">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {paginated.map((r) => (
                  <tr key={r.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                    <td className="px-4 py-2 text-left">
                      <button
                        type="button"
                        onClick={() => setViewRow(r)}
                        className="text-left text-sm font-semibold text-sky-700 hover:underline dark:text-sky-400"
                      >
                        {r.client_name}
                      </button>
                    </td>
                    <td className="px-4 py-2 text-center font-mono text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                      {r.is_code_id && r.is_number ? (
                        <button
                          type="button"
                          onClick={() => setIsCodeView({ id: r.is_code_id!, is_number: r.is_number, revision_year: r.is_revision_year })}
                          className="font-mono text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                        >
                          {formatIsDisplay(r.is_number, r.is_revision_year)}
                        </button>
                      ) : (
                        formatIsDisplay(r.is_number, r.is_revision_year)
                      )}
                    </td>
                    <td className="px-4 py-2 text-center font-mono text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                      {formatCmLDisplay(r.project_kind, r.cm_l_digits)}
                    </td>
                    <td className="px-4 py-2 text-center text-xs text-zinc-700 dark:text-zinc-300">
                      {formatDate(r.license_validity_date)}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <ExpiryBadge dateStr={r.license_validity_date} />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => setRenewalRow(r)}
                        title="Apply for Renewal"
                        className="group inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-700 shadow-sm transition-all hover:border-emerald-400 hover:bg-emerald-100 hover:shadow-md active:scale-95 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400 dark:hover:bg-emerald-950/50"
                      >
                        <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="text-xs font-bold uppercase tracking-wide whitespace-nowrap">Renew</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Modals */}
      {viewRow && <ClientSnapshotModal row={viewRow} onClose={() => setViewRow(null)} />}
      {renewalRow && <RenewalFormModal row={renewalRow} onClose={() => setRenewalRow(null)} />}
      {isCodeView && (
        <IsCodeViewModal
          isCodeId={isCodeView.id}
          isNumber={isCodeView.is_number}
          revisionYear={isCodeView.revision_year}
          onClose={() => setIsCodeView(null)}
        />
      )}

      {chatOpen && (
        <AiChatModal
          title="QE Assistant"
          subtitle="BIS License Renewals · AI Powered"
          systemPrompt={RENEWAL_SYSTEM_PROMPT}
          starterQuestions={RENEWAL_STARTERS}
          accentColor="emerald"
          onClose={() => setChatOpen(false)}
        />
      )}
    </>
  );
}
