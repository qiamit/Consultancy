import type { SplitModalPane } from "./split-modal-pane-tabs";

export function splitModalBodyClass(): string {
  return "flex min-h-0 min-w-0 flex-1 flex-col xl:flex-row xl:overflow-x-auto";
}

export function splitModalEditorPaneClass(
  mobilePane: SplitModalPane,
  settingsPanel: boolean,
): string {
  const width = settingsPanel
    ? "xl:w-[calc((100%-18rem)/2)]"
    : "xl:w-1/2";
  return [
    "flex min-h-0 min-w-0 flex-col border-b border-zinc-800 bg-zinc-900 xl:border-b-0 xl:border-r",
    "w-full min-h-[45vh] flex-1 xl:min-h-0 xl:flex-none",
    width,
    mobilePane === "editor" ? "flex" : "hidden xl:flex",
  ].join(" ");
}

export function splitModalPreviewPaneClass(
  mobilePane: SplitModalPane,
  settingsPanel: boolean,
): string {
  const width = settingsPanel
    ? "xl:w-[calc((100%-18rem)/2)]"
    : "xl:w-1/2";
  return [
    "flex min-w-0 flex-col bg-zinc-600",
    "w-full min-h-[45vh] flex-1 xl:min-h-0 xl:flex-none",
    width,
    mobilePane === "preview" ? "flex" : "hidden xl:flex",
  ].join(" ");
}

export function splitModalSettingsPaneClass(): string {
  return [
    "w-full shrink-0 overflow-y-auto border-t border-zinc-800 bg-zinc-900 p-4",
    "max-h-[40vh] xl:max-h-none xl:w-72 xl:border-t-0 xl:border-l",
  ].join(" ");
}
