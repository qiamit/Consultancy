export type TopManagementStored = {
  person_name: string;
  designation: string;
  email: string;
  mobile: string;
};

export type TopManagementRow = TopManagementStored & { id: string };

export function defaultTopManagementEntry(): TopManagementStored {
  return {
    person_name: "",
    designation: "",
    email: "",
    mobile: "",
  };
}

let topMgmtRowSeq = 0;

export function createTopManagementRow(): TopManagementRow {
  topMgmtRowSeq += 1;
  return {
    id: `top-mgmt-${Date.now()}-${topMgmtRowSeq}`,
    ...defaultTopManagementEntry(),
  };
}

export function defaultTopManagementRows(): TopManagementRow[] {
  return [createTopManagementRow()];
}

export function rowHasContent(row: TopManagementStored): boolean {
  return (
    row.person_name.trim().length > 0 ||
    row.designation.trim().length > 0 ||
    row.email.trim().length > 0 ||
    row.mobile.trim().length > 0
  );
}

/** Sr No 1 in Top Management — used for firm representative on CMPF forms. */
export function resolvePrimaryTopManagementPerson(rows: TopManagementStored[]): {
  person_name: string;
  designation: string;
} {
  const first = rows.filter(rowHasContent)[0];
  return {
    person_name: first?.person_name.trim() ?? "",
    designation: first?.designation.trim() ?? "",
  };
}

export function parseTopManagement(raw: unknown): TopManagementStored[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const r = item as Record<string, unknown>;
      return {
        person_name: String(r.person_name ?? "").trim(),
        designation: String(r.designation ?? "").trim(),
        email: String(r.email ?? "").trim(),
        mobile: String(r.mobile ?? "").trim(),
      };
    })
    .filter((r): r is TopManagementStored => r !== null);
}

export function editorRowsFromStored(
  stored: TopManagementStored[],
): TopManagementRow[] {
  const rows = stored.filter(rowHasContent);
  if (rows.length === 0) return defaultTopManagementRows();
  return rows.map((r, i) => ({
    id: `top-mgmt-loaded-${i}`,
    ...r,
  }));
}

export function storedFromEditor(rows: TopManagementRow[]): TopManagementStored[] {
  return rows
    .map(({ person_name, designation, email, mobile }) => ({
      person_name,
      designation,
      email,
      mobile,
    }))
    .filter(rowHasContent);
}
