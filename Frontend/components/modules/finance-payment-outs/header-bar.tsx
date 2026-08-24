"use client";

import type { ComponentProps } from "react";
import { FinanceMasterHeaderBar } from "@/components/modules/finance/finance-master-header-bar";

export function FinancePaymentOutsHeaderBar(
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
      title="Payment OUT"
      searchId="finance-payment-outs-search"
      searchLabel="Search date, client, amount, status, and other fields"
      pageSizeId="finance-payment-outs-page-size"
      goPageId="finance-payment-outs-go-page"
      addButtonLabel="Add New Payment"
      qeModule="finance-payment-out"
      {...props}
    />
  );
}
