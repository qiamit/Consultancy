"use client";

import { useRouter } from "next/navigation";
import { useTransition, useState, useRef } from "react";
import {
  addAiModel,
  deleteAiModel,
  toggleAiModel,
  type AiModelRow,
} from "@backend/actions/ai-models";

// ─── preset data ──────────────────────────────────────────────────────────────

const PRESET_PROVIDERS = [
  "Anthropic",
  "OpenAI",
  "Google",
  "Mistral",
  "Meta (Llama)",
  "Cohere",
];

const PRESET_MODELS: Record<string, { id: string; name: string }[]> = {
  Anthropic: [
    { id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6" },
    { id: "claude-haiku-4-5-20251001", name: "Claude Haiku 4.5" },
    { id: "claude-opus-4-8", name: "Claude Opus 4.8" },
  ],
  OpenAI: [
    { id: "gpt-4o", name: "GPT-4o" },
    { id: "gpt-4o-mini", name: "GPT-4o Mini" },
    { id: "gpt-4-turbo", name: "GPT-4 Turbo" },
    { id: "o3-mini", name: "o3-mini" },
  ],
  Google: [
    { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash" },
    { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro" },
    { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash" },
  ],
  Mistral: [
    { id: "mistral-large-latest", name: "Mistral Large" },
    { id: "mistral-small-latest", name: "Mistral Small" },
    { id: "open-mixtral-8x22b", name: "Mixtral 8×22B" },
  ],
  "Meta (Llama)": [
    { id: "llama-3.1-70b-instruct", name: "Llama 3.1 70B Instruct" },
    { id: "llama-3.1-8b-instruct", name: "Llama 3.1 8B Instruct" },
  ],
  Cohere: [
    { id: "command-r-plus", name: "Command R+" },
    { id: "command-r", name: "Command R" },
  ],
};

const CUSTOM_VALUE = "__custom__";

// ─── helpers ──────────────────────────────────────────────────────────────────

function maskKey(key: string | null): string {
  if (!key || key.length < 8) return "••••••••";
  return key.slice(0, 4) + "••••••••" + key.slice(-4);
}

const inp =
  "block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 disabled:opacity-50";

// ─── Add Form ─────────────────────────────────────────────────────────────────

function AddModelForm({ onAdded }: { onAdded: () => void }) {
  const [pending, startAdd] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState("");
  const [customProvider, setCustomProvider] = useState("");
  const [modelId, setModelId] = useState("");
  const [customModelId, setCustomModelId] = useState("");
  const [customModelName, setCustomModelName] = useState("");
  const [showKey, setShowKey] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const isCustomProvider = provider === CUSTOM_VALUE;
  const isCustomModel = modelId === CUSTOM_VALUE;
  const presetModels = (!isCustomProvider && provider ? PRESET_MODELS[provider] : null) ?? [];

  function handleProviderChange(v: string) {
    setProvider(v);
    setModelId("");
    setCustomModelId("");
    setCustomModelName("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(formRef.current!);
    startAdd(async () => {
      const res = await addAiModel(fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      // reset
      setProvider("");
      setModelId("");
      setCustomProvider("");
      setCustomModelId("");
      setCustomModelName("");
      formRef.current?.reset();
      onAdded();
    });
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/40">
      <div className="border-b border-zinc-200 px-5 py-3.5 dark:border-zinc-700">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Add AI Model
        </h3>
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
          Choose a provider, select or enter a model, add your API key, and click Add.
        </p>
      </div>

      <form ref={formRef} onSubmit={handleSubmit} className="p-5 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Provider */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Provider
            </label>
            <select
              name="provider"
              value={provider}
              onChange={(e) => handleProviderChange(e.target.value)}
              required={!isCustomProvider}
              className={inp}
            >
              <option value="">Select provider…</option>
              {PRESET_PROVIDERS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
              <option value={CUSTOM_VALUE}>+ Add custom provider</option>
            </select>
            {isCustomProvider && (
              <input
                name="provider_custom"
                value={customProvider}
                onChange={(e) => setCustomProvider(e.target.value)}
                placeholder="Enter provider name…"
                required
                className={inp}
              />
            )}
          </div>

          {/* Model ID */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Model
            </label>
            {isCustomProvider || presetModels.length === 0 ? (
              <input
                name="model_id"
                value={customModelId}
                onChange={(e) => setCustomModelId(e.target.value)}
                placeholder="e.g. llama-3.1-70b-instruct"
                required
                className={inp}
              />
            ) : (
              <>
                <select
                  name="model_id"
                  value={modelId}
                  onChange={(e) => {
                    setModelId(e.target.value);
                    if (e.target.value !== CUSTOM_VALUE) {
                      const found = presetModels.find((m) => m.id === e.target.value);
                      setCustomModelName(found?.name ?? "");
                    }
                  }}
                  required={!isCustomModel}
                  className={inp}
                >
                  <option value="">Select model…</option>
                  {presetModels.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                  <option value={CUSTOM_VALUE}>+ Add custom model</option>
                </select>
                {isCustomModel && (
                  <input
                    name="model_id_custom"
                    value={customModelId}
                    onChange={(e) => setCustomModelId(e.target.value)}
                    placeholder="Enter model ID…"
                    required
                    className={`${inp} mt-2`}
                  />
                )}
              </>
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Display Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Display Name
            </label>
            <input
              name="display_name"
              value={customModelName}
              onChange={(e) => setCustomModelName(e.target.value)}
              placeholder="e.g. My Claude Key"
              className={inp}
            />
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              Optional label to identify this entry.
            </p>
          </div>

          {/* API Key */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              API Key
            </label>
            <div className="relative">
              <input
                name="api_key"
                type={showKey ? "text" : "password"}
                placeholder="Paste your API key…"
                autoComplete="off"
                spellCheck={false}
                className={`${inp} pr-16`}
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              >
                {showKey ? "Hide" : "Show"}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        )}

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-500 disabled:opacity-60 dark:bg-sky-700 dark:hover:bg-sky-600"
          >
            {pending ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Adding…
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Add Model
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Model Row ────────────────────────────────────────────────────────────────

function ModelRow({
  row,
  onChanged,
}: {
  row: AiModelRow;
  onChanged: () => void;
}) {
  const [toggling, startToggle] = useTransition();
  const [deleting, startDelete] = useTransition();
  const [rowError, setRowError] = useState<string | null>(null);
  // Optimistic local state so the dropdown doesn't snap back before refresh
  const [isActive, setIsActive] = useState(row.is_active);

  function handleToggle(newActive: boolean) {
    setRowError(null);
    setIsActive(newActive); // optimistic update immediately
    startToggle(async () => {
      const res = await toggleAiModel(row.id, newActive);
      if (!res.ok) {
        setIsActive(!newActive); // revert on failure
        setRowError(res.error);
      } else {
        onChanged();
      }
    });
  }

  function handleDelete() {
    if (!window.confirm(`Delete "${row.display_name}"? This cannot be undone.`)) return;
    setRowError(null);
    startDelete(async () => {
      const res = await deleteAiModel(row.id);
      if (!res.ok) setRowError(res.error);
      else onChanged();
    });
  }

  return (
    <tr className="group hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
      {/* Provider */}
      <td className="px-4 py-3 align-top">
        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          {row.provider}
        </span>
      </td>

      {/* Model ID */}
      <td className="px-4 py-3 align-top">
        <div className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
          {row.display_name}
        </div>
        <div className="mt-0.5 font-mono text-xs text-zinc-500 dark:text-zinc-400">
          {row.model_id}
        </div>
      </td>

      {/* API Key */}
      <td className="px-4 py-3 align-top">
        <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
          {maskKey(row.api_key)}
        </span>
      </td>

      {/* Status dropdown */}
      <td className="px-4 py-3 align-top">
        <select
          value={isActive ? "active" : "inactive"}
          disabled={toggling || deleting}
          onChange={(e) => handleToggle(e.target.value === "active")}
          className={`rounded-lg border px-2.5 py-1 text-xs font-semibold outline-none transition-colors disabled:opacity-60 focus:ring-2 focus:ring-sky-200 dark:focus:ring-sky-800 ${
            isActive
              ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
              : "border-zinc-300 bg-zinc-100 text-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
          }`}
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        {rowError && (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">{rowError}</p>
        )}
      </td>

      {/* Delete */}
      <td className="px-4 py-3 text-right align-top">
        <button
          type="button"
          onClick={handleDelete}
          disabled={toggling || deleting}
          className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/50"
        >
          {deleting ? "Deleting…" : "Delete"}
        </button>
      </td>
    </tr>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export function AiSettingsPanel({ initialRows }: { initialRows: AiModelRow[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<AiModelRow[]>(initialRows);

  function refresh() {
    router.refresh();
  }

  const activeCount = rows.filter((r) => r.is_active).length;

  return (
    <div className="p-6 space-y-6">
      {/* Info banner */}
      <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 dark:border-sky-800 dark:bg-sky-950/30">
        <p className="text-sm text-sky-800 dark:text-sky-200">
          Add one or more AI models with their API keys. Set any model to{" "}
          <span className="font-semibold">Active</span> to make it available across the app. Multiple models can be active simultaneously.
        </p>
      </div>

      {/* Add form */}
      <AddModelForm onAdded={refresh} />

      {/* Table */}
      <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3.5 dark:border-zinc-700">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Configured AI Models
            </h3>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              {rows.length} model{rows.length !== 1 ? "s" : ""} added
              {activeCount > 0 && (
                <span className="ml-1.5 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  {activeCount} active
                </span>
              )}
            </p>
          </div>
        </div>

        {rows.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
            No AI models added yet. Use the form above to add your first model.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm">
              <thead className="border-b border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/60">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    Provider
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    Model
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    API Key
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    Status
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {rows.map((r) => (
                  <ModelRow key={r.id} row={r} onChanged={refresh} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
