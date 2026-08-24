import type { ReactNode } from "react";

export function FinanceShell({ children }: { children: ReactNode }) {
  return (
    <div className="w-full max-w-none space-y-6">
      <div className="min-w-0 space-y-6">{children}</div>
    </div>
  );
}
