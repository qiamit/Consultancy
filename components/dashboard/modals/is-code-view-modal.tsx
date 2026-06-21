"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

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

type IsCodeFileEntry = { id: string; file_name: string | null; storage_path: string };

function ISInfoRow({ label, value, align = "left" }: { label: string; value: string | number | null; align?: "left" | "center" | "right" }) {
  const alignCls = align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left";
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

function ISSlabRow({ label, quantity, rate }: { label: string; quantity: string | null; rate: number | null }) {
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

export function IsCodeViewModal({
  isCodeId,
  isNumber,
  revisionYear,
  onClose,
  overlayZIndexClass = "z-[200]",
}: {
  isCodeId: string;
  isNumber: string | null;
  revisionYear: number | null;
  onClose: () => void;
  overlayZIndexClass?: string;
}) {
  const [isCode, setIsCode] = useState<IsCodeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState<IsCodeFileEntry[]>([]);
  const [fileUrls, setFileUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase
        .from("is_codes")
        .select("is_number, revision_year, is_code_title, aspect_of_is, unit_of_is, testing_charges, mmf_large_scale, mmf_medium_scale, mmf_small_scale, mmf_micro_scale, slab_1_quantity, slab_1_rate, slab_2_quantity, slab_2_rate, slab_3_quantity, slab_3_rate")
        .eq("id", isCodeId)
        .single(),
      supabase.from("is_code_files").select("id, file_name, storage_path").eq("is_code_id", isCodeId),
    ]).then(([{ data, error }, { data: fileData }]) => {
      if (error) console.error("[IsCodeViewModal] fetch error:", error, "id:", isCodeId);
      setIsCode(data as IsCodeDetail | null);
      const fileList = (fileData ?? []) as IsCodeFileEntry[];
      setFiles(fileList);
      const urls: Record<string, string> = {};
      for (const f of fileList) {
        const { data: urlData } = supabase.storage.from("is_code_documents").getPublicUrl(f.storage_path);
        if (urlData?.publicUrl) urls[f.id] = urlData.publicUrl;
      }
      setFileUrls(urls);
      setLoading(false);
    });
  }, [isCodeId]);

  const fullNumber = isNumber && revisionYear ? `${isNumber}: ${revisionYear}` : isNumber ?? "—";

  return (
    <div className={`fixed inset-0 ${overlayZIndexClass} flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm`}>
      <div className="relative flex max-h-[88vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl dark:bg-zinc-900">
        <div className="flex items-center gap-3 rounded-t-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20 text-sm font-bold text-white">IS</div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/70">Indian Standard</p>
            <div className="flex items-center justify-between gap-4">
              <p className="text-base font-bold text-white">{fullNumber}</p>
              {isCode?.aspect_of_is && <p className="shrink-0 text-sm font-medium text-white/85">{isCode.aspect_of_is}</p>}
            </div>
          </div>
          <button onClick={onClose} className="shrink-0 rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
            </div>
          ) : !isCode ? (
            <p className="py-8 text-center text-sm text-zinc-400">No IS code data found.</p>
          ) : (
            <>
              <div className="rounded-xl bg-indigo-50 px-4 py-3 dark:bg-indigo-950/30">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-400">Title</p>
                <p className="mt-0.5 text-sm font-semibold text-indigo-900 dark:text-indigo-100">{isCode.is_code_title ?? "—"}</p>
              </div>

              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-400">General Information</p>
                <div className="grid grid-cols-4 divide-x divide-zinc-200 rounded-xl border border-zinc-200 py-3 dark:divide-zinc-700 dark:border-zinc-700">
                  <ISInfoRow label="IS Number" value={isCode.is_number} align="left" />
                  <ISInfoRow label="Revision Year" value={isCode.revision_year} align="center" />
                  <ISInfoRow label="Unit of IS" value={isCode.unit_of_is} align="center" />
                  <ISInfoRow label="Testing Charges" value={isCode.testing_charges != null ? `Rs. ${isCode.testing_charges.toLocaleString("en-IN")}` : null} align="right" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-400">Marking and Monitoring Fee (MMF)</p>
                  <div className="space-y-1.5">
                    <ISFeeRow label="Large Scale" value={isCode.mmf_large_scale} />
                    <ISFeeRow label="Medium Scale" value={isCode.mmf_medium_scale} />
                    <ISFeeRow label="Small Scale" value={isCode.mmf_small_scale} />
                    <ISFeeRow label="Micro Scale" value={isCode.mmf_micro_scale} />
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-400">Slab Rate</p>
                  <div className="space-y-1.5">
                    <ISSlabRow label="Slab 1" quantity={isCode.slab_1_quantity} rate={isCode.slab_1_rate} />
                    <ISSlabRow label="Slab 2" quantity={isCode.slab_2_quantity} rate={isCode.slab_2_rate} />
                    <ISSlabRow label="Slab 3" quantity={isCode.slab_3_quantity} rate={isCode.slab_3_rate} />
                  </div>
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-400">
                  IS Code Files
                  {files.length > 0 && (
                    <span className="ml-2 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
                      {files.length}
                    </span>
                  )}
                </p>
                {files.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-zinc-200 px-4 py-3 text-center text-xs text-zinc-400 dark:border-zinc-700">
                    No files uploaded for this IS code.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {files.map((f) => (
                      <a
                        key={f.id}
                        href={fileUrls[f.id] ?? "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2.5 rounded-lg border border-zinc-200 px-3 py-2 text-sm hover:border-indigo-300 hover:bg-indigo-50 dark:border-zinc-700 dark:hover:border-indigo-700 dark:hover:bg-indigo-950/20"
                      >
                        <svg className="h-4 w-4 shrink-0 text-indigo-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="min-w-0 flex-1 truncate text-zinc-700 dark:text-zinc-200">
                          {f.file_name ?? f.storage_path.split("/").pop() ?? "File"}
                        </span>
                        <svg className="h-3.5 w-3.5 shrink-0 text-zinc-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-between rounded-b-2xl border-t border-zinc-200 bg-zinc-50 px-5 py-3 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs text-zinc-400">View-only snapshot</p>
          <button onClick={onClose} className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
