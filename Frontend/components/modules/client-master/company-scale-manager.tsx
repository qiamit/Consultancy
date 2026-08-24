"use client";

import { DROPDOWN_KEY_CLIENT_COMPANY_SCALE } from "@backend/shared/dropdown-keys";
import type { AppDropdownOptionRow } from "@backend/shared/types/app-dropdown-option";
import { AppDropdownCombobox } from "./app-dropdown-combobox";

export function CompanyScaleManager({
  value,
  onChange,
  selectOptions,
  options,
  selectedValue,
  onClearSelection,
}: {
  value: string;
  onChange: (v: string) => void;
  selectOptions: { value: string; label: string }[];
  options: AppDropdownOptionRow[];
  selectedValue: string;
  onClearSelection: () => void;
}) {
  return (
    <AppDropdownCombobox
      optionKey={DROPDOWN_KEY_CLIENT_COMPANY_SCALE}
      name="company_scale"
      label="Scale of Company"
      dialogTitle="Company Scales"
      addPlaceholder="New Scale Name"
      manageAriaLabel="Add or remove company scales"
      value={value}
      onChange={onChange}
      options={options}
      selectedValue={selectedValue}
      onClearSelection={onClearSelection}
      selectOptions={selectOptions}
      overlayZIndexClass="z-[111]"
    />
  );
}
