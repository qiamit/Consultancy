"use client";

export type SplitModalPane = "editor" | "preview";

export function SplitModalPaneTabs({
  active,
  onChange,
  editorLabel = "Editor",
  previewLabel = "Print Preview",
}: {
  active: SplitModalPane;
  onChange: (pane: SplitModalPane) => void;
  editorLabel?: string;
  previewLabel?: string;
}) {
  return (
    <div className="flex shrink-0 gap-1 border-b border-zinc-800 px-3 py-2 xl:hidden">
      <button
        type="button"
        onClick={() => onChange("editor")}
        className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold ${
          active === "editor"
            ? "bg-sky-600 text-white"
            : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
        }`}
      >
        {editorLabel}
      </button>
      <button
        type="button"
        onClick={() => onChange("preview")}
        className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold ${
          active === "preview"
            ? "bg-sky-600 text-white"
            : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
        }`}
      >
        {previewLabel}
      </button>
    </div>
  );
}
