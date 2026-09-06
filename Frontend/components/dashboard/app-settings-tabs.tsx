"use client";

import { useState } from "react";
import { updateAppSettings } from "@backend/actions/settings";
import { AiSettingsPanel } from "@/components/dashboard/ai-settings-panel";
import type { AiModelRow } from "@backend/actions/ai-models";
import {
  APP_THEME_OPTIONS,
  normalizeAppTheme,
  type AppThemeValue,
} from "@backend/shared/constants/app-themes";
import { applyAppThemeToDocument } from "@/lib/apply-app-theme";

const STORAGE_KEY = "app_named_prefix_suffix_entries";

type PrefixEntry = { id: string; name: string; prefix: string; suffix: string };

function loadEntries(): PrefixEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveEntries(entries: PrefixEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function AddPrefixModal({
  onClose,
  onSave,
  initial,
}: {
  onClose: () => void;
  onSave: (entry: Omit<PrefixEntry, "id">) => void;
  initial?: Omit<PrefixEntry, "id">;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [prefix, setPrefix] = useState(initial?.prefix ?? "");
  const [suffix, setSuffix] = useState(initial?.suffix ?? "");
  const isEdit = !!initial;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
        <h2 className="mb-4 text-base font-semibold text-zinc-900 dark:text-zinc-100">{isEdit ? "Edit Prefix & Suffix" : "Add Prefix & Suffix"}</h2>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Name</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Quotation, Invoice…"
              className={inp}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Prefix</label>
            <input
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              placeholder="e.g. QT-"
              className={inp}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Suffix</label>
            <input
              value={suffix}
              onChange={(e) => setSuffix(e.target.value)}
              placeholder="e.g. /FY"
              className={inp}
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!name.trim()}
            onClick={() => { onSave({ name: name.trim(), prefix: prefix.trim(), suffix: suffix.trim() }); onClose(); }}
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

const inp =
  "block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100";

const TABS = [
  { id: "prefixes" as const, label: "Prefixes & Suffixes" },
  { id: "theme" as const, label: "App Theme" },
  { id: "currency" as const, label: "App Currency" },
  { id: "date" as const, label: "Date Format" },
  { id: "time" as const, label: "Time Format" },
  { id: "ai" as const, label: "AI Settings" },
];

type TabId = (typeof TABS)[number]["id"];

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

export function AppSettingsTabs({
  initial,
  aiModels,
  initialTab,
}: {
  initial: Record<string, string | null | undefined>;
  aiModels: AiModelRow[];
  initialTab?: string;
}) {
  const validTabIds = TABS.map((t) => t.id) as string[];
  const startTab = (
    initialTab && validTabIds.includes(initialTab) ? initialTab : "prefixes"
  ) as TabId;

  const [tab, setTab] = useState<TabId>(startTab);
  const [prefixEntries, setPrefixEntries] = useState<PrefixEntry[]>(() => loadEntries());
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<PrefixEntry | null>(null);
  const [appTheme, setAppTheme] = useState<AppThemeValue>(() =>
    normalizeAppTheme(str(initial.app_theme)),
  );

  function selectTheme(value: AppThemeValue) {
    setAppTheme(value);
    applyAppThemeToDocument(value);
  }

  function addEntry(entry: Omit<PrefixEntry, "id">) {
    const next = [...prefixEntries, { ...entry, id: crypto.randomUUID() }];
    setPrefixEntries(next);
    saveEntries(next);
  }

  function removeEntry(id: string) {
    const next = prefixEntries.filter((e) => e.id !== id);
    setPrefixEntries(next);
    saveEntries(next);
  }

  function editEntry(id: string, updated: Omit<PrefixEntry, "id">) {
    const next = prefixEntries.map((e) => e.id === id ? { ...updated, id } : e);
    setPrefixEntries(next);
    saveEntries(next);
  }

  const tabBtn = (id: TabId, label: string) => {
    const active = tab === id;
    const isAi = id === "ai";
    return (
      <button
        key={id}
        type="button"
        onClick={() => setTab(id)}
        className={`shrink-0 rounded-md px-3 py-2 text-sm font-medium transition ${
          active
            ? isAi
              ? "bg-violet-50 text-violet-900 ring-1 ring-violet-200/80 dark:bg-violet-950/50 dark:text-violet-100 dark:ring-violet-800"
              : "bg-sky-50 text-sky-900 ring-1 ring-sky-200/80 dark:bg-sky-950/50 dark:text-sky-100 dark:ring-sky-800"
            : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
        }`}
        aria-selected={active}
        role="tab"
      >
        {isAi ? (
          <span className="flex items-center gap-1.5">
            <span className="text-violet-500">✦</span>
            {label}
          </span>
        ) : label}
      </button>
    );
  };

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      {/* Tab bar */}
      <div
        className="flex gap-1 overflow-x-auto border-b border-zinc-200 bg-zinc-50/90 px-2 py-2 dark:border-zinc-800 dark:bg-zinc-900/80 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
        aria-label="App settings sections"
      >
        {TABS.map((t) => tabBtn(t.id, t.label))}
      </div>

      {/* App settings form (all non-AI tabs) */}
      {tab !== "ai" && (
        <form action={updateAppSettings}>
          <input type="hidden" name="settings_tab" value={tab} />
          <div className="p-4 sm:p-6">
            {/* Prefixes & Suffixes */}
            <div className={tab === "prefixes" ? "space-y-4" : "hidden"} role="tabpanel">
              {/* Named prefix/suffix entries */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Prefix &amp; Suffix</p>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-500"
                  >
                    <span className="text-sm font-bold leading-none">+</span>
                    Add Prefix &amp; Suffix
                  </button>
                </div>
                {prefixEntries.length > 0 && (
                  <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/50">
                          <th className="px-3 py-2 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400">Name</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400">Prefix</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400">Suffix</th>
                          <th className="w-20 px-3 py-2" />
                        </tr>
                      </thead>
                      <tbody>
                        {prefixEntries.map((e) => (
                          <tr key={e.id} className="border-b border-zinc-100 last:border-0 dark:border-zinc-800">
                            <td className="px-3 py-2 font-medium text-zinc-800 dark:text-zinc-200">{e.name}</td>
                            <td className="px-3 py-2 font-mono text-zinc-600 dark:text-zinc-400">{e.prefix || <span className="text-zinc-300 dark:text-zinc-600">—</span>}</td>
                            <td className="px-3 py-2 font-mono text-zinc-600 dark:text-zinc-400">{e.suffix || <span className="text-zinc-300 dark:text-zinc-600">—</span>}</td>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setEditingEntry(e)}
                                  className="text-zinc-400 hover:text-sky-500"
                                  title="Edit"
                                >
                                  ✎
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeEntry(e.id)}
                                  className="text-zinc-400 hover:text-red-500"
                                  title="Remove"
                                >
                                  ✕
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* App Theme */}
            <div className={tab === "theme" ? "space-y-4" : "hidden"} role="tabpanel">
              <fieldset className="space-y-3">
                <legend className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  App theme
                </legend>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {APP_THEME_OPTIONS.map((opt) => {
                    const selected = appTheme === opt.value;
                    return (
                      <label
                        key={opt.value}
                        className={`relative flex cursor-pointer gap-3 rounded-xl border p-3 transition ${
                          selected
                            ? "border-sky-500 bg-sky-50 ring-2 ring-sky-500/30 dark:border-sky-400 dark:bg-sky-950/30"
                            : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-950 dark:hover:border-zinc-600"
                        }`}
                      >
                        <input
                          type="radio"
                          name="app_theme"
                          value={opt.value}
                          checked={selected}
                          onChange={() => selectTheme(opt.value)}
                          className="sr-only"
                        />
                        <span
                          className="mt-0.5 flex h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-zinc-200 shadow-sm dark:border-zinc-600"
                          aria-hidden
                        >
                          <span
                            className="w-1/2"
                            style={{ backgroundColor: opt.swatch.bg }}
                          />
                          <span
                            className="flex w-1/2 flex-col"
                            style={{ backgroundColor: opt.swatch.fg }}
                          >
                            <span
                              className="mt-auto h-2.5 w-full"
                              style={{ backgroundColor: opt.swatch.accent }}
                            />
                          </span>
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                            {opt.label}
                          </span>
                          <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">
                            {opt.description}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            </div>

            {/* App Currency */}
            <div className={tab === "currency" ? "space-y-4" : "hidden"} role="tabpanel">
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Default currency code for amounts and new finance lines (ISO-style, max 12 characters).
              </p>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">App currency (preset)</label>
                <select
                  name="app_currency"
                  defaultValue={
                    ["INR", "USD", "EUR", "GBP", "AED", "SGD"].includes(str(initial.app_currency).toUpperCase())
                      ? str(initial.app_currency).toUpperCase()
                      : "INR"
                  }
                  className={inp}
                >
                  <option value="INR">INR — Indian Rupee</option>
                  <option value="USD">USD — US Dollar</option>
                  <option value="EUR">EUR — Euro</option>
                  <option value="GBP">GBP — British Pound</option>
                  <option value="AED">AED — UAE Dirham</option>
                  <option value="SGD">SGD — Singapore Dollar</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Or custom ISO code (overrides preset when filled)
                </label>
                <input
                  name="app_currency_custom"
                  defaultValue={
                    ["INR", "USD", "EUR", "GBP", "AED", "SGD"].includes(str(initial.app_currency).toUpperCase())
                      ? ""
                      : str(initial.app_currency)
                  }
                  placeholder="e.g. JPY"
                  maxLength={12}
                  className={inp}
                />
              </div>
            </div>

            {/* Date Format */}
            <div className={tab === "date" ? "space-y-4" : "hidden"} role="tabpanel">
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                How dates should be shown in forms and lists across the app.
              </p>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Date format</label>
                <select name="date_format" defaultValue={str(initial.date_format) || "DD/MM/YYYY"} className={inp}>
                  <option value="DD/MM/YYYY">DD/MM/YYYY (India)</option>
                  <option value="DD-MM-YYYY">DD-MM-YYYY</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY (US)</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD (ISO)</option>
                </select>
              </div>
            </div>

            {/* Time Format */}
            <div className={tab === "time" ? "space-y-4" : "hidden"} role="tabpanel">
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                How times should be displayed (12-hour with AM/PM vs 24-hour).
              </p>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Time format</label>
                <select name="time_format" defaultValue={str(initial.time_format) || "24h"} className={inp}>
                  <option value="24h">24-hour (13:45)</option>
                  <option value="12h">12-hour (1:45 PM)</option>
                </select>
              </div>
            </div>

            <div className="mt-8 border-t border-zinc-200 pt-6 dark:border-zinc-800">
              <button
                type="submit"
                className="rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-sky-500"
              >
                Save App Setting
              </button>
            </div>
          </div>
        </form>
      )}

      {/* AI Settings panel — separate, no outer form */}
      {tab === "ai" && <AiSettingsPanel initialRows={aiModels} />}

      {showAddModal && (
        <AddPrefixModal
          onClose={() => setShowAddModal(false)}
          onSave={addEntry}
        />
      )}
      {editingEntry && (
        <AddPrefixModal
          onClose={() => setEditingEntry(null)}
          onSave={(updated) => { editEntry(editingEntry.id, updated); setEditingEntry(null); }}
          initial={{ name: editingEntry.name, prefix: editingEntry.prefix, suffix: editingEntry.suffix }}
        />
      )}
    </div>
  );
}
