"use client";

import type { ComponentProps } from "react";
import { FinanceMasterHeaderBar } from "@/components/modules/finance/finance-master-header-bar";

export function FinancePaymentInsHeaderBar(
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
      title="Payment IN"
      searchId="finance-payment-ins-search"
      searchLabel="Search date, client, amount, status, and other fields"
      pageSizeId="finance-payment-ins-page-size"
      goPageId="finance-payment-ins-go-page"
      addButtonLabel="Add New Payment"
      qeModule="finance-payment-in"
      {...props}
    />
  );
}
