"use client";

import { useRef, useState, type ChangeEvent } from "react";
import {
  createTopManagementRow,
  type TopManagementRow,
} from "@backend/modules/bis/top-management";
import { removeSignatureImageBackground } from "@backend/shared/signature-image-background";

const fieldInputClass =
  "mt-1.5 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30";

const fieldLabelClass =
  "block text-xs font-semibold uppercase tracking-wide text-zinc-400";

const MAX_SIGNATURE_BYTES = 2 * 1024 * 1024;

export function TopManagementPersonFormModal({
  initial = null,
  showSignatureFields = false,
  onSave,
  onClose,
}: {
  initial?: TopManagementRow | null;
  /** Signature / apply-on-documents only for Sr No 1 (first person). */
  showSignatureFields?: boolean;
  onSave: (row: TopManagementRow) => void;
  onClose: () => void;
}) {
  const isEdit = Boolean(initial);
  const [draft] = useState(() => initial ?? createTopManagementRow());
  const [personName, setPersonName] = useState(draft.person_name);
  const [designation, setDesignation] = useState(draft.designation);
  const [email, setEmail] = useState(draft.email);
  const [mobile, setMobile] = useState(draft.mobile);
  const [signatureImageUrl, setSignatureImageUrl] = useState(
    draft.signature_image_url,
  );
  const [applySignatureOnDocuments, setApplySignatureOnDocuments] = useState(
    draft.apply_signature_on_documents,
  );
  const [processingSignature, setProcessingSignature] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleSignatureFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      window.alert("Please choose an image file (PNG, JPG, etc.).");
      return;
    }
    if (file.size > MAX_SIGNATURE_BYTES) {
      window.alert("Signature image must be 2 MB or smaller.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = String(reader.result ?? "").trim();
      if (!dataUrl) {
        window.alert("Unable to read the image file.");
        return;
      }
      setProcessingSignature(true);
      try {
        const processed = await removeSignatureImageBackground(dataUrl);
        setSignatureImageUrl(processed);
      } catch {
        window.alert("Unable to process the signature image.");
      } finally {
        setProcessingSignature(false);
      }
    };
    reader.onerror = () => window.alert("Unable to read the image file.");
    reader.readAsDataURL(file);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (
      !personName.trim() &&
      !designation.trim() &&
      !email.trim() &&
      !mobile.trim() &&
      !(showSignatureFields && signatureImageUrl.trim())
    ) {
      setError("Enter at least Name, Designation, Email, or Mobile.");
      return;
    }
    onSave({
      id: draft.id,
      person_name: personName.trim(),
      designation: designation.trim(),
      email: email.trim(),
      mobile: mobile.trim(),
      signature_image_url: showSignatureFields
        ? signatureImageUrl.trim()
        : draft.signature_image_url,
      apply_signature_on_documents: showSignatureFields
        ? applySignatureOnDocuments
        : draft.apply_signature_on_documents,
    });
  }

  return (
    <div
      className="absolute inset-0 z-[500] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="top-mgmt-person-form-title"
    >
      <div className="flex max-h-[min(92vh,720px)] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-800 px-4 py-3">
          <h2
            id="top-mgmt-person-form-title"
            className="text-sm font-semibold text-zinc-100"
          >
            {isEdit ? "Edit Management Person" : "Add Management Person"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={fieldLabelClass} htmlFor="top-mgmt-person-name">
                  Name of Person
                </label>
                <input
                  id="top-mgmt-person-name"
                  type="text"
                  value={personName}
                  onChange={(e) => setPersonName(e.target.value)}
                  className={fieldInputClass}
                  placeholder="Name…"
                  autoComplete="off"
                />
              </div>
              <div>
                <label className={fieldLabelClass} htmlFor="top-mgmt-designation">
                  Designation
                </label>
                <input
                  id="top-mgmt-designation"
                  type="text"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  className={fieldInputClass}
                  placeholder="Designation…"
                  autoComplete="off"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={fieldLabelClass} htmlFor="top-mgmt-email">
                  Email ID
                </label>
                <input
                  id="top-mgmt-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={fieldInputClass}
                  placeholder="email@example.com"
                  autoComplete="off"
                />
              </div>
              <div>
                <label className={fieldLabelClass} htmlFor="top-mgmt-mobile">
                  Mobile Number
                </label>
                <input
                  id="top-mgmt-mobile"
                  type="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className={fieldInputClass}
                  placeholder="Mobile…"
                  autoComplete="off"
                />
              </div>
            </div>

            {showSignatureFields ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className={fieldLabelClass}>Signature</p>
                  <div className="mt-2 flex flex-col items-start gap-2">
                    {signatureImageUrl ? (
                      <img
                        src={signatureImageUrl}
                        alt="Signatory signature"
                        className="max-h-16 max-w-full rounded border border-zinc-700/60 object-contain bg-[repeating-conic-gradient(#3f3f46_0%_25%,#27272a_0%_50%)] bg-[length:8px_8px]"
                      />
                    ) : null}
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={processingSignature}
                        className="rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-100 hover:bg-zinc-700 disabled:opacity-50"
                      >
                        {processingSignature
                          ? "Processing…"
                          : signatureImageUrl
                            ? "Change"
                            : "Upload"}
                      </button>
                      {signatureImageUrl ? (
                        <button
                          type="button"
                          onClick={() => setSignatureImageUrl("")}
                          className="rounded-lg px-2 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-950/40"
                        >
                          Clear
                        </button>
                      ) : null}
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => void handleSignatureFileChange(e)}
                    />
                  </div>
                </div>
                <div>
                  <label className={fieldLabelClass} htmlFor="top-mgmt-apply-signature">
                    Apply Signature on All Documents
                  </label>
                  <select
                    id="top-mgmt-apply-signature"
                    value={applySignatureOnDocuments ? "yes" : "no"}
                    onChange={(e) =>
                      setApplySignatureOnDocuments(e.target.value === "yes")
                    }
                    className={fieldInputClass}
                  >
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>
              </div>
            ) : null}

            {error ? <p className="text-xs font-medium text-red-400">{error}</p> : null}
          </div>

          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-zinc-800 px-4 py-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-100 hover:bg-zinc-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-500"
            >
              {isEdit ? "Update Management Person" : "Add Management Person"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
