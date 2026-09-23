"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createClient } from "@backend/db/client/client";
import { resolveDocumentRef } from "@backend/modules/storage/technical-staff-documents";

export function StorageDocumentLink({
  value,
  className,
  label = "View",
  loadingLabel = "…",
  download,
  title,
}: {
  value: string;
  className: string;
  label?: ReactNode;
  loadingLabel?: ReactNode;
  download?: string | boolean;
  title?: string;
}) {
  const trimmed = value.trim();
  const [href, setHref] = useState<string | null>(null);

  useEffect(() => {
    if (!trimmed) return;

    let cancelled = false;
    void resolveDocumentRef(createClient(), trimmed).then((url) => {
      if (!cancelled) setHref(url);
    });

    return () => {
      cancelled = true;
    };
  }, [trimmed]);

  if (!trimmed) return null;
  const effectiveHref = trimmed ? href : null;
  if (!effectiveHref) {
    return <span className={className}>{loadingLabel}</span>;
  }

  return (
    <a
      href={effectiveHref}
      target="_blank"
      rel="noopener noreferrer"
      download={typeof download === "string" ? download : download ? true : undefined}
      title={title}
      className={className}
    >
      {label}
    </a>
  );
}
