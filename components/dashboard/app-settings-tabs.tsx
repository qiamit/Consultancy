"use client";

import { useState } from "react";
import { updateAppSettings } from "@/lib/actions/settings";

const inp =
  "block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100";

const TABS = [
  { id: "prefixes" as const, label: "Prefixes & Suffixes" },
  { id: "theme" as const, label: "App Theme" },
  { id: "currency" as const, label: "App Currency" },
  { id: "date" as const, label: "Date Format" },
  { id: "time" as const, label: "Time Format" },
];

type TabId = (typeof TABS)[number]["id"];

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

export function AppSettingsTabs({
  initial,
}: {
  initial: Record<string, string | null | undefined>;
}) {
  const [tab, setTab] = useState<TabId>("prefixes");

  const tabBtn = (id: TabId, label: string) => {
    const active = tab === id;
    return (
      <button
        key={id}
        type="button"
        onClick={() => setTab(id)}
        className={`shrink-0 rounded-md px-3 py-2 text-sm font-medium transition ${
          active
            ? "bg-sky-50 text-sky-900 ring-1 ring-sky-200/80 dark:bg-sky-950/50 dark:text-sky-100 dark:ring-sky-800"
            : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
        }`}
        aria-selected={active}
        role="tab"
      >
        {label}
      </button>
    );
  };

  return (
    <form
      action={updateAppSettings}
      className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div
        className="flex gap-1 overflow-x-auto border-b border-zinc-200 bg-zinc-50/90 px-2 py-2 dark:border-zinc-800 dark:bg-zinc-900/80"
        role="tablist"
        aria-label="App settings sections"
      >
        {TABS.map((t) => tabBtn(t.id, t.label))}
      </div>

      <div className="p-6">
        <div className={tab === "prefixes" ? "space-y-4" : "hidden"} role="tabpanel">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Optional text added before or after generated numbers and references (for
            display, exports, and future modules).
          </p>
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Application / site title
            </label>
            <input
              name="site_title"
              required
              defaultValue={str(initial.site_title) || "Technical Consultancy"}
              className={inp}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Document number prefix
              </label>
              <input
                name="document_number_prefix"
                defaultValue={str(initial.document_number_prefix)}
                placeholder="e.g. QT-"
                className={inp}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Document number suffix
              </label>
              <input
                name="document_number_suffix"
                defaultValue={str(initial.document_number_suffix)}
                placeholder="e.g. /FY"
                className={inp}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Reference prefix
              </label>
              <input
                name="reference_prefix"
                defaultValue={str(initial.reference_prefix)}
                className={inp}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Reference suffix
              </label>
              <input
                name="reference_suffix"
                defaultValue={str(initial.reference_suffix)}
                className={inp}
              />
            </div>
          </div>
        </div>

        <div className={tab === "theme" ? "space-y-4" : "hidden"} role="tabpanel">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Stored for this workspace. Full UI theming may still follow the device; use
            this value in reports and future theme wiring.
          </p>
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              App theme
            </label>
            <select
              name="app_theme"
              defaultValue={str(initial.app_theme) || "system"}
              className={inp}
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">System default</option>
            </select>
          </div>
        </div>

        <div className={tab === "currency" ? "space-y-4" : "hidden"} role="tabpanel">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Default currency code for amounts and new finance lines (ISO-style, max 12
            characters).
          </p>
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              App currency (preset)
            </label>
            <select
              name="app_currency"
              defaultValue={
                ["INR", "USD", "EUR", "GBP", "AED", "SGD"].includes(
                  str(initial.app_currency).toUpperCase(),
                )
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
                ["INR", "USD", "EUR", "GBP", "AED", "SGD"].includes(
                  str(initial.app_currency).toUpperCase(),
                )
                  ? ""
                  : str(initial.app_currency)
              }
              placeholder="e.g. JPY"
              maxLength={12}
              className={inp}
            />
          </div>
        </div>

        <div className={tab === "date" ? "space-y-4" : "hidden"} role="tabpanel">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            How dates should be shown in forms and lists across the app.
          </p>
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Date format
            </label>
            <select
              name="date_format"
              defaultValue={str(initial.date_format) || "DD/MM/YYYY"}
              className={inp}
            >
              <option value="DD/MM/YYYY">DD/MM/YYYY (India)</option>
              <option value="DD-MM-YYYY">DD-MM-YYYY</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY (US)</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD (ISO)</option>
            </select>
          </div>
        </div>

        <div className={tab === "time" ? "space-y-4" : "hidden"} role="tabpanel">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            How times should be displayed (12-hour with AM/PM vs 24-hour).
          </p>
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Time format
            </label>
            <select
              name="time_format"
              defaultValue={str(initial.time_format) || "24h"}
              className={inp}
            >
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
            Save app settings
          </button>
        </div>
      </div>
    </form>
  );
}
