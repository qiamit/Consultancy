"use client";

import type { AppDropdownOptionRow } from "@/lib/types/app-dropdown-option";
import { AppDropdownCombobox } from "./app-dropdown-combobox";

export function ClientDropdownField({
  searchPlaceholder,
  hideLabel,
  inputRowShellClassName,
  listZIndexClass,
  onSuffixButtonClick,
  blankInputWhenNoSelection,
  ...rest
}: {
  optionKey: string;
  name: string;
  label: string;
  dialogTitle: string;
  addPlaceholder: string;
  manageAriaLabel: string;
  value: string;
  onChange: (v: string) => void;
  options: AppDropdownOptionRow[];
  selectedValue: string;
  onClearSelection: () => void;
  emptySelectLabel?: string;
  overlayZIndexClass?: string;
  listZIndexClass?: string;
  /** When false, the field has no blank row (e.g. company status). */
  includeEmptyOption?: boolean;
  searchPlaceholder?: string;
  hideLabel?: boolean;
  inputRowShellClassName?: string;
  onSuffixButtonClick?: () => void;
  blankInputWhenNoSelection?: boolean;
}) {
  return (
    <AppDropdownCombobox
      {...rest}
      hideLabel={hideLabel}
      inputRowShellClassName={inputRowShellClassName}
      listZIndexClass={listZIndexClass}
      searchPlaceholder={searchPlaceholder ?? "Type to search…"}
      onSuffixButtonClick={onSuffixButtonClick}
      blankInputWhenNoSelection={blankInputWhenNoSelection}
    />
  );
}
