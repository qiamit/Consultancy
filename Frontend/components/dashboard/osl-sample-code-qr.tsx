"use client";

import { useEffect, useState } from "react";

/** QR payload: prefer dedicated qr_code text, else sample_code. */
export function oslSampleQrPayload(sampleCode: string, qrCode?: string): string {
  return (qrCode ?? "").trim() || sampleCode.trim();
}

export function OslSampleCodeWithQr({
  sampleCode,
  qrCode = "",
  mutedClassName,
  size = 56,
  className = "",
}: {
  sampleCode: string;
  qrCode?: string;
  mutedClassName?: string;
  size?: number;
  className?: string;
}) {
  const code = sampleCode.trim();
  const payload = oslSampleQrPayload(sampleCode, qrCode);
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!payload) {
      setDataUrl(null);
      return;
    }
    let cancelled = false;
    void import("qrcode")
      .then((QR) =>
        QR.toDataURL(payload, {
          width: size * 2,
          margin: 1,
          errorCorrectionLevel: "M",
          color: { dark: "#111827", light: "#ffffff" },
        }),
      )
      .then((url) => {
        if (!cancelled) setDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [payload, size]);

  if (!code && !payload) {
    return <span className={mutedClassName}>—</span>;
  }

  const displayNumber = payload || code;

  return (
    <span
      className={`mx-auto inline-flex max-w-full flex-col items-center justify-center gap-1 ${className}`}
    >
      {dataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={dataUrl}
          alt={payload ? `QR code for ${payload}` : "QR code"}
          width={size}
          height={size}
          className="rounded-sm border border-zinc-600 bg-white p-0.5"
        />
      ) : payload ? (
        <span
          className="inline-block animate-pulse rounded-sm bg-zinc-700"
          style={{ width: size, height: size }}
          aria-hidden
        />
      ) : null}
      {displayNumber ? (
        <span
          className="block max-w-full break-all text-center font-mono text-[11px] leading-tight text-zinc-200"
          title={displayNumber}
        >
          {displayNumber}
        </span>
      ) : (
        <span className={mutedClassName}>—</span>
      )}
    </span>
  );
}
