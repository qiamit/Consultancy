"use client";

import type { ComponentProps } from "react";
import { FinanceMasterHeaderBar } from "@/components/modules/finance/finance-master-header-bar";

export function FinanceTaxInvoicesHeaderBar(
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
      title="Tax Invoice"
      searchId="finance-tax-invoices-search"
      searchLabel="Search tax number, dates, client, linked sales order, type, totals, notes, and more"
      pageSizeId="finance-tax-invoices-page-size"
      goPageId="finance-tax-invoices-go-page"
      addButtonLabel="Add New Tax Invoice"
      qeModule="finance-tax-invoice"
      {...props}
    />
  );
}
