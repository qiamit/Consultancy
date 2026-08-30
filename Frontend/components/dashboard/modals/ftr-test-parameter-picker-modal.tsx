"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { IsCodeViewModal } from "@/components/dashboard/modals/is-code-view-modal";
import { useFinanceListPagination } from "@/components/modules/finance/use-finance-master-state";
import { PAGE_SIZE_OPTIONS } from "@/components/modules/test-parameter-master/search-utils";
import { clauseSortKey, type FtrTestParameterSeed } from "@backend/modules/bis/factory-test-report";
import { createClient } from "@backend/db/client/client";
import { openNewTestParameterForIsCode } from "@backend/modules/test-parameters/test-parameter-form-draft";

const pageBtn =
  "rounded-lg border border-zinc-600 bg-zinc-800 px-2.5 py-1 text-xs font-medium text-zinc-100 hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40";

export function FtrTestParameterPickerModal({
  isReference,
  isCodeId,
  isNumber,
  revisionYear,
  onAdd,
  onClose,
}: {
  isReference: string;
  isCodeId: string | null;
  isNumber: string | null;
  revisionYear: number | null;
  onAdd: (selected: FtrTestParameterSeed[]) => void;
  onClose: () => void;
}) {
  const [parameters, setParameters] = useState<FtrTestParameterSeed[]>([]);
  const [loadedForCodeId, setLoadedForCodeId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [goDraft, setGoDraft] = useState<string | null>(null);
  const [showIsCodeView, setShowIsCodeView] = useState(false);

  const loading = Boolean(isCodeId && loadedForCodeId !== isCodeId);

  const fetchParameters = useCallback(async (codeId: string) => {
    const supabase = createClient();
    const { data } = await supabase
      .from("test_parameters")
      .select("id, test_name, clause_no, test_method, unit, specified_value")
      .eq("is_code_id", codeId)
      .order("test_name", { ascending: true });
    return (data ?? []).map((r) => ({
      id: String(r.id ?? ""),
      test_name: String(r.test_name ?? ""),
      clause_no: String(r.clause_no ?? ""),
      test_method: String(r.test_method ?? ""),
      unit: String(r.unit ?? ""),
      specified_value: String(r.specified_value ?? ""),
    }));
  }, []);

  useEffect(() => {
    if (!isCodeId) return;
    let cancelled = false;
    void (async () => {
      const rows = await fetchParameters(isCodeId);
      if (cancelled) return;
      setParameters(rows);
      setLoadedForCodeId(isCodeId);
    })();
    return () => {
      cancelled = true;
    };
  }, [isCodeId, fetchParameters]);

  if (!isCodeId && loadedForCodeId !== null) {
    setLoadedForCodeId(null);
    setParameters([]);
  }

  useEffect(() => {
    function onFocus() {
      if (!isCodeId) return;
      void (async () => {
        const rows = await fetchParameters(isCodeId);
        setParameters(rows);
        setLoadedForCodeId(isCodeId);
      })();
    }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [isCodeId, fetchParameters]);

  const paramKey = (p: FtrTestParameterSeed) => p.id || `${p.test_name}|${p.clause_no}`;

  const sortedParameters = useMemo(() => {
    return [...parameters].sort((a, b) => {
      const diff = clauseSortKey(a.clause_no) - clauseSortKey(b.clause_no);
      if (diff !== 0) return diff;
      return a.test_name.localeCompare(b.test_name);
    });
  }, [parameters]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sortedParameters.map((p) => ({ p }));
    return sortedParameters
      .filter(
        (p) =>
          p.test_name.toLowerCase().includes(q) ||
          p.clause_no.toLowerCase().includes(q) ||
          p.unit.toLowerCase().includes(q) ||
          p.specified_value.toLowerCase().includes(q),
      )
      .map((p) => ({ p }));
  }, [sortedParameters, search]);

  const listScopeKey = `${search}\0${parameters.length}`;
  const { page, setPage, pageSize, setPageSize, totalPages, paginated } =
    useFinanceListPagination(filtered, listScopeKey, PAGE_SIZE_OPTIONS[1]);

  const goDisplay = goDraft ?? String(page);

  function handleGoTo() {
    const n = Number.parseInt(goDisplay.trim(), 10);
    if (!Number.isFinite(n) || n < 1) {
      setGoDraft(null);
      return;
    }
    setPage(Math.min(n, totalPages));
    setGoDraft(null);
  }

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllOnPage() {
    const pageIds = paginated.map(({ p }) => paramKey(p));
    const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        for (const id of pageIds) next.delete(id);
      } else {
        for (const id of pageIds) next.add(id);
      }
      return next;
    });
  }

  function handleAdd() {
    const selected = sortedParameters.filter((p) => selectedIds.has(paramKey(p)));
    if (selected.length === 0) {
      window.alert("Select at least one test parameter.");
      return;
    }
    onAdd(selected);
    onClose();
  }

  function handleAddNewTestParameter() {
    if (!isCodeId) {
      window.open("/dashboard/test-parameters?new=1", "_blank", "noopener,noreferrer");
      return;
    }
    openNewTestParameterForIsCode(isCodeId);
  }

  const pageAllSelected =
    paginated.length > 0 && paginated.every(({ p }) => selectedIds.has(paramKey(p)));

  return (
    <>
      <div
        className="fixed inset-0 z-[500] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          className="flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="border-b border-zinc-800 px-5 py-4">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-white">Add Test Parameters</h3>
              <p className="mt-0.5 text-xs text-zinc-400">
                Select parameters for {isReference !== "—" ? isReference : "this IS code"}
              </p>
            </div>
            <div className="mt-3 flex flex-nowrap items-center gap-2">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search test name, clause, unit…"
                className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/40"
              />
              {isCodeId ? (
                <button
                  type="button"
                  onClick={() => setShowIsCodeView(true)}
                  className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-indigo-600/50 bg-indigo-950/40 px-2.5 py-2 text-xs font-semibold text-indigo-200 hover:bg-indigo-950/70"
                >
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  View IS Files
                </button>
              ) : null}
              <button
                type="button"
                onClick={handleAddNewTestParameter}
                className="inline-flex shrink-0 items-center whitespace-nowrap rounded-lg bg-sky-600 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-500"
              >
                Add New Test Parameter
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {!isCodeId ? (
              <p className="px-5 py-8 text-center text-sm text-zinc-500">
                This application has no IS code linked. Assign the application IS code to load test
                parameters.
              </p>
            ) : loading ? (
              <p className="px-5 py-8 text-center text-sm text-zinc-500">Loading test parameters…</p>
            ) : parameters.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-zinc-500">
                No test parameters found for {isReference !== "—" ? isReference : "this IS code"}. Add
                them in Test Parameters master first.
              </p>
            ) : filtered.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-zinc-500">No matches for your search.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-zinc-800">
                  <tr>
                    <th className="w-10 px-3 py-2">
                      <input
                        type="checkbox"
                        checked={pageAllSelected}
                        onChange={toggleAllOnPage}
                        className="h-4 w-4 rounded accent-sky-600"
                      />
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-zinc-400">
                      Test Name
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-semibold uppercase text-zinc-400">
                      Clause
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-semibold uppercase text-zinc-400">
                      Unit
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-semibold uppercase text-zinc-400">
                      Specified Value
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {paginated.map(({ p }) => {
                    const id = paramKey(p);
                    return (
                      <tr
                        key={id}
                        className="cursor-pointer hover:bg-zinc-800/60"
                        onClick={() => toggle(id)}
                      >
                        <td className="px-3 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(id)}
                            onChange={() => toggle(id)}
                            onClick={(e) => e.stopPropagation()}
                            className="h-4 w-4 rounded accent-sky-600"
                          />
                        </td>
                        <td className="px-3 py-2 text-zinc-200">{p.test_name}</td>
                        <td className="px-3 py-2 text-center font-mono text-xs text-zinc-400">
                          {p.clause_no || "—"}
                        </td>
                        <td className="px-3 py-2 text-center text-zinc-400">{p.unit || "—"}</td>
                        <td className="px-3 py-2 text-center text-zinc-400">
                          {p.specified_value || "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div className="flex flex-col gap-2 border-t border-zinc-800 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-zinc-500">{selectedIds.size} selected</span>
              {filtered.length > 0 ? (
                <>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    aria-label="Entries per page"
                    className="rounded-lg border border-zinc-600 bg-zinc-800 px-2 py-1 text-xs text-zinc-100 outline-none focus:border-sky-500"
                  >
                    {PAGE_SIZE_OPTIONS.map((n) => (
                      <option key={n} value={n}>
                        {n} / page
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-zinc-500">
                    Page{" "}
                    <span className="font-medium text-zinc-300">{page}</span> of{" "}
                    <span className="font-medium text-zinc-300">{totalPages}</span>
                    {search.trim() ? (
                      <>
                        {" "}
                        · {filtered.length} match{filtered.length === 1 ? "" : "es"}
                      </>
                    ) : null}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() => {
                        setGoDraft(null);
                        setPage((p) => p - 1);
                      }}
                      className={pageBtn}
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      disabled={page >= totalPages}
                      onClick={() => {
                        setGoDraft(null);
                        setPage((p) => p + 1);
                      }}
                      className={pageBtn}
                    >
                      Next
                    </button>
                  </div>
                  <div className="flex items-center gap-1">
                    <label htmlFor="ftr-param-picker-go-page" className="text-xs text-zinc-500">
                      Go to
                    </label>
                    <input
                      id="ftr-param-picker-go-page"
                      type="number"
                      min={1}
                      max={totalPages}
                      value={goDisplay}
                      onChange={(e) => setGoDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleGoTo();
                        }
                      }}
                      className="w-12 rounded-lg border border-zinc-600 bg-zinc-800 px-2 py-1 text-center text-xs text-zinc-100 outline-none focus:border-sky-500"
                    />
                    <button type="button" onClick={handleGoTo} className={pageBtn}>
                      Go
                    </button>
                  </div>
                </>
              ) : null}
            </div>
            <div className="flex gap-2 sm:shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-zinc-700 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAdd}
                className="rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-500"
              >
                Add Selected
              </button>
            </div>
          </div>
        </div>
      </div>

      {showIsCodeView && isCodeId ? (
        <IsCodeViewModal
          isCodeId={isCodeId}
          isNumber={isNumber}
          revisionYear={revisionYear}
          overlayZIndexClass="z-[550]"
          onClose={() => setShowIsCodeView(false)}
        />
      ) : null}
    </>
  );
}
