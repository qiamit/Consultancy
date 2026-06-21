import type { ReactNode } from "react";

export function FinanceShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <div className="min-w-0 space-y-6">{children}</div>
    </div>
  );
}
