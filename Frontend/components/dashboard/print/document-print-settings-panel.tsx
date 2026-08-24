"use client";

import type { PrintSettings } from "@backend/modules/print/types";
import {
  OSL_SAMPLE_TABLE_COLUMN_OPTIONS,
  toggleOslSampleTableColumn,
  type OslSampleTableColumnKey,
} from "@backend/modules/print/osl-sample-table-columns";
import {
  TOP_MANAGEMENT_TABLE_COLUMN_OPTIONS,
  toggleTopManagementTableColumn,
  type TopManagementTableColumnKey,
} from "@backend/modules/print/top-management-table-columns";

const inp =
  "block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</label>
      {children}
    </div>
  );
}

function CheckboxField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-sky-600"
      />
      {label}
    </label>
  );
}

export function DocumentPrintSettingsPanel({
  mode,
  settings,
  onChange,
  oslTableColumns,
  onOslTableColumnsChange,
  topMgmtTableColumns,
  onTopMgmtTableColumnsChange,
  ftrPrintOptions,
  onFtrPrintOptionsChange,
}: {
  mode: "page" | "print";
  settings: PrintSettings;
  onChange: (patch: Partial<PrintSettings>) => void;
  oslTableColumns?: OslSampleTableColumnKey[];
  onOslTableColumnsChange?: (columns: OslSampleTableColumnKey[]) => void;
  topMgmtTableColumns?: TopManagementTableColumnKey[];
  onTopMgmtTableColumnsChange?: (columns: TopManagementTableColumnKey[]) => void;
  ftrPrintOptions?: { show_witnessed_by: boolean; show_tested_by: boolean };
  onFtrPrintOptionsChange?: (
    patch: Partial<{ show_witnessed_by: boolean; show_tested_by: boolean }>,
  ) => void;
}) {
  if (mode === "page") {
    return (
      <div className="space-y-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Page Settings</p>
        <Field label="Paper Size">
          <select
            value={settings.paper_size}
            onChange={(e) =>
              onChange({ paper_size: e.target.value as PrintSettings["paper_size"] })
            }
            className={inp}
          >
            <option value="A4">A4 (210×297 mm)</option>
            <option value="A5">A5 (148×210 mm)</option>
            <option value="Letter">Letter (8.5×11 in)</option>
            <option value="Legal">Legal (8.5×14 in)</option>
          </select>
        </Field>
        <Field label="Orientation">
          <select
            value={settings.orientation}
            onChange={(e) =>
              onChange({ orientation: e.target.value as PrintSettings["orientation"] })
            }
            className={inp}
          >
            <option value="portrait">Portrait</option>
            <option value="landscape">Landscape</option>
          </select>
        </Field>
        <Field label="Font Family">
          <select
            value={settings.font_family}
            onChange={(e) => onChange({ font_family: e.target.value })}
            className={inp}
          >
            {["Arial", "Times New Roman", "Georgia", "Calibri", "Verdana", "Inter"].map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Primary Colour">
          <input
            type="color"
            value={settings.primary_color}
            onChange={(e) => onChange({ primary_color: e.target.value })}
            className="h-10 w-full cursor-pointer rounded-lg border border-zinc-300 dark:border-zinc-700"
          />
        </Field>
        <div className="space-y-3">
          <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">Margins (mm)</p>
          <div className="grid grid-cols-2 gap-3">
            {(["margin_top", "margin_bottom", "margin_left", "margin_right"] as const).map(
              (key) => (
                <Field key={key} label={key.replace("margin_", "").replace(/^\w/, (c) => c.toUpperCase())}>
                  <input
                    type="number"
                    min={5}
                    max={40}
                    value={settings[key]}
                    onChange={(e) => onChange({ [key]: Number(e.target.value) })}
                    className={inp}
                  />
                </Field>
              ),
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Print Settings</p>
      <Field label="Font Size">
        <select
          value={String(settings.font_size)}
          onChange={(e) => onChange({ font_size: Number(e.target.value) })}
          className={inp}
        >
          {[9, 10, 11, 12, 13].map((n) => (
            <option key={n} value={n}>
              {n}px
            </option>
          ))}
        </select>
      </Field>
      <Field label="Title Size">
        <select
          value={String(settings.title_font_size)}
          onChange={(e) => onChange({ title_font_size: Number(e.target.value) })}
          className={inp}
        >
          {[22, 26, 30, 36].map((n) => (
            <option key={n} value={n}>
              {n}px
            </option>
          ))}
        </select>
      </Field>
      <Field label="Accent Colour">
        <input
          type="color"
          value={settings.accent_color || settings.primary_color}
          onChange={(e) => onChange({ accent_color: e.target.value })}
          className="h-10 w-full cursor-pointer rounded-lg border border-zinc-300 dark:border-zinc-700"
        />
      </Field>

      <div className="space-y-3 border-t border-zinc-200 pt-4 dark:border-zinc-700">
        <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">Letterhead</p>
        <CheckboxField
          label="Show letterhead"
          checked={settings.show_letterhead}
          onChange={(v) => onChange({ show_letterhead: v })}
        />
        <Field label="Logo">
          <select
            value={settings.letterhead_layout}
            onChange={(e) =>
              onChange({
                letterhead_layout: e.target.value as PrintSettings["letterhead_layout"],
              })
            }
            className={inp}
          >
            <option value="logo-na">N/A (No Logo)</option>
            <option value="logo-left">Logo Left</option>
            <option value="logo-center">Logo Centre</option>
            <option value="logo-right">Logo Right</option>
          </select>
        </Field>
        <Field label="Tagline">
          <input
            type="text"
            value={settings.letterhead_tagline}
            onChange={(e) => onChange({ letterhead_tagline: e.target.value })}
            className={inp}
            placeholder="Company tagline…"
          />
        </Field>
        <CheckboxField
          label="Show address"
          checked={settings.letterhead_show_address}
          onChange={(v) => onChange({ letterhead_show_address: v })}
        />
        <CheckboxField
          label="Show contact info"
          checked={settings.letterhead_show_contact}
          onChange={(v) => onChange({ letterhead_show_contact: v })}
        />
        <CheckboxField
          label="Show GST number"
          checked={settings.letterhead_show_gst}
          onChange={(v) => onChange({ letterhead_show_gst: v })}
        />
      </div>

      <div className="space-y-3 border-t border-zinc-200 pt-4 dark:border-zinc-700">
        <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">Footer</p>
        <CheckboxField
          label="Show footer bar"
          checked={settings.show_footer_line}
          onChange={(v) => onChange({ show_footer_line: v })}
        />
        <CheckboxField
          label="Show page numbers"
          checked={settings.show_page_numbers}
          onChange={(v) => onChange({ show_page_numbers: v })}
        />
        <Field label="Footer — Left">
          <input
            type="text"
            value={settings.footer_left}
            onChange={(e) => onChange({ footer_left: e.target.value })}
            className={inp}
            placeholder="{company} or custom text"
          />
        </Field>
        <Field label="Footer — Centre">
          <input
            type="text"
            value={settings.footer_center}
            onChange={(e) => onChange({ footer_center: e.target.value })}
            className={inp}
          />
        </Field>
        <Field label="Page # format">
          <input
            type="text"
            value={settings.footer_right}
            onChange={(e) => onChange({ footer_right: e.target.value })}
            className={inp}
            placeholder="Page {page} of {total}"
          />
        </Field>
      </div>

      <div className="space-y-3 border-t border-zinc-200 pt-4 dark:border-zinc-700">
        <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">Watermark</p>
        <CheckboxField
          label="Show watermark"
          checked={settings.show_watermark}
          onChange={(v) => onChange({ show_watermark: v })}
        />
        <Field label="Watermark text">
          <input
            type="text"
            value={settings.watermark_text}
            onChange={(e) => onChange({ watermark_text: e.target.value })}
            className={inp}
            placeholder="DRAFT / CONFIDENTIAL…"
          />
        </Field>
      </div>

      {ftrPrintOptions && onFtrPrintOptionsChange ? (
        <div className="space-y-3 border-t border-zinc-200 pt-4 dark:border-zinc-700">
          <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">Signatures</p>
          <CheckboxField
            label="Show Witnessed By"
            checked={ftrPrintOptions.show_witnessed_by}
            onChange={(v) => onFtrPrintOptionsChange({ show_witnessed_by: v })}
          />
          <CheckboxField
            label="Show Tested By"
            checked={ftrPrintOptions.show_tested_by}
            onChange={(v) => onFtrPrintOptionsChange({ show_tested_by: v })}
          />
        </div>
      ) : null}

      <div className="space-y-3 border-t border-zinc-200 pt-4 dark:border-zinc-700">
        <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">Table</p>
        {oslTableColumns && onOslTableColumnsChange ? (
          <div className="space-y-2">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Choose which columns appear in the OSL sample table.
            </p>
            {OSL_SAMPLE_TABLE_COLUMN_OPTIONS.map(({ key, label }) => (
              <CheckboxField
                key={key}
                label={key === "dom" ? "DOM (Date of Manufacturing)" : key === "laboratory" ? "Laboratory (initials)" : label}
                checked={oslTableColumns.includes(key)}
                onChange={() =>
                  onOslTableColumnsChange(toggleOslSampleTableColumn(oslTableColumns, key))
                }
              />
            ))}
          </div>
        ) : topMgmtTableColumns && onTopMgmtTableColumnsChange ? (
          <div className="space-y-3">
            <div className="space-y-2">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Choose which columns appear in the top management table.
              </p>
              {TOP_MANAGEMENT_TABLE_COLUMN_OPTIONS.map(({ key, label }) => (
                <CheckboxField
                  key={key}
                  label={label}
                  checked={topMgmtTableColumns.includes(key)}
                  onChange={() =>
                    onTopMgmtTableColumnsChange(
                      toggleTopManagementTableColumn(topMgmtTableColumns, key),
                    )
                  }
                />
              ))}
            </div>
          </div>
        ) : (
          <>
            <CheckboxField
              label="Compact rows"
              checked={settings.table_compact}
              onChange={(v) => onChange({ table_compact: v })}
            />
            <CheckboxField
              label="Show item description"
              checked={settings.table_show_description}
              onChange={(v) => onChange({ table_show_description: v })}
            />
          </>
        )}
      </div>
    </div>
  );
}
