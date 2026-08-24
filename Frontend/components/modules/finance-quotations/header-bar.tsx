"use client";

import type { ComponentProps } from "react";
import { FinanceMasterHeaderBar } from "@/components/modules/finance/finance-master-header-bar";

export function FinanceQuotationsHeaderBar(
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
      title="Quotation / Estimate"
      searchId="finance-quotations-search"
      searchLabel="Search quotation number, dates, client, type, totals, notes, and more"
      pageSizeId="finance-quotations-page-size"
      goPageId="finance-quotations-go-page"
      addButtonLabel="Add New Quotation"
      qeModule="finance-quotation"
      {...props}
    />
  );
}
