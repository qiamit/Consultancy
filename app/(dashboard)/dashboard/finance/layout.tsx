import type { ReactNode } from "react";
import { FinanceShell } from "@/components/modules/finance";

export default function FinanceLayout({ children }: { children: ReactNode }) {
  return <FinanceShell>{children}</FinanceShell>;
}
