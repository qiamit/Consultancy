export type AppDropdownOptionRow = {
  id: string;
  value: string;
  label: string | null;
  /** When false, UI must not offer delete (e.g. static fallback before DB seed). */
  canDelete?: boolean;
  /** Extra text matched by combobox search (not shown as the primary list label). */
  filterText?: string | null;
};
