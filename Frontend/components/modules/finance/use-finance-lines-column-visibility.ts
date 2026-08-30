"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  loadFinanceLinesVisibleColumns,
  saveFinanceLinesVisibleColumns,
  type FinanceLinesColumnKey,
} from "./finance-lines-table-columns";

export function useFinanceLinesColumnVisibility(
  moduleKey: string,
  availableColumns: readonly FinanceLinesColumnKey[],
) {
  const storageKey = `finance-lines-columns:${moduleKey}`;

  const [visibleColumns, setVisibleColumns] = useState<
    FinanceLinesColumnKey[]
  >(() => [...availableColumns]);

  useEffect(() => {
    setVisibleColumns(loadFinanceLinesVisibleColumns(storageKey, availableColumns));
  }, [storageKey, availableColumns]);

  const visibleSet = useMemo(
    () => new Set(visibleColumns),
    [visibleColumns],
  );

  const isVisible = useCallback(
    (column: FinanceLinesColumnKey) => visibleSet.has(column),
    [visibleSet],
  );

  const toggleColumn = useCallback(
    (column: FinanceLinesColumnKey) => {
      setVisibleColumns((prev) => {
        const next = prev.includes(column)
          ? prev.filter((c) => c !== column)
          : [...prev, column];
        if (next.length === 0) return prev;
        saveFinanceLinesVisibleColumns(storageKey, next);
        return next;
      });
    },
    [storageKey],
  );

  return {
    visibleColumns,
    isVisible,
    toggleColumn,
  };
}
