"use client";

import type { ComponentProps } from "react";
import { FinanceMasterHeaderBar } from "@/components/modules/finance/finance-master-header-bar";

export function FinanceSalesOrdersHeaderBar(
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
      title="Sales Order"
      searchId="finance-sales-orders-search"
      searchLabel="Search sales order number, dates, client, linked quotation, type, totals, notes, and more"
      pageSizeId="finance-sales-orders-page-size"
      goPageId="finance-sales-orders-go-page"
      addButtonLabel="Add New Sales Order"
      qeModule="finance-sales-order"
      {...props}
    />
  );
}
