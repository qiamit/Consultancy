"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { resolveDocumentRef } from "@/lib/storage/technical-staff-documents";

export function StorageDocumentLink({
  value,
  className,
  label = "View",
  loadingLabel = "…",
}: {
  value: string;
  className: string;
  label?: ReactNode;
  loadingLabel?: ReactNode;
}) {
  const [href, setHref] = useState<string | null>(null);

  useEffect(() => {
    const trimmed = value.trim();
    if (!trimmed) {
      setHref(null);
      return;
    }

    let cancelled = false;
    void resolveDocumentRef(createClient(), trimmed).then((url) => {
      if (!cancelled) setHref(url);
    });

    return () => {
      cancelled = true;
    };
  }, [value]);

  if (!value.trim()) return null;
  if (!href) {
    return <span className={className}>{loadingLabel}</span>;
  }

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {label}
    </a>
  );
}
