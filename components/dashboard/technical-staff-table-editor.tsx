"use client";

import { StorageDocumentLink } from "@/components/dashboard/storage-document-link";
import type { TechnicalStaffRow } from "@/lib/technical-staff";

/** Column widths for list view — percentages must sum to 100. */
const LIST_COLUMN_WIDTHS = {
  sr: "5%",
  name: "17%",
  designation: "14%",
  qualification: "22%",
  documents: "22%",
  photo: "8%",
  action: "12%",
} as const;

const themes = {
  light: {
    wrap: "flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-zinc-300 dark:border-zinc-700",
    thead: "bg-zinc-100 dark:bg-zinc-800",
    th: "border-b border-zinc-200 px-2 py-2.5 text-center align-middle text-[10px] font-semibold uppercase leading-tight tracking-wide text-zinc-600 dark:border-zinc-700 dark:text-zinc-300",
    thSub:
      "mt-0.5 block text-[9px] font-normal normal-case tracking-normal text-zinc-400 dark:text-zinc-500",
    td: "border-b border-zinc-100 px-2 py-2.5 align-middle text-center text-xs leading-snug text-zinc-700 dark:border-zinc-800/80 dark:text-zinc-300",
    srCell:
      "border-b border-r border-zinc-200 bg-zinc-50 px-1.5 py-2.5 text-center align-middle text-xs font-bold tabular-nums text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-300",
    cellStack: "mx-auto flex max-w-full flex-col items-center justify-center gap-0.5",
    cellMuted: "text-[10px] text-zinc-500 dark:text-zinc-400",
    docRow: "flex items-center justify-center gap-1.5",
    docLabel:
      "shrink-0 text-[9px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500",
    empty: "px-4 py-10 text-center text-sm text-zinc-500 dark:text-zinc-400",
    addBtn:
      "rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700",
    editBtn:
      "rounded-md border border-sky-300 px-2.5 py-1 text-[10px] font-semibold text-sky-700 hover:bg-sky-50 dark:border-sky-800 dark:text-sky-300 dark:hover:bg-sky-950/40",
    viewLink:
      "inline-flex items-center justify-center gap-0.5 rounded-md border border-sky-200 bg-sky-50 px-1.5 py-0.5 text-[10px] font-medium text-sky-700 hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-300",
    muted: "text-xs text-zinc-400 dark:text-zinc-500",
  },
  dark: {
    wrap: "flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-zinc-800",
    thead: "bg-zinc-800",
    th: "border-b border-zinc-700 px-2 py-2.5 text-center align-middle text-[10px] font-semibold uppercase leading-tight tracking-wide text-zinc-300",
    thSub:
      "mt-0.5 block text-[9px] font-normal normal-case tracking-normal text-zinc-500",
    td: "border-b border-zinc-800/80 px-2 py-2.5 align-middle text-center text-xs leading-snug text-zinc-300",
    srCell:
      "border-b border-r border-zinc-700 bg-zinc-800/60 px-1.5 py-2.5 text-center align-middle text-xs font-bold tabular-nums text-zinc-300",
    cellStack: "mx-auto flex max-w-full flex-col items-center justify-center gap-0.5",
    cellMuted: "text-[10px] text-zinc-500",
    docRow: "flex items-center justify-center gap-1.5",
    docLabel:
      "shrink-0 text-[9px] font-semibold uppercase tracking-wide text-zinc-500",
    empty: "px-4 py-10 text-center text-sm text-zinc-500",
    addBtn:
      "rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800",
    editBtn:
      "rounded-md border border-sky-800 px-2.5 py-1 text-[10px] font-semibold text-sky-300 hover:bg-sky-950/40",
    viewLink:
      "inline-flex items-center justify-center gap-0.5 rounded-md border border-sky-800 bg-sky-950/30 px-1.5 py-0.5 text-[10px] font-medium text-sky-300 hover:bg-sky-950/50",
    muted: "text-xs text-zinc-500",
  },
} as const;

function FileLink({ theme, url }: { theme: keyof typeof themes; url: string }) {
  const t = themes[theme];
  if (!url.trim()) return <span className={t.muted}>—</span>;
  return <StorageDocumentLink value={url} className={t.viewLink} />;
}

function CellText({ children }: { children: React.ReactNode }) {
  return (
    <span className="block max-w-full break-words hyphens-auto">{children}</span>
  );
}

export function TechnicalStaffTableEditor({
  theme = "light",
  rows,
  onEdit,
}: {
  theme?: keyof typeof themes;
  rows: TechnicalStaffRow[];
  onEdit: (row: TechnicalStaffRow) => void;
}) {
  const t = themes[theme];

  return (
    <div className={t.wrap}>
      <div className="min-h-0 flex-1 overflow-auto">
        {rows.length === 0 ? (
          <p className={t.empty}>
            No technical staff added yet. Use &ldquo;Add Technical Staff&rdquo; to add a person.
          </p>
        ) : (
          <table className="w-full table-fixed border-collapse">
            <colgroup>
              <col style={{ width: LIST_COLUMN_WIDTHS.sr }} />
              <col style={{ width: LIST_COLUMN_WIDTHS.name }} />
              <col style={{ width: LIST_COLUMN_WIDTHS.designation }} />
              <col style={{ width: LIST_COLUMN_WIDTHS.qualification }} />
              <col style={{ width: LIST_COLUMN_WIDTHS.documents }} />
              <col style={{ width: LIST_COLUMN_WIDTHS.photo }} />
              <col style={{ width: LIST_COLUMN_WIDTHS.action }} />
            </colgroup>
            <thead className={`${t.thead} sticky top-0 z-[1]`}>
              <tr>
                <th className={t.th}>Sr. No.</th>
                <th className={t.th}>Name</th>
                <th className={t.th}>Designation</th>
                <th className={t.th}>
                  Qualification
                  <span className={t.thSub}>&amp; Experience</span>
                </th>
                <th className={t.th}>
                  Documents
                  <span className={t.thSub}>Appt. Letter &amp; Certificate</span>
                </th>
                <th className={t.th}>Photo</th>
                <th className={t.th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const exp = row.experience_years.trim();
                return (
                  <tr key={row.id} className="hover:bg-zinc-800/20">
                    <td className={t.srCell}>{index + 1}</td>
                    <td className={t.td}>
                      <CellText>{row.person_name || "—"}</CellText>
                    </td>
                    <td className={t.td}>
                      <CellText>{row.designation || "—"}</CellText>
                    </td>
                    <td className={t.td}>
                      <div className={t.cellStack}>
                        <CellText>{row.educational_qualification || "—"}</CellText>
                        {exp ? (
                          <span className={t.cellMuted}>
                            {exp} {exp === "1" ? "Year" : "Years"}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className={t.td}>
                      <div className={t.cellStack}>
                        <div className={t.docRow}>
                          <span className={t.docLabel}>Appt.</span>
                          <FileLink theme={theme} url={row.appointment_letter} />
                        </div>
                        <div className={t.docRow}>
                          <span className={t.docLabel}>Cert.</span>
                          <FileLink theme={theme} url={row.educational_certificate} />
                        </div>
                      </div>
                    </td>
                    <td className={t.td}>
                      <FileLink theme={theme} url={row.photo} />
                    </td>
                    <td className={t.td}>
                      <button
                        type="button"
                        onClick={() => onEdit(row)}
                        className={t.editBtn}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export function TechnicalStaffAddButton({
  theme = "light",
  onClick,
}: {
  theme?: keyof typeof themes;
  onClick: () => void;
}) {
  const t = themes[theme];
  return (
    <button type="button" onClick={onClick} className={t.addBtn}>
      Add Technical Staff
    </button>
  );
}
