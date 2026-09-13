"use client";

import { createContext, useContext, type ReactNode } from "react";

type DocumentModalNavValue = {
  onOpenClient?: () => void;
  onOpenIsCode?: () => void;
};

const DocumentModalNavContext = createContext<DocumentModalNavValue>({});

export function DocumentModalNavProvider({
  onOpenClient,
  onOpenIsCode,
  children,
}: DocumentModalNavValue & { children: ReactNode }) {
  return (
    <DocumentModalNavContext.Provider value={{ onOpenClient, onOpenIsCode }}>
      {children}
    </DocumentModalNavContext.Provider>
  );
}

function useDocumentModalNav() {
  return useContext(DocumentModalNavContext);
}

const linkClass =
  "truncate text-sky-400 underline-offset-2 hover:text-sky-300 hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-500/60";

/**
 * Header subtitle under document modal titles: Client · IS as optional links.
 */
export function DocumentModalSubtitle({
  companyName,
  isNumber,
  suffix,
}: {
  companyName: string;
  isNumber?: string | null;
  /** Plain text after company (e.g. person name); not linked as IS. */
  suffix?: string | null;
}) {
  const { onOpenClient, onOpenIsCode } = useDocumentModalNav();
  const company = companyName.trim() || "—";
  const is = (isNumber ?? "").trim();
  const showIs = Boolean(is) && is !== "—";
  const extra = (suffix ?? "").trim();

  return (
    <p className="flex min-w-0 flex-wrap items-center gap-x-1.5 truncate text-xs text-zinc-400">
      {onOpenClient ? (
        <button type="button" onClick={onOpenClient} className={linkClass} title="Open client">
          {company}
        </button>
      ) : (
        <span className="truncate">{company}</span>
      )}
      {showIs ? (
        <>
          <span className="text-zinc-600" aria-hidden>
            ·
          </span>
          {onOpenIsCode ? (
            <button type="button" onClick={onOpenIsCode} className={linkClass} title="Open IS code">
              {is}
            </button>
          ) : (
            <span className="truncate">{is}</span>
          )}
        </>
      ) : null}
      {extra ? (
        <>
          <span className="text-zinc-600" aria-hidden>
            ·
          </span>
          <span className="truncate">{extra}</span>
        </>
      ) : null}
    </p>
  );
}
