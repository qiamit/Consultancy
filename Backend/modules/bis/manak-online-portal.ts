/** [BIS Manakonline — Application/Licence related reports](https://www.manakonline.in/MANAK/ApplicationLicenceRelatedrpt) */
export const MANAK_ONLINE_APPLICATION_LICENCE_REPORT_URL =
  "https://www.manakonline.in/MANAK/ApplicationLicenceRelatedrpt";

/** Hash for the “Status of Licence” tab on Application/Licence related reports. */
export const MANAK_ONLINE_STATUS_OF_LICENCE_HASH = "#StatusofLicences";

/** [BIS Manakonline — eBIS login](https://www.manakonline.in/MANAK/eBISLogin) */
export const MANAK_ONLINE_EBIS_LOGIN_URL =
  "https://www.manakonline.in/MANAK/eBISLogin";

/**
 * [BIS Manakonline — Licences Under Suspension (ALL BRANCHES)](https://www.manakonline.in/MANAK/BisReportList/1018/...)
 * Requires an authenticated Manak browser session; anonymous server fetch often returns 404.
 */
export const MANAK_STOP_MARKING_REPORT_URL =
  "https://www.manakonline.in/MANAK/BisReportList/1018/UW5aMVN5cjNpTFMvQVpmaEhlNFpOVXdYQStTZ015SE8/UW5aMVN5cjNpTFN2VU1NQ0VKaUx3dzVMOXBreWhXZ3c/TitnZ0xCRi9FNHMrZkxJQjR0RUNPNWV0MHhKbmcxMmkyWnZmQTl4cEdtUEpTZFZSaVVkSXJYV1I4bUJZazd3dzBsaFRlUkNlMjVwTXk3WjBvTUc2OC9ReC9iWWFIenh3NTBDajBacnBPK0UvMkhqUHk1emI4d2xRK2tZSTJjZHhCdjIvOFlnZk12RzgxK1dlTWJic0xONG40Q21iMmVsMw/ALL_BRANCHES";

/** Digits only (max 10) for Manak “Enter Licence No” (CM/L suffix). */
export function normalizeManakLicenceDigits(
  cmLDigits: string | null | undefined,
): string {
  return String(cmLDigits ?? "")
    .replace(/\D/g, "")
    .slice(0, 10);
}

/** Digits-only CML / licence number (no length cap — used for matching). */
export function normalizeCmlDigits(raw: string | null | undefined): string {
  return String(raw ?? "").replace(/\D/g, "");
}

/**
 * Match keys for robust CM/L compare: raw digits, strip leading zeros,
 * and 10-digit zero-padded form.
 */
export function cmlMatchKeys(raw: string | null | undefined): string[] {
  const digits = normalizeCmlDigits(raw);
  if (!digits) return [];
  const keys = new Set<string>();
  keys.add(digits);
  const stripped = digits.replace(/^0+/, "") || "0";
  keys.add(stripped);
  if (digits.length <= 10) keys.add(digits.padStart(10, "0"));
  if (stripped.length <= 10) keys.add(stripped.padStart(10, "0"));
  return [...keys];
}

/**
 * Extract unique CML numbers from Manak “Licences Under Suspension” HTML.
 * Prefers embedded DataTables JSON (`"CML No":"0000116221"`); falls back to
 * `#newtable` first-column `<td>` cells.
 */
export function extractCmlNumbersFromManakHtml(html: string): string[] {
  const found = new Set<string>();

  const jsonRe = /"CML\s*No"\s*:\s*"(\d{7,12})"/gi;
  let m: RegExpExecArray | null;
  while ((m = jsonRe.exec(html))) {
    const n = normalizeCmlDigits(m[1]);
    if (n.length >= 7 && n.length <= 12) found.add(n);
  }

  if (found.size === 0) {
    const tableChunk =
      html.match(/id=["']newtable["'][\s\S]*?<\/table>/i)?.[0] ?? html;
    const tdRe = /<tr[^>]*>\s*<td[^>]*>\s*(\d{7,12})\s*<\/td>/gi;
    while ((m = tdRe.exec(tableChunk))) {
      const n = normalizeCmlDigits(m[1]);
      if (n.length >= 7 && n.length <= 12) found.add(n);
    }
  }

  return [...found];
}

/**
 * Application/Licence report URL.
 * Manak ignores `#StatusofLicences` on load (always shows List of Licences first).
 */
export function manakOnlineLicenceStatusHref(
  _cmLDigits?: string | null,
): string {
  return MANAK_ONLINE_APPLICATION_LICENCE_REPORT_URL;
}

/**
 * Compact JS that opens Status of Licence, selects Licence No, fills digits.
 * Prefer clipboard digits when `cmLDigits` is empty (shared bookmarklet).
 */
export function buildManakLicenceStatusAutofillScript(
  cmLDigits: string | null | undefined,
): string {
  const n = normalizeManakLicenceDigits(cmLDigits);
  const body = `var a=document.querySelector('a[href="#StatusofLicences"]');if(!a){alert("Open Manak Application/Licence reports first, then run this again.");return;}if(window.jQuery){jQuery("a[data-toggle=\\"tab\\"]").parent().removeClass("active");jQuery(".tab-pane").removeClass("active in").hide();jQuery(a).parent().addClass("active");jQuery("#StatusofLicences").addClass("active in").show();try{jQuery(a).tab("show");}catch(e){}}else{a.click();}var r=document.getElementById("licenceNo");if(r){r.checked=true;r.click();if(window.jQuery)jQuery(r).trigger("click");}var i=document.getElementById("lNo");if(i){i.disabled=false;i.value=n;i.focus();try{i.dispatchEvent(new Event("input",{bubbles:true}));}catch(e){}}`;

  if (n) {
    return `(function(){var n=${JSON.stringify(n)};${body}})();`;
  }

  // Shared bookmark: read 10-digit licence from clipboard (copied by our app).
  return `(function(){function run(n){n=String(n||"").replace(/\\D/g,"").slice(0,10);if(!n){alert("Copy a 10-digit licence number first, then click this bookmark on the Manak page.");return;}${body}}if(navigator.clipboard&&navigator.clipboard.readText){navigator.clipboard.readText().then(run).catch(function(){run(prompt("Enter 10-digit Licence No"));});}else{run(prompt("Enter 10-digit Licence No"));}})();`;
}

/**
 * Bookmarklet `javascript:` href — drag once to the bookmarks bar, then click it
 * on the Manak tab. Uses the licence number already copied by our app.
 * Avoids DevTools Console (Chrome “allow pasting”).
 */
export function buildManakLicenceStatusBookmarkletHref(
  _cmLDigits?: string | null,
): string {
  // Empty digits → clipboard-based script so one bookmark works for every row.
  return `javascript:${encodeURIComponent(buildManakLicenceStatusAutofillScript(""))}`;
}

/** Native `title` for Status-of-Licence open + clipboard licence digits. */
export function manakLicenceStatusLinkNativeTitle(
  cmLDigits: string | null | undefined,
): string {
  const digits = normalizeManakLicenceDigits(cmLDigits);
  const open = "Opens BIS Manakonline Application/Licence related reports.";
  if (!digits) {
    return `${open} No CM/L digits on this row to copy.`;
  }
  return `${open} Licence ${digits} is copied — on Manak: Status of Licence → Licence No → paste (Ctrl+V).`;
}

/** Short `aria-label` for Status-of-Licence control. */
export function manakLicenceStatusLinkAriaLabel(
  cmLDigits: string | null | undefined,
): string {
  const digits = normalizeManakLicenceDigits(cmLDigits);
  if (!digits) {
    return "Open BIS Manakonline licence reports in a new tab.";
  }
  return `Open BIS Manakonline and copy licence number ${digits} for Status of Licence.`;
}

/**
 * Copy 10-digit licence digits (if any), then open Manak Application/Licence reports.
 * Call from a user click handler so clipboard permission is granted.
 */
export function openManakLicenceStatusReport(
  cmLDigits: string | null | undefined,
): void {
  const digits = normalizeManakLicenceDigits(cmLDigits);
  if (digits) {
    void navigator.clipboard.writeText(digits).catch(() => {});
  }
  window.open(
    manakOnlineLicenceStatusHref(digits),
    "_blank",
    "noopener,noreferrer",
  );
}

/**
 * Manak eBIS login with optional `userId` / `passwd` query params.
 * Manak’s server fills `#InputEmail` from `userId` and `#InputPassword` from `passwd`
 * (same mechanism — not clipboard paste). Prefer omitting password when possible:
 * it will appear in the browser address bar / history.
 */
export function manakOnlineEbisLoginHref(
  portalUserId: string | null | undefined,
  portalPassword?: string | null | undefined,
): string {
  const id = (portalUserId ?? "").trim();
  const pwd = (portalPassword ?? "").trim();
  if (!id && !pwd) return MANAK_ONLINE_EBIS_LOGIN_URL;
  try {
    const u = new URL(MANAK_ONLINE_EBIS_LOGIN_URL);
    if (id) u.searchParams.set("userId", id);
    if (pwd) u.searchParams.set("passwd", pwd);
    return u.toString();
  } catch {
    const parts: string[] = [];
    if (id) parts.push(`userId=${encodeURIComponent(id)}`);
    if (pwd) parts.push(`passwd=${encodeURIComponent(pwd)}`);
    return `${MANAK_ONLINE_EBIS_LOGIN_URL}?${parts.join("&")}`;
  }
}

/** Native `title` for “Apply for renewal” → Manak eBIS (`userId` + `passwd` in login URL). */
export function manakRenewalLinkNativeTitle(
  portalUserId: string | null | undefined,
  portalPassword: string | null | undefined,
): string {
  const uid = (portalUserId ?? "").trim();
  const pwd = (portalPassword ?? "").trim();

  const open =
    "Opens BIS Manakonline eBIS login in a new tab. Manak pre-fills fields from the link (not clipboard paste).";

  if (uid && pwd) {
    return `${open} User ID and password from this row are passed so Manak can fill both login fields.`;
  }
  if (uid) {
    return `${open} User ID is included. Save a portal password on this row to also pre-fill the password field.`;
  }
  if (pwd) {
    return `${open} Password is included. Add a User ID on this row to also pre-fill the username field.`;
  }
  return `${open} No portal User ID or password on this row—only the blank login page opens.`;
}

/** Short `aria-label` for the renewal link. */
export function manakRenewalLinkAriaLabel(
  portalUserId: string | null | undefined,
  portalPassword: string | null | undefined,
): string {
  const uid = (portalUserId ?? "").trim();
  const pwd = (portalPassword ?? "").trim();
  const parts = ["Apply for renewal", "open BIS eBIS login in a new tab"];
  if (uid) parts.push("User ID pre-filled");
  if (pwd) parts.push("password pre-filled");
  return parts.join(", ") + ".";
}
