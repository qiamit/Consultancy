/** [BIS Manakonline — Application/Licence related reports](https://www.manakonline.in/MANAK/ApplicationLicenceRelatedrpt) */
export const MANAK_ONLINE_APPLICATION_LICENCE_REPORT_URL =
  "https://www.manakonline.in/MANAK/ApplicationLicenceRelatedrpt";

/** [BIS Manakonline — eBIS login](https://www.manakonline.in/MANAK/eBISLogin) */
export const MANAK_ONLINE_EBIS_LOGIN_URL =
  "https://www.manakonline.in/MANAK/eBISLogin";

/**
 * Manak eBIS login with optional `userId` query (matches login field `name="userId"`).
 * Password is not supported in the URL for security; use clipboard paste after opening.
 */
export function manakOnlineEbisLoginHref(
  portalUserId: string | null | undefined,
): string {
  const id = (portalUserId ?? "").trim();
  if (!id) return MANAK_ONLINE_EBIS_LOGIN_URL;
  try {
    const u = new URL(MANAK_ONLINE_EBIS_LOGIN_URL);
    u.searchParams.set("userId", id);
    return u.toString();
  } catch {
    return `${MANAK_ONLINE_EBIS_LOGIN_URL}?userId=${encodeURIComponent(id)}`;
  }
}

/** Native `title` for “Apply for renewal” → Manak eBIS (URL `userId` + clipboard password). */
export function manakRenewalLinkNativeTitle(
  portalUserId: string | null | undefined,
  portalPassword: string | null | undefined,
): string {
  const uid = (portalUserId ?? "").trim();
  const pwd = (portalPassword ?? "").trim();

  const open =
    "Opens BIS Manakonline eBIS login in a new tab. Password is never added to the URL (only User ID can appear as ?userId=).";

  const urlHint = uid
    ? " This row’s User ID is included in the link so Manak can pre-fill the login field when their site supports it."
    : " Save a User ID on this project to add ?userId= to the link for the same effect.";

  let clip: string;
  if (uid && pwd) {
    clip =
      " On click, only the saved password is copied to the clipboard for pasting into the password field (User ID is already in the link, not copied).";
  } else if (uid) {
    clip =
      " On click, nothing is copied. Save a portal password on this row to copy it on click; User ID is already in the link when present.";
  } else if (pwd) {
    clip =
      " On click, your saved password is copied to the clipboard. Add a User ID on this row to also get ?userId= in the link.";
  } else {
    clip =
      " No portal User ID or password on this row—only the login page opens (nothing copied).";
  }

  return `${open}${urlHint}${clip}`;
}

/** Short `aria-label` for the renewal link. */
export function manakRenewalLinkAriaLabel(
  portalUserId: string | null | undefined,
  portalPassword: string | null | undefined,
): string {
  const uid = (portalUserId ?? "").trim();
  const pwd = (portalPassword ?? "").trim();
  const parts = ["Apply for renewal", "open BIS eBIS login in a new tab"];
  if (uid) parts.push("User ID in link");
  if (pwd) parts.push("copy password on click");
  else if (uid) parts.push("no clipboard copy without password");
  return parts.join(", ") + ".";
}
