"use client";

import type { ComponentProps } from "react";
import { FinanceMasterHeaderBar } from "@/components/modules/finance/finance-master-header-bar";

export function FinanceCreditNotesHeaderBar(
  props: Omit<
    ComponentProps<typeof FinanceMasterHeaderBar>,
    | "title"
    | "searchId"
    | "searchLabel"
    | "pageSizeId"
    | "goPageId"
    | "addButtonLabel"
    | "qeModule"
  >,
) {
  return (
    <FinanceMasterHeaderBar
      title="Credit Note"
      searchId="finance-credit-notes-search"
      searchLabel="Search tax number, dates, client, linked sales order, type, totals, notes, and more"
      pageSizeId="finance-credit-notes-page-size"
      goPageId="finance-credit-notes-go-page"
      addButtonLabel="Add New Credit Note"
      qeModule="finance-credit-note"
      {...props}
    />
  );
}
