"use client";

import {
  MANAK_ONLINE_EBIS_LOGIN_URL,
  MANAK_ONLINE_HOME_URL,
  MANAK_ONLINE_TEST_REQUEST_URL,
  manakOnlineEbisLoginHref,
} from "@backend/modules/bis/manak-online-portal";
import {
  buildManakTestRequestPayload,
  isLikelyManakSampleCode,
  parseManakTestRequestResult,
  stringifyManakTestRequestPayload,
  type ManakTestRequestPayload,
  type ManakTestRequestResult,
} from "@backend/modules/bis/manak-test-request-payload";
import type { OslSampleRequirementStored } from "@backend/modules/bis/osl-sample-requirements";

export type ManakTestRequestApplicationContext = {
  companyName?: string | null;
  isNumber?: string | null;
  isTitle?: string | null;
  applicationNumber?: string | null;
  gstNumber?: string | null;
  email?: string | null;
  correspondenceAddress?: string | null;
  manufacturingAddress?: string | null;
  address?: string | null;
  pinCode?: string | null;
};

export function buildSampleManakTestRequestPayload(
  row: Partial<OslSampleRequirementStored> & { id?: string },
  application: ManakTestRequestApplicationContext,
): ManakTestRequestPayload {
  return buildManakTestRequestPayload(row, application);
}

export function copyTextToClipboard(value: string): boolean {
  const text = value.trim();
  if (!text) return false;
  try {
    const el = document.createElement("textarea");
    el.value = text;
    el.setAttribute("readonly", "");
    el.style.position = "fixed";
    el.style.left = "-9999px";
    document.body.appendChild(el);
    el.select();
    el.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(el);
    if (ok) return true;
  } catch {
    // fall through
  }
  void navigator.clipboard?.writeText(text).catch(() => {});
  return true;
}

export function copyManakTestRequestPayload(
  row: Partial<OslSampleRequirementStored> & { id?: string },
  application: ManakTestRequestApplicationContext,
): boolean {
  const payload = buildSampleManakTestRequestPayload(row, application);
  try {
    sessionStorage.setItem("qeManakLastSampleId", payload.sampleId || "");
    sessionStorage.setItem("qeManakLastQr", payload.sample.qr_code || "");
  } catch {
    /* ignore */
  }
  return copyTextToClipboard(stringifyManakTestRequestPayload(payload));
}

const BLOCKED_OPEN =
  /play\.google\.com|apps\.apple\.com|com\.bis\.app|itunes\.apple\.com/i;

function openManakUrl(url: string): void {
  const href = url.trim();
  if (!href || BLOCKED_OPEN.test(href)) return;
  window.open(href, "_blank", "noopener,noreferrer");
}

export function openManakEbisLogin(
  portalUserId?: string | null,
  portalPassword?: string | null,
): void {
  openManakUrl(manakOnlineEbisLoginHref(portalUserId, portalPassword));
}

/**
 * Copy the sample payload and open Manak eBIS login (User ID / Password filled).
 * If already logged in, Manak sends the tab to Home. User only types captcha.
 */
export function openManakTestRequest(
  row: Partial<OslSampleRequirementStored> & { id?: string },
  application: ManakTestRequestApplicationContext,
  portal?: { portalUserId?: string | null; portalPassword?: string | null },
): boolean {
  const portalUserId = (portal?.portalUserId ?? "").trim();
  const portalPassword = (portal?.portalPassword ?? "").trim();
  const payload: ManakTestRequestPayload = {
    ...buildSampleManakTestRequestPayload(row, application),
    portalUserId,
    portalPassword,
  };
  try {
    sessionStorage.setItem("qeManakLastSampleId", payload.sampleId || "");
    sessionStorage.setItem("qeManakLastQr", payload.sample.qr_code || "");
  } catch {
    /* ignore */
  }
  const copied = copyTextToClipboard(stringifyManakTestRequestPayload(payload));
  const loginUrl =
    portalUserId || portalPassword
      ? manakOnlineEbisLoginHref(portalUserId, portalPassword)
      : MANAK_ONLINE_EBIS_LOGIN_URL;
  let acked = false;

  function onAck(event: MessageEvent) {
    if (event.source !== window) return;
    if (event.data?.type !== "QE_MANAK_OPEN_ACK") return;
    acked = true;
    window.removeEventListener("message", onAck);
  }

  window.addEventListener("message", onAck);
  window.postMessage(
    {
      type: "QE_MANAK_OPEN",
      payload,
      loginUrl,
      homeUrl: MANAK_ONLINE_HOME_URL,
      portalUserId,
      portalPassword,
    },
    "*",
  );
  window.setTimeout(() => {
    window.removeEventListener("message", onAck);
    if (acked) return;
    openManakUrl(loginUrl);
  }, 400);

  return copied;
}

export function lastManakOpenSample(): { sampleId: string; qr_code: string } {
  try {
    return {
      sampleId: sessionStorage.getItem("qeManakLastSampleId") || "",
      qr_code: sessionStorage.getItem("qeManakLastQr") || "",
    };
  } catch {
    return { sampleId: "", qr_code: "" };
  }
}

type ManakMatchRow = {
  id?: string;
  qr_code?: string | null;
  sample_code?: string | null;
};

export function matchManakSampleRow<T extends ManakMatchRow>(
  rows: T[],
  result: { sampleId?: string; qr_code?: string },
): T | null {
  const lastOpen = lastManakOpenSample();
  const byId = rows.find((row) => result.sampleId && row.id === result.sampleId);
  if (byId) return byId;
  const byQr = rows.find(
    (row) =>
      Boolean(result.qr_code) &&
      String(row.qr_code || "").trim() &&
      String(row.qr_code || "").trim() === result.qr_code,
  );
  if (byQr) return byQr;
  const byLastId = rows.find((row) => lastOpen.sampleId && row.id === lastOpen.sampleId);
  if (byLastId) return byLastId;
  const byLastQr = rows.find(
    (row) =>
      lastOpen.qr_code &&
      String(row.qr_code || "").trim() &&
      String(row.qr_code || "").trim() === lastOpen.qr_code,
  );
  if (byLastQr) return byLastQr;
  if (rows.length === 1) return rows[0];
  const emptyCode = rows.filter((row) => !String(row.sample_code || "").trim());
  return emptyCode.length === 1 ? emptyCode[0] : null;
}

let lastManakPdfAttachKey = "";

export function takeManakPdfAttachKey(key: string): boolean {
  const next = key.trim();
  if (!next || next === lastManakPdfAttachKey) return false;
  lastManakPdfAttachKey = next;
  return true;
}

export function releaseManakPdfAttachKey(key: string): void {
  if (key.trim() && lastManakPdfAttachKey === key.trim()) {
    lastManakPdfAttachKey = "";
  }
}

function sanitizeManakResult(
  result: ManakTestRequestResult | undefined,
): ManakTestRequestResult | undefined {
  if (!result) return undefined;
  const sampleCode = isLikelyManakSampleCode(result.sample_code) ? result.sample_code : "";
  if (!sampleCode && !result.pdfBase64) return undefined;
  return { ...result, sample_code: sampleCode };
}

export function subscribeManakTestRequestResult(
  onResult: (result: ManakTestRequestResult) => void,
): () => void {
  function applyRaw(raw: string | null | undefined) {
    const result = parseManakTestRequestResult(raw);
    if (result) onResult(result);
  }

  function onMessage(event: MessageEvent) {
    if (event.source !== window) return;
    const data = event.data;
    if (!data || data.type !== "QE_MANAK_RESULT") return;
    const result = sanitizeManakResult(data.result as ManakTestRequestResult | undefined);
    if (result?.sample_code || result?.pdfBase64) onResult(result);
  }

  function onCustom(event: Event) {
    const detail = sanitizeManakResult((event as CustomEvent<ManakTestRequestResult>).detail);
    if (detail?.sample_code || detail?.pdfBase64) onResult(detail);
  }

  async function pullClipboard() {
    try {
      const raw = await navigator.clipboard.readText();
      applyRaw(raw);
    } catch {
      /* clipboard blocked until a gesture */
    }
  }

  function onFocus() {
    void pullClipboard();
  }

  function onVisibility() {
    if (document.visibilityState === "visible") void pullClipboard();
  }

  window.addEventListener("message", onMessage);
  window.addEventListener("qe-manak-sample-result", onCustom as EventListener);
  window.addEventListener("focus", onFocus);
  document.addEventListener("visibilitychange", onVisibility);
  window.postMessage({ type: "QE_MANAK_PULL_RESULT" }, "*");
  void pullClipboard();

  return () => {
    window.removeEventListener("message", onMessage);
    window.removeEventListener("qe-manak-sample-result", onCustom as EventListener);
    window.removeEventListener("focus", onFocus);
    document.removeEventListener("visibilitychange", onVisibility);
  };
}

export function manakPdfFileFromResult(result: ManakTestRequestResult): File | null {
  const raw = (result.pdfBase64 ?? "").trim();
  if (!raw) return null;
  try {
    const binary = atob(raw);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    const name = (result.pdfName ?? "").trim() || `Test_Request_${result.sampleId || "sample"}.pdf`;
    return new File([bytes], name, { type: "application/pdf" });
  } catch {
    return null;
  }
}

export { MANAK_ONLINE_EBIS_LOGIN_URL, MANAK_ONLINE_HOME_URL, MANAK_ONLINE_TEST_REQUEST_URL };
