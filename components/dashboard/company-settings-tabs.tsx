"use client";

import { type ReactNode, useState } from "react";
import { CompanyNotesTab } from "@/components/dashboard/company-notes-tab";
import { CompanyScopeOfWorkTab } from "@/components/dashboard/company-scope-of-work-tab";
import { CompanyTermsTab } from "@/components/dashboard/company-terms-tab";
import { updateCompanySettings } from "@/lib/actions/settings";
import type { CompanyTermsRow } from "@/lib/types/company-terms";
import type { CompanyTextTemplateRow } from "@/lib/types/company-text-template";

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
  const [tab, setTab] = useState<TabId>("company");
  const isBaseSettingsTab = tab === "company" || tab === "bank" || tab === "images";

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
    <div className="mx-auto max-w-[1400px] space-y-6">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Company Settings
      </h1>

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
