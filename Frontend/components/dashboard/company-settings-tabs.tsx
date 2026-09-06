"use client";

import { type ReactNode, useState } from "react";
import { CompanyNotesTab } from "@/components/dashboard/company-notes-tab";
import { CompanyScopeOfWorkTab } from "@/components/dashboard/company-scope-of-work-tab";
import { CompanyTermsTab } from "@/components/dashboard/company-terms-tab";
import { updateCompanySettings } from "@backend/actions/settings";
import type { CompanyTermsRow } from "@backend/shared/types/company-terms";
import type { CompanyTextTemplateRow } from "@backend/shared/types/company-text-template";

const inp =
  "block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100";

const fileInp =
  `${inp} file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-zinc-800 hover:file:bg-zinc-200 dark:file:bg-zinc-800 dark:file:text-zinc-100 dark:hover:file:bg-zinc-700`;

function ImageUploadCard({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/60">
      {children}
    </div>
  );
}

const TABS = [
  { id: "company" as const, label: "Company Details" },
  { id: "bank" as const, label: "Bank Details" },
  { id: "images" as const, label: "Company Images" },
  { id: "print" as const, label: "Print & Page Settings" },
  { id: "terms" as const, label: "Term & Condition" },
  { id: "scope" as const, label: "Scope of Work" },
  { id: "notes" as const, label: "Notes" },
];

type TabId = (typeof TABS)[number]["id"];

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function ImageFieldPreview({
  label,
  signedUrl,
  path,
}: {
  label: string;
  signedUrl: string | null;
  path: string | null;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</p>
      {signedUrl ? (
        <img
          src={signedUrl}
          alt=""
          className="max-h-40 max-w-full rounded-md border border-zinc-200 object-contain dark:border-zinc-700"
        />
      ) : path ? (
        <p className="break-all text-xs text-zinc-500">Stored: {path}</p>
      ) : (
        <p className="text-xs text-zinc-400">No file uploaded yet.</p>
      )}
    </div>
  );
}

export function CompanySettingsTabs({
  errMsg,
  saved,
  initialTab,
  r,
  logoUrl,
  letterUpperUrl,
  letterLowerUrl,
  sealUrl,
  upiQrUrl,
  chequeUrl,
  termsRows,
  scopeRows,
  notesRows,
}: {
  errMsg: string | null;
  saved?: boolean;
  initialTab?: string;
  r: Record<string, string | null | undefined> | null;
  logoUrl: string | null;
  letterUpperUrl: string | null;
  letterLowerUrl: string | null;
  sealUrl: string | null;
  upiQrUrl: string | null;
  chequeUrl: string | null;
  termsRows: CompanyTermsRow[];
  scopeRows: CompanyTextTemplateRow[];
  notesRows: CompanyTextTemplateRow[];
}) {
  const validTabIds = TABS.map((t) => t.id) as string[];
  const startTab = (
    initialTab && validTabIds.includes(initialTab) ? initialTab : "company"
  ) as TabId;
  const [tab, setTab] = useState<TabId>(startTab);
  const isBaseSettingsTab = tab === "company" || tab === "bank" || tab === "images" || tab === "print";

  const tabBtn = (id: TabId, label: string) => {
    const active = tab === id;
    return (
      <button
        key={id}
        type="button"
        onClick={() => setTab(id)}
        className={`shrink-0 rounded-md px-3 py-2 text-sm font-medium transition ${
          active
            ? "bg-sky-50 text-sky-900 ring-1 ring-sky-200/80 dark:bg-sky-950/50 dark:text-sky-100 dark:ring-sky-800"
            : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
        }`}
        aria-selected={active}
        role="tab"
      >
        {label}
      </button>
    );
  };

  return (
    <div className="w-full max-w-none space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Company Settings
        </h1>
        {saved ? (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
            Settings saved successfully.
          </p>
        ) : null}
      </div>

      {errMsg ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {errMsg}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div
          className="flex gap-1 overflow-x-auto border-b border-zinc-200 bg-zinc-50/90 px-2 py-2 dark:border-zinc-800 dark:bg-zinc-900/80"
          role="tablist"
          aria-label="Company settings sections"
        >
          {TABS.map((t) => tabBtn(t.id, t.label))}
        </div>

        <div className="p-6">
          {isBaseSettingsTab ? (
            <form action={updateCompanySettings}>
              <input type="hidden" name="settings_tab" value={tab} />
              <div
                className={tab === "company" ? "space-y-4" : "hidden"}
                role="tabpanel"
              >
                <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Name of the company
                </label>
                <input
                  name="company_name"
                  defaultValue={str(r?.company_name)}
                  className={inp}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Address of the company
                </label>
                <textarea
                  name="address"
                  rows={3}
                  defaultValue={str(r?.address)}
                  className={inp}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  GST number of company
                </label>
                <input
                  name="gst_number"
                  defaultValue={str(r?.gst_number)}
                  className={inp}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Contact person name
                </label>
                <input
                  name="contact_person_name"
                  defaultValue={str(r?.contact_person_name)}
                  className={inp}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Email ID of company
                </label>
                <input
                  name="email"
                  type="email"
                  defaultValue={str(r?.email)}
                  className={inp}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Mobile number of company
                </label>
                <input
                  name="phone"
                  defaultValue={str(r?.phone)}
                  className={inp}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Website
                </label>
                <input
                  name="website"
                  type="url"
                  defaultValue={str(r?.website)}
                  placeholder="https://www.yourcompany.com"
                  className={inp}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  City of company
                </label>
                <input
                  name="company_city"
                  defaultValue={str(r?.company_city) || "Raipur"}
                  className={inp}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  PIN code of company
                </label>
                <input
                  name="company_pin_code"
                  defaultValue={str(r?.company_pin_code) || "493221"}
                  className={inp}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  State of company
                </label>
                <input
                  name="company_state"
                  defaultValue={str(r?.company_state) || "Chhattisgarh"}
                  className={inp}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Country of company
                </label>
                <input
                  name="company_country"
                  defaultValue={str(r?.company_country) || "India"}
                  className={inp}
                />
              </div>
                </div>
              </div>

              <div
                className={tab === "bank" ? "space-y-4" : "hidden"}
                role="tabpanel"
              >
                <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Name of account holder
                </label>
                <input
                  name="bank_account_holder_name"
                  defaultValue={str(r?.bank_account_holder_name)}
                  className={inp}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Bank account no.
                </label>
                <input
                  name="bank_account_number"
                  defaultValue={str(r?.bank_account_number)}
                  className={inp}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Branch name
                </label>
                <input
                  name="bank_branch_name"
                  defaultValue={str(r?.bank_branch_name)}
                  className={inp}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  IFSC code
                </label>
                <input
                  name="bank_ifsc"
                  defaultValue={str(r?.bank_ifsc)}
                  className={inp}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  SWIFT code
                </label>
                <input
                  name="bank_swift"
                  defaultValue={str(r?.bank_swift)}
                  className={inp}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  UPI number
                </label>
                <input
                  name="bank_upi_id"
                  defaultValue={str(r?.bank_upi_id)}
                  className={inp}
                />
              </div>
              <input
                type="hidden"
                name="bank_upi_qr_path"
                value={str(r?.bank_upi_qr_path)}
              />
              <div className="space-y-2 sm:col-span-2">
                <ImageFieldPreview
                  label="UPI QR code (current)"
                  signedUrl={upiQrUrl}
                  path={r?.bank_upi_qr_path ?? null}
                />
                <label className="mt-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Upload / replace UPI QR (image)
                </label>
                <input
                  name="file_bank_upi_qr"
                  type="file"
                  accept="image/*"
                  className={inp}
                />
              </div>
              <input
                type="hidden"
                name="bank_cheque_image_path"
                value={str(r?.bank_cheque_image_path)}
              />
              <div className="space-y-2 sm:col-span-2">
                <ImageFieldPreview
                  label="Cheque book (current)"
                  signedUrl={chequeUrl}
                  path={r?.bank_cheque_image_path ?? null}
                />
                <label className="mt-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Upload / replace cheque sample (image)
                </label>
                <input
                  name="file_bank_cheque"
                  type="file"
                  accept="image/*"
                  className={inp}
                />
              </div>
                </div>
              </div>

              <div
                className={tab === "images" ? "space-y-8" : "hidden"}
                role="tabpanel"
              >
                <input
                  type="hidden"
                  name="letterhead_upper_path"
                  value={str(r?.letterhead_upper_path)}
                />
                <input
                  type="hidden"
                  name="letterhead_lower_path"
                  value={str(r?.letterhead_lower_path)}
                />
                <input
                  type="hidden"
                  name="seal_sign_image_path"
                  value={str(r?.seal_sign_image_path)}
                />
                <input type="hidden" name="logo_path" value={str(r?.logo_path)} />

                <div className="grid gap-6 sm:grid-cols-2 lg:gap-8">
              <ImageUploadCard>
                <ImageFieldPreview
                  label="Letter head upper"
                  signedUrl={letterUpperUrl}
                  path={r?.letterhead_upper_path ?? null}
                />
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Replace image
                </label>
                <input
                  name="file_letterhead_upper"
                  type="file"
                  accept="image/*"
                  className={fileInp}
                />
              </ImageUploadCard>

              <ImageUploadCard>
                <ImageFieldPreview
                  label="Letter head lower"
                  signedUrl={letterLowerUrl}
                  path={r?.letterhead_lower_path ?? null}
                />
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Replace image
                </label>
                <input
                  name="file_letterhead_lower"
                  type="file"
                  accept="image/*"
                  className={fileInp}
                />
              </ImageUploadCard>

              <ImageUploadCard>
                <ImageFieldPreview
                  label="Seal & sign"
                  signedUrl={sealUrl}
                  path={r?.seal_sign_image_path ?? null}
                />
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Replace image
                </label>
                <input
                  name="file_seal_sign"
                  type="file"
                  accept="image/*"
                  className={fileInp}
                />
              </ImageUploadCard>

              <ImageUploadCard>
                <ImageFieldPreview
                  label="Company logo"
                  signedUrl={logoUrl}
                  path={r?.logo_path ?? null}
                />
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Replace image
                </label>
                <input
                  name="file_company_logo"
                  type="file"
                  accept="image/*"
                  className={fileInp}
                />
              </ImageUploadCard>
                </div>
              </div>

              {/* ── Print & Page Settings tab ─────────────────────────── */}
              <div
                className={tab === "print" ? "space-y-6" : "hidden"}
                role="tabpanel"
              >
                {/* Hidden fields to keep other tabs' values */}
                <input type="hidden" name="print_paper_size"           defaultValue={str(r?.print_paper_size) || "A4"} />
                <input type="hidden" name="print_orientation"          defaultValue={str(r?.print_orientation) || "portrait"} />
                <input type="hidden" name="print_margin_top"           defaultValue={str(r?.print_margin_top) || "10"} />
                <input type="hidden" name="print_margin_bottom"        defaultValue={str(r?.print_margin_bottom) || "10"} />
                <input type="hidden" name="print_margin_left"          defaultValue={str(r?.print_margin_left) || "10"} />
                <input type="hidden" name="print_margin_right"         defaultValue={str(r?.print_margin_right) || "10"} />
                <input type="hidden" name="print_font_family"          defaultValue={str(r?.print_font_family) || "Arial"} />
                <input type="hidden" name="print_primary_color"        defaultValue={str(r?.print_primary_color) || "#1e3a8a"} />
                <input type="hidden" name="print_show_letterhead"      defaultValue={String(r?.print_show_letterhead ?? "true")} />
                <input type="hidden" name="print_letterhead_layout"    defaultValue={str(r?.print_letterhead_layout) || "logo-left"} />
                <input type="hidden" name="print_letterhead_tagline"   defaultValue={str(r?.print_letterhead_tagline)} />
                <input type="hidden" name="print_letterhead_show_address" defaultValue={String(r?.print_letterhead_show_address ?? "true")} />
                <input type="hidden" name="print_letterhead_show_contact" defaultValue={String(r?.print_letterhead_show_contact ?? "true")} />
                <input type="hidden" name="print_letterhead_show_gst"     defaultValue={String(r?.print_letterhead_show_gst ?? "true")} />
                <input type="hidden" name="print_footer_left"          defaultValue={str(r?.print_footer_left)} />
                <input type="hidden" name="print_footer_center"        defaultValue={str(r?.print_footer_center)} />
                <input type="hidden" name="print_footer_right"         defaultValue={str(r?.print_footer_right) || "Page {page} of {total}"} />
                <input type="hidden" name="print_show_page_numbers"    defaultValue={String(r?.print_show_page_numbers ?? "true")} />
                <input type="hidden" name="print_show_footer_line"     defaultValue={String(r?.print_show_footer_line ?? "true")} />

                {/* ── Page Settings ───── */}
                <fieldset className="space-y-4">
                  <legend className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Page Settings</legend>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Paper Size</label>
                      <select name="print_paper_size" defaultValue={str(r?.print_paper_size) || "A4"} className={inp}>
                        <option value="A4">A4 (210×297 mm)</option>
                        <option value="A5">A5 (148×210 mm)</option>
                        <option value="Letter">Letter (8.5×11 in)</option>
                        <option value="Legal">Legal (8.5×14 in)</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Orientation</label>
                      <select name="print_orientation" defaultValue={str(r?.print_orientation) || "portrait"} className={inp}>
                        <option value="portrait">Portrait</option>
                        <option value="landscape">Landscape</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Font Family</label>
                      <select name="print_font_family" defaultValue={str(r?.print_font_family) || "Arial"} className={inp}>
                        <option value="Arial">Arial</option>
                        <option value="Times New Roman">Times New Roman</option>
                        <option value="Georgia">Georgia</option>
                        <option value="Calibri">Calibri</option>
                        <option value="Verdana">Verdana</option>
                        <option value="Inter">Inter</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Primary Colour</label>
                      <div className="flex items-center gap-3">
                        <input type="color" name="print_primary_color" defaultValue={str(r?.print_primary_color) || "#1e3a8a"} className="h-10 w-20 cursor-pointer rounded-lg border border-zinc-300 dark:border-zinc-700" />
                        <span className="text-sm text-zinc-500">Used for headings, table headers, borders</span>
                      </div>
                    </div>
                  </div>
                </fieldset>

                {/* ── Margins ───── */}
                <fieldset className="space-y-4">
                  <legend className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Margins (mm)</legend>
                  <div className="grid gap-4 sm:grid-cols-4">
                    {(["top","bottom","left","right"] as const).map((side) => (
                      <div key={side} className="space-y-2">
                        <label className="text-sm font-medium capitalize text-zinc-700 dark:text-zinc-300">{side}</label>
                        <input type="number" name={`print_margin_${side}`} defaultValue={str(r?.[`print_margin_${side}`]) || "10"} min={0} max={50} className={inp} />
                      </div>
                    ))}
                  </div>
                </fieldset>

                {/* ── Letterhead ───── */}
                <fieldset className="space-y-4">
                  <legend className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Letterhead</legend>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" name="print_show_letterhead" id="ps_show_lh" defaultChecked={str(r?.print_show_letterhead) !== "false"} className="h-4 w-4 accent-sky-600" />
                    <label htmlFor="ps_show_lh" className="text-sm text-zinc-700 dark:text-zinc-300">Show letterhead on all documents</label>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Logo / Header Position</label>
                      <select name="print_letterhead_layout" defaultValue={str(r?.print_letterhead_layout) || "logo-left"} className={inp}>
                        <option value="logo-left">Logo Left, Info Right</option>
                        <option value="logo-center">Logo + Info Centred</option>
                        <option value="logo-right">Info Left, Logo Right</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Company Tagline</label>
                      <input type="text" name="print_letterhead_tagline" defaultValue={str(r?.print_letterhead_tagline)} placeholder="e.g. ISO 9001 Certified" className={inp} />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    {[
                      { name: "print_letterhead_show_address", id: "ps_addr", label: "Show address" },
                      { name: "print_letterhead_show_contact", id: "ps_contact", label: "Show email & phone" },
                      { name: "print_letterhead_show_gst", id: "ps_gst", label: "Show GST number" },
                    ].map((f) => (
                      <label key={f.id} className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                        <input type="checkbox" id={f.id} name={f.name} defaultChecked={str(r?.[f.name]) !== "false"} className="h-4 w-4 accent-sky-600" />
                        {f.label}
                      </label>
                    ))}
                  </div>
                </fieldset>

                {/* ── Footer ───── */}
                <fieldset className="space-y-4">
                  <legend className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Footer</legend>
                  <div className="flex flex-wrap gap-4">
                    {[
                      { name: "print_show_footer_line", id: "ps_ftline", label: "Show footer separator line" },
                      { name: "print_show_page_numbers", id: "ps_pgnum", label: "Show page numbers" },
                    ].map((f) => (
                      <label key={f.id} className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                        <input type="checkbox" id={f.id} name={f.name} defaultChecked={str(r?.[f.name]) !== "false"} className="h-4 w-4 accent-sky-600" />
                        {f.label}
                      </label>
                    ))}
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Footer — Left</label>
                      <input type="text" name="print_footer_left" defaultValue={str(r?.print_footer_left)} placeholder="{company} or custom text" className={inp} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Footer — Centre</label>
                      <input type="text" name="print_footer_center" defaultValue={str(r?.print_footer_center)} placeholder="e.g. Confidential" className={inp} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Footer — Right (page numbers)</label>
                      <input type="text" name="print_footer_right" defaultValue={str(r?.print_footer_right) || "Page {page} of {total}"} placeholder="Page {page} of {total}" className={inp} />
                    </div>
                  </div>
                  <p className="text-xs text-zinc-500">Use <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">{"{company}"}</code>, <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">{"{gst}"}</code>, <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">{"{page}"}</code>, <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">{"{total}"}</code> as placeholders.</p>
                </fieldset>
              </div>

              <div className="mt-6 border-t border-zinc-200 bg-zinc-50/80 px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900/60">
                <button
                  type="submit"
                  className="rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-sky-500"
                >
                  Save Company Setting
                </button>
              </div>
            </form>
          ) : null}

          {tab === "terms" ? (
            <div className="space-y-4" role="tabpanel">
              <CompanyTermsTab terms={termsRows} />
            </div>
          ) : null}

          {tab === "scope" ? (
            <div className="space-y-4" role="tabpanel">
              <CompanyScopeOfWorkTab rows={scopeRows} />
            </div>
          ) : null}

          {tab === "notes" ? (
            <div className="space-y-4" role="tabpanel">
              <CompanyNotesTab rows={notesRows} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
