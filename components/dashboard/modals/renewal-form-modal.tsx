"use client";

import { useEffect, useState, useTransition } from "react";
import {
  fetchRenewalApplication,
  fetchProjectDetail,
  upsertRenewalApplication,
  type RenewalApplication,
  type ProjectDetail,
} from "@/lib/actions/renewals";

type Step = "application" | "fee" | "test" | "inspection" | "grant";

const STEPS: { key: Step; label: string; icon: string }[] = [
  { key: "application", label: "Application", icon: "📋" },
  { key: "fee", label: "Marking Fee", icon: "💰" },
  { key: "test", label: "Test Report", icon: "🧪" },
  { key: "inspection", label: "Inspection", icon: "🔍" },
  { key: "grant", label: "Renewal Grant", icon: "✅" },
];

const RENEWAL_STATUSES = [
  "Initiated",
  "Application Filed",
  "Fee Paid",
  "Test Report Submitted",
  "Inspection Scheduled",
  "Inspection Done",
  "Renewal Granted",
  "Rejected",
];

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-800/40">
      <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{title}</h3>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">{children}</div>
    </div>
  );
}

function FInput({
  label,
  value,
  onChange,
  onBlur,
  type = "text",
  className = "",
  readOnly = false,
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  onBlur?: () => void;
  type?: string;
  className?: string;
  readOnly?: boolean;
}) {
  return (
    <div className={className}>
      <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400">{label}</label>
      <input
        type={type}
        value={value}
        readOnly={readOnly}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        onBlur={onBlur}
        className={`mt-0.5 w-full rounded-lg border px-3 py-1.5 text-sm outline-none ${
          readOnly
            ? "border-zinc-100 bg-zinc-100 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-400"
            : "border-zinc-200 bg-white text-zinc-800 focus:border-sky-400 focus:ring-1 focus:ring-sky-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        }`}
      />
    </div>
  );
}

function FSelect({
  label,
  value,
  onChange,
  options,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-0.5 w-full rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-800 outline-none focus:border-sky-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
      >
        <option value="">— Select —</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

export function RenewalFormModal({
  projectId,
  clientId,
  clientName,
  onClose,
  onSaved,
}: {
  projectId: string;
  clientId: string | null;
  clientName: string;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const [step, setStep] = useState<Step>("application");
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, startSave] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState<RenewalApplication>({
    project_id: projectId,
    client_id: clientId,
    application_date: null,
    submission_mode: null,
    acknowledgment_number: null,
    bis_office: null,
    bis_desk_officer: null,
    marking_fee_rate: null,
    marking_fee_quantity: null,
    marking_fee_total: null,
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
    renewal_status: "Initiated",
    notes: null,
  });

  useEffect(() => {
    Promise.all([
      fetchProjectDetail(projectId),
      fetchRenewalApplication(projectId),
    ]).then(([proj, app]) => {
      setProject(proj);
      if (app) setForm({ ...form, ...app });
      setLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  function f(k: keyof RenewalApplication) {
    const v = form[k];
    return v != null ? String(v) : "";
  }

  function set(k: keyof RenewalApplication) {
    return (v: string) => setForm((p) => ({ ...p, [k]: v || null }));
  }

  function setNum(k: keyof RenewalApplication) {
    return (v: string) => setForm((p) => ({ ...p, [k]: v ? parseFloat(v) : null }));
  }

  function autoCalcTotal() {
    const rate = parseFloat(f("marking_fee_rate")) || 0;
    const qty = parseFloat(f("marking_fee_quantity")) || 0;
    if (rate && qty) {
      setForm((p) => ({ ...p, marking_fee_total: rate * qty }));
    }
  }

  function handleSave() {
    setError(null);
    startSave(async () => {
      const res = await upsertRenewalApplication(form);
      if (!res.ok) { setError(res.error); return; }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      onSaved?.();
    });
  }

  const cmL = project?.cm_l_digits ? `CM/L ${project.cm_l_digits}` : "—";
  const isCode = project?.is_code_number ? `IS ${project.is_code_number}` : "—";

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-zinc-200 bg-gradient-to-r from-indigo-50 to-violet-50 px-6 py-4 dark:border-zinc-700 dark:from-indigo-950/20 dark:to-violet-950/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white text-lg">
                📋
              </div>
              <div>
                <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">BIS License Renewal Application</h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{clientName} · {cmL} · {isCode}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {saved && <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Saved ✓</span>}
              <div>
                <label className="block text-xs text-zinc-500 dark:text-zinc-400">Status</label>
                <select
                  value={f("renewal_status")}
                  onChange={(e) => setForm((p) => ({ ...p, renewal_status: e.target.value }))}
                  className="rounded-lg border border-indigo-200 bg-white/80 px-2 py-1 text-xs font-semibold text-indigo-700 outline-none dark:border-indigo-700 dark:bg-zinc-800 dark:text-indigo-300"
                >
                  {RENEWAL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-zinc-400 hover:bg-white hover:text-zinc-600 dark:hover:bg-zinc-700">
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>

          {/* Step tabs */}
          <div className="mt-3 flex gap-1">
            {STEPS.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setStep(s.key)}
                className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  step === s.key
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-white/60 text-zinc-600 hover:bg-white dark:bg-zinc-800/60 dark:text-zinc-400 dark:hover:bg-zinc-700"
                }`}
              >
                <span>{s.icon}</span>
                <span className="hidden sm:inline">{s.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* License details banner */}
        {project && (
          <div className="grid grid-cols-4 gap-px bg-zinc-100 dark:bg-zinc-800">
            {[
              { label: "CM/L No.", value: cmL },
              { label: "IS Standard", value: isCode },
              { label: "Current Validity", value: project.license_validity_date ? new Date(project.license_validity_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—" },
              { label: "Handled By", value: project.case_handled_by },
            ].map((item) => (
              <div key={item.label} className="bg-white px-4 py-2 dark:bg-zinc-900">
                <p className="text-xs text-zinc-400 dark:text-zinc-500">{item.label}</p>
                <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">{item.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-sm text-zinc-400">Loading…</div>
          ) : (
            <>
              {step === "application" && (
                <SectionCard title="Application to BIS">
                  <FInput label="Date of Application" value={f("application_date")} onChange={set("application_date")} type="date" />
                  <FSelect label="Submission Mode" value={f("submission_mode")} onChange={set("submission_mode")}
                    options={["Online (MANAK)", "Offline", "By Post", "Email"]} />
                  <FInput label="Acknowledgment Number" value={f("acknowledgment_number")} onChange={set("acknowledgment_number")} />
                  <FInput label="BIS Office" value={f("bis_office")} onChange={set("bis_office")} />
                  <FInput label="BIS Desk Officer" value={f("bis_desk_officer")} onChange={set("bis_desk_officer")} className="col-span-2" />
                </SectionCard>
              )}

              {step === "fee" && (
                <SectionCard title="Marking Fee Details">
                  <FInput label="Rate per Unit (₹)" value={f("marking_fee_rate")} onChange={setNum("marking_fee_rate")} type="number"
                    onBlur={autoCalcTotal} />
                  <FInput label="Quantity (units)" value={f("marking_fee_quantity")} onChange={setNum("marking_fee_quantity")} type="number" />
                  <FInput label="Total Marking Fee (₹)" value={f("marking_fee_total")} onChange={setNum("marking_fee_total")} type="number" />
                  <FSelect label="Payment Mode" value={f("fee_payment_mode")} onChange={set("fee_payment_mode")}
                    options={["Online (NEFT/RTGS)", "Demand Draft", "Cheque", "UPI"]} />
                  <FInput label="Challan / DD Number" value={f("fee_challan_number")} onChange={set("fee_challan_number")} />
                  <FInput label="Payment Date" value={f("fee_payment_date")} onChange={set("fee_payment_date")} type="date" />
                </SectionCard>
              )}

              {step === "test" && (
                <SectionCard title="Test Report Details">
                  <FInput label="Test Report Number" value={f("test_report_number")} onChange={set("test_report_number")} />
                  <FInput label="Report Date" value={f("test_report_date")} onChange={set("test_report_date")} type="date" />
                  <FInput label="Laboratory Name" value={f("test_lab_name")} onChange={set("test_lab_name")} className="col-span-2" />
                  <FInput label="Lab NABL Accreditation No." value={f("test_lab_nabl_no")} onChange={set("test_lab_nabl_no")} />
                  <FSelect label="Test Result" value={f("test_result")} onChange={set("test_result")}
                    options={["Conforming", "Non-Conforming", "Pending"]} />
                </SectionCard>
              )}

              {step === "inspection" && (
                <SectionCard title="Factory / Grant of Inspection">
                  <FInput label="Inspection Notice Date" value={f("inspection_notice_date")} onChange={set("inspection_notice_date")} type="date" />
                  <FInput label="Inspection Date" value={f("inspection_date")} onChange={set("inspection_date")} type="date" />
                  <FInput label="BIS Inspector Name" value={f("bis_inspector_name")} onChange={set("bis_inspector_name")} />
                  <FSelect label="Inspection Result" value={f("inspection_result")} onChange={set("inspection_result")}
                    options={["Satisfactory", "Unsatisfactory", "Conditionally Satisfactory", "Pending"]} />
                </SectionCard>
              )}

              {step === "grant" && (
                <div className="space-y-4">
                  <SectionCard title="Renewal Grant">
                    <FInput label="Renewal Granted Date" value={f("renewal_granted_date")} onChange={set("renewal_granted_date")} type="date" />
                    <FInput label="New Validity From" value={f("new_validity_from")} onChange={set("new_validity_from")} type="date" />
                    <FInput label="New Validity To" value={f("new_validity_to")} onChange={set("new_validity_to")} type="date" className="col-span-2" />
                  </SectionCard>
                  {form.new_validity_to && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
                      ✓ Saving will update the license validity in the project to <strong>{new Date(form.new_validity_to).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}</strong> and mark the project as completed.
                    </div>
                  )}
                  <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-800/40">
                    <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Notes</h3>
                    <textarea
                      value={f("notes")}
                      onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value || null }))}
                      rows={3}
                      placeholder="Any additional notes about this renewal…"
                      className="w-full resize-none rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 outline-none focus:border-sky-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-100 px-6 py-4 dark:border-zinc-800">
          {error && (
            <p className="mb-2 text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {STEPS.findIndex((s) => s.key === step) > 0 && (
                <button type="button"
                  onClick={() => setStep(STEPS[STEPS.findIndex((s) => s.key === step) - 1].key)}
                  className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300">
                  ← Previous
                </button>
              )}
              {STEPS.findIndex((s) => s.key === step) < STEPS.length - 1 && (
                <button type="button"
                  onClick={() => setStep(STEPS[STEPS.findIndex((s) => s.key === step) + 1].key)}
                  className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300">
                  Next →
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save Renewal Form"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
