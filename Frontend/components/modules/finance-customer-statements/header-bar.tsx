"use client";

import type { ComponentProps } from "react";
import { FinanceMasterHeaderBar } from "@/components/modules/finance/finance-master-header-bar";

export function FinanceCustomerStatementsHeaderBar(
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
      title="Customer Statement"
      searchId="finance-customer-statements-search"
      searchLabel="Search statement number, dates, client, linked documents, type, totals, notes, and more"
      pageSizeId="finance-customer-statements-page-size"
      goPageId="finance-customer-statements-go-page"
      addButtonLabel="Add New Customer Statement"
      qeModule="finance-customer-statement"
      {...props}
    />
  );
}
