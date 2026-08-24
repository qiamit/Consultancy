"use client";

import type { ComponentProps } from "react";
import { FinanceMasterHeaderBar } from "@/components/modules/finance/finance-master-header-bar";

export function FinanceProformaInvoicesHeaderBar(
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
      title="Proforma Invoice"
      searchId="finance-proforma-invoices-search"
      searchLabel="Search proforma number, dates, client, linked sales order, type, totals, notes, and more"
      pageSizeId="finance-proforma-invoices-page-size"
      goPageId="finance-proforma-invoices-go-page"
      addButtonLabel="Add New Proforma"
      qeModule="finance-proforma"
      {...props}
    />
  );
}
