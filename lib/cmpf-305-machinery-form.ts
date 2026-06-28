import {
  createCmpf305MachineryRow,
  defaultCmpf305MachineryEntry,
  rowHasContent,
  type Cmpf305MachineryRow,
  type Cmpf305MachineryStored,
} from "@/lib/cmpf-305";
import type { Cmpf305ScopeSuggestedMachinery } from "@/lib/actions/cmpf-305-assistant";

export type Cmpf305MachineryFormEntry = {
  machineryName: string;
  make: string;
  productionCapacityPerDay: string;
  number: string;
  remarks: string;
};

export type Cmpf305AddMachineryFormValues = {
  machineryEntries: Cmpf305MachineryFormEntry[];
};

export function defaultCmpf305MachineryFormEntry(): Cmpf305MachineryFormEntry {
  return {
    machineryName: "",
    make: "",
    productionCapacityPerDay: "",
    number: "",
    remarks: "",
  };
}

export function defaultCmpf305AddMachineryFormValues(): Cmpf305AddMachineryFormValues {
  return {
    machineryEntries: [defaultCmpf305MachineryFormEntry()],
  };
}

function entryHasContent(entry: Cmpf305MachineryFormEntry): boolean {
  return (
    entry.machineryName.trim().length > 0 ||
    entry.make.trim().length > 0 ||
    entry.productionCapacityPerDay.trim().length > 0 ||
    entry.number.trim().length > 0 ||
    entry.remarks.trim().length > 0
  );
}

function rowFromEntry(entry: Cmpf305MachineryFormEntry): Cmpf305MachineryStored {
  return {
    ...defaultCmpf305MachineryEntry(),
    machinery_name: entry.machineryName.trim(),
    make: entry.make.trim(),
    production_capacity_per_day: entry.productionCapacityPerDay.trim(),
    number: entry.number.trim(),
    remarks: entry.remarks.trim(),
  };
}

export function formEntryFromEditorRow(row: Cmpf305MachineryRow): Cmpf305MachineryFormEntry {
  return {
    machineryName: row.machinery_name,
    make: row.make,
    productionCapacityPerDay: row.production_capacity_per_day,
    number: row.number,
    remarks: row.remarks,
  };
}

export function formEntriesFromEditorRows(rows: Cmpf305MachineryRow[]): Cmpf305MachineryFormEntry[] {
  const entries = rows.filter((row) => rowHasContent(row)).map(formEntryFromEditorRow);
  return entries.length > 0 ? entries : [defaultCmpf305MachineryFormEntry()];
}

export function editorRowsFromFormEntries(
  entries: Cmpf305MachineryFormEntry[],
  previousRows: Cmpf305MachineryRow[] = [],
): Cmpf305MachineryRow[] {
  return entries
    .filter(entryHasContent)
    .map((entry, index) => ({
      id: previousRows[index]?.id ?? createCmpf305MachineryRow().id,
      ...rowFromEntry(entry),
    }));
}

export function machineryEntriesFromScopeSuggestions(
  items: Cmpf305ScopeSuggestedMachinery[],
): Cmpf305MachineryFormEntry[] {
  const entries = items
    .map((item) => ({
      machineryName: item.machinery_name.trim(),
      make: item.make.trim(),
      productionCapacityPerDay: item.production_capacity_per_day.trim(),
      number: item.number.trim() || "1 Nos",
      remarks: item.remarks.trim(),
    }))
    .filter((entry) => entry.machineryName.length > 0);

  return entries.length > 0 ? entries : [defaultCmpf305MachineryFormEntry()];
}
