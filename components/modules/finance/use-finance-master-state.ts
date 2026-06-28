"use client";

import { useCallback, useMemo, useState, type Dispatch, type SetStateAction } from "react";

/** Keep local row state in sync with server `initialRows` without an effect. */
export function useSyncedRows<T>(initialRows: T[]): [T[], Dispatch<SetStateAction<T[]>>] {
  const [rows, setRows] = useState(initialRows);
  const [prevInitialRows, setPrevInitialRows] = useState(initialRows);

  if (initialRows !== prevInitialRows) {
    setPrevInitialRows(initialRows);
    setRows(initialRows);
  }

  return [rows, setRows];
}

/** Sync rows from server only when `shouldSync` is true (e.g. list view, form closed). */
export function useSyncedRowsWhen<T>(
  initialRows: T[],
  shouldSync: boolean,
): [T[], Dispatch<SetStateAction<T[]>>] {
  const [rows, setRows] = useState(initialRows);
  const [prevInitialRows, setPrevInitialRows] = useState(initialRows);

  if (shouldSync && initialRows !== prevInitialRows) {
    setPrevInitialRows(initialRows);
    setRows(initialRows);
  }

  return [rows, setRows];
}

/** Close embed modals when parent form visibility turns off. */
export function useCloseWhenHidden(
  visible: boolean,
  setters: Array<Dispatch<SetStateAction<boolean>>>,
): void {
  const [appliedVisible, setAppliedVisible] = useState(visible);

  if (visible !== appliedVisible) {
    setAppliedVisible(visible);
    if (!visible) {
      for (const setOpen of setters) setOpen(false);
    }
  }
}

/** Reseed form state when a finance modal route key changes. */
export function useRouteBoundFormState<T>(
  openKey: string | null,
  seedForm: (prev: T) => T,
  initialForm: T,
): [T, Dispatch<SetStateAction<T>>] {
  const [form, setForm] = useState(initialForm);
  const [appliedKey, setAppliedKey] = useState<string | null>(null);

  if (openKey && openKey !== appliedKey) {
    setAppliedKey(openKey);
    setForm((prev) => seedForm(prev));
  }

  return [form, setForm];
}

export function useFinanceListPagination<T>(
  filtered: T[],
  searchQuery: string,
  initialPageSize: number,
) {
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [page, setPage] = useState(1);
  const filterKey = `${searchQuery}\0${pageSize}`;
  const [appliedFilterKey, setAppliedFilterKey] = useState(filterKey);

  if (filterKey !== appliedFilterKey) {
    setAppliedFilterKey(filterKey);
    setPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize) || 1);
  const safePage = Math.min(page, totalPages);

  const paginated = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, safePage, pageSize]);

  const onPageSizeChange = useCallback((nextPageSize: number) => {
    setPageSize(nextPageSize);
    setPage(1);
  }, []);

  return {
    pageSize,
    setPageSize,
    page: safePage,
    setPage,
    totalPages,
    paginated,
    onPageSizeChange,
  };
}

export function useGoPageDraft(page: number) {
  const [goDraft, setGoDraft] = useState<string | null>(null);
  const goDisplay = goDraft ?? String(page);
  const clearGoDraft = useCallback(() => setGoDraft(null), []);
  return { goDisplay, setGoDraft, clearGoDraft };
}

export function useEditorRowsFromStored<TStored, TRow>(
  initialStored: TStored[],
  fromStored: (stored: TStored[]) => TRow[],
): [TRow[], Dispatch<SetStateAction<TRow[]>>] {
  const rowsKey = JSON.stringify(initialStored);
  const [appliedKey, setAppliedKey] = useState(rowsKey);
  const [rows, setRows] = useState(() => fromStored(initialStored));
  if (rowsKey !== appliedKey) {
    setAppliedKey(rowsKey);
    setRows(fromStored(initialStored));
  }
  return [rows, setRows];
}

export function usePrunedSetSelection(rowIds: string[]) {
  const validIds = useMemo(() => new Set(rowIds), [rowIds]);
  const [selectedIds, setSelectedIds] = useState(() => new Set<string>());

  const visibleSelectedIds = useMemo(() => {
    const next = new Set<string>();
    for (const id of selectedIds) {
      if (validIds.has(id)) next.add(id);
    }
    return next;
  }, [selectedIds, validIds]);

  const toggleRowSelection = useCallback(
    (id: string) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else if (validIds.has(id)) next.add(id);
        return next;
      });
    },
    [validIds],
  );

  const toggleSelectPage = useCallback(
    (pageIds: string[]) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        const allOnPage = pageIds.length > 0 && pageIds.every((id) => next.has(id));
        if (allOnPage) {
          for (const id of pageIds) next.delete(id);
        } else {
          for (const id of pageIds) {
            if (validIds.has(id)) next.add(id);
          }
        }
        return next;
      });
    },
    [validIds],
  );

  return {
    selectedIds: visibleSelectedIds,
    setSelectedIds,
    toggleRowSelection,
    toggleSelectPage,
  };
}

export function readNamedPrefixFromStorage(labelIncludes: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  try {
    const entries: Array<{ name: string; prefix: string }> = JSON.parse(
      localStorage.getItem("app_named_prefix_suffix_entries") ?? "[]",
    );
    const match = entries.find((entry) =>
      entry.name.trim().toLowerCase().includes(labelIncludes),
    );
    return match?.prefix?.trim() || fallback;
  } catch {
    return fallback;
  }
}
