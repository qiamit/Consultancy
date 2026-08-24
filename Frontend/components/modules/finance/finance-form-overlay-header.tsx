"use client";

import { DialogCloseXButton } from "@/components/modules/client-master/dialog-close-x";

const closeBtnClass =
  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-none bg-transparent text-zinc-100 hover:bg-zinc-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400";

const addNewBtnClass =
  "rounded-none border border-zinc-500 bg-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-100 hover:bg-zinc-600";

export function FinanceFormOverlayHeader({
  titleId,
  title,
  onClose,
  addNewLabel,
  onAddNew,
  showAddNew,
}: {
  titleId: string;
  title: string;
  onClose: () => void;
  addNewLabel?: string;
  onAddNew?: () => void;
  showAddNew?: boolean;
}) {
  return (
    <div className="-mx-4 mb-4 flex items-center justify-between gap-3 border-b border-zinc-700 bg-zinc-800 px-4 py-3 dark:border-zinc-600 dark:bg-zinc-800">
      <h2 id={titleId} className="text-sm font-semibold text-zinc-50">
        {title}
      </h2>
      <div className="flex shrink-0 items-center gap-2">
        {showAddNew && addNewLabel && onAddNew ? (
          <button type="button" onClick={onAddNew} className={addNewBtnClass}>
            {addNewLabel}
          </button>
        ) : null}
        <DialogCloseXButton onClick={onClose} className={closeBtnClass} />
      </div>
    </div>
  );
}
