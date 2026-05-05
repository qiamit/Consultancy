import type { ReactNode } from "react";
import { FinanceTopNav } from "./finance-top-nav";

export function FinanceShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <FinanceTopNav />
      <div className="min-w-0 space-y-6">{children}</div>
    </div>
  );
}
