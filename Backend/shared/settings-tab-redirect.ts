/** Build settings page URL while keeping the active tab after save/redirect. */
export function settingsRedirect(
  basePath: string,
  tabOrForm: FormData | string | null | undefined,
  extras?: { error?: string; saved?: boolean },
): string {
  const tab =
    typeof tabOrForm === "string"
      ? tabOrForm.trim()
      : tabOrForm
        ? String(tabOrForm.get("settings_tab") ?? "").trim()
        : "";
  const params = new URLSearchParams();
  if (tab) params.set("tab", tab);
  if (extras?.error) params.set("error", extras.error);
  if (extras?.saved) params.set("saved", "1");
  const q = params.toString();
  return q ? `${basePath}?${q}` : basePath;
}
