"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useTransition, useState } from "react";
import {
  addAiModel,
  deleteAiModel,
  deleteAiModels,
  toggleAiModel,
  updateAiModel,
  type AiModelRow,
} from "@backend/actions/ai-models";

// ─── preset data ──────────────────────────────────────────────────────────────

const PRESET_PROVIDERS = [
  "Anthropic",
  "OpenAI",
  "Google",
  "DeepSeek",
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
  DeepSeek: [
    { id: "deepseek-v4-flash", name: "DeepSeek V4 Flash" },
    { id: "deepseek-v4-pro", name: "DeepSeek V4 Pro" },
    { id: "deepseek-chat", name: "DeepSeek Chat (legacy)" },
    { id: "deepseek-reasoner", name: "DeepSeek Reasoner (legacy)" },
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

const checkboxCls =
  "h-4 w-4 rounded border-zinc-300 text-sky-600 focus:ring-sky-500 dark:border-zinc-600 dark:bg-zinc-900";

// ─── helpers ──────────────────────────────────────────────────────────────────

function maskKey(key: string | null): string {
  if (!key || key.length < 8) return "••••••••";
  return key.slice(0, 4) + "••••••••" + key.slice(-4);
}

function initProviderState(row?: AiModelRow | null) {
  if (!row) {
    return { provider: "", customProvider: "", modelId: "", customModelId: "", customModelName: "" };
  }
  const isPresetProvider = PRESET_PROVIDERS.includes(row.provider);
  const presetModels = isPresetProvider ? PRESET_MODELS[row.provider] ?? [] : [];
  const isPresetModel = presetModels.some((m) => m.id === row.model_id);

  return {
    provider: isPresetProvider ? row.provider : CUSTOM_VALUE,
    customProvider: isPresetProvider ? "" : row.provider,
    modelId: isPresetModel ? row.model_id : CUSTOM_VALUE,
    customModelId: isPresetModel ? "" : row.model_id,
    customModelName: row.display_name,
  };
}

const inp =
  "block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 disabled:opacity-50";

// ─── Model Form (Add / Edit) ──────────────────────────────────────────────────

function ModelForm({
  initial,
  onSaved,
  onCancel,
}: {
  initial?: AiModelRow | null;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const isEdit = !!initial;
  const seed = initProviderState(initial);
  const [pending, startSave] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState(seed.provider);
  const [customProvider, setCustomProvider] = useState(seed.customProvider);
  const [modelId, setModelId] = useState(seed.modelId);
  const [customModelId, setCustomModelId] = useState(seed.customModelId);
  const [customModelName, setCustomModelName] = useState(seed.customModelName);
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
    startSave(async () => {
      const res = isEdit ? await updateAiModel(fd) : await addAiModel(fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onSaved();
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget && !pending) onCancel();
      }}
    >
      <div className="w-full max-w-2xl rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
        <div className="flex items-start justify-between border-b border-zinc-200 px-5 py-3.5 dark:border-zinc-700">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {isEdit ? "Edit AI Model" : "Add AI Model"}
            </h3>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              {isEdit
                ? "Update provider, model, display name, or API key."
                : "Choose a provider, select or enter a model, add your API key, and click Add."}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="rounded-md px-2 py-1 text-sm text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-50 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4 p-5">
          {isEdit ? <input type="hidden" name="id" value={initial.id} /> : null}

          <div className="grid gap-4 sm:grid-cols-2">
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

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                API Key
              </label>
              <div className="relative">
                <input
                  name="api_key"
                  type={showKey ? "text" : "password"}
                  placeholder={isEdit ? "Leave blank to keep current key" : "Paste your API key…"}
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

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onCancel}
              disabled={pending}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-500 disabled:opacity-60 dark:bg-sky-700 dark:hover:bg-sky-600"
            >
              {pending ? (isEdit ? "Saving…" : "Adding…") : isEdit ? "Save Changes" : "Add Model"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Model Row ────────────────────────────────────────────────────────────────

function ModelRow({
  row,
  selected,
  onToggleSelect,
  onEdit,
  onChanged,
}: {
  row: AiModelRow;
  selected: boolean;
  onToggleSelect: () => void;
  onEdit: () => void;
  onChanged: () => void;
}) {
  const [toggling, startToggle] = useTransition();
  const [deleting, startDelete] = useTransition();
  const [rowError, setRowError] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(row.is_active);

  useEffect(() => {
    setIsActive(row.is_active);
  }, [row.is_active]);

  function handleToggle(newActive: boolean) {
    setRowError(null);
    setIsActive(newActive);
    startToggle(async () => {
      const res = await toggleAiModel(row.id, newActive);
      if (!res.ok) {
        setIsActive(!newActive);
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
      <td className="px-4 py-3 align-middle">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          className={checkboxCls}
          aria-label={`Select ${row.display_name}`}
        />
      </td>

      <td className="px-4 py-3 align-top">
        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          {row.provider}
        </span>
      </td>

      <td className="px-4 py-3 align-top">
        <div className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
          {row.display_name}
        </div>
        <div className="mt-0.5 font-mono text-xs text-zinc-500 dark:text-zinc-400">
          {row.model_id}
        </div>
      </td>

      <td className="px-4 py-3 align-top">
        <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
          {maskKey(row.api_key)}
        </span>
      </td>

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

      <td className="px-4 py-3 text-right align-top">
        <div className="inline-flex items-center gap-2">
          <button
            type="button"
            onClick={onEdit}
            disabled={toggling || deleting}
            className="inline-flex items-center rounded-lg border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={toggling || deleting}
            className="inline-flex items-center rounded-lg border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/50"
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export function AiSettingsPanel({ initialRows }: { initialRows: AiModelRow[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<AiModelRow[]>(initialRows);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingRow, setEditingRow] = useState<AiModelRow | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [bulkDeleting, startBulkDelete] = useTransition();
  const selectAllRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setRows(initialRows);
    setSelectedIds((prev) => {
      const next = new Set<string>();
      for (const id of prev) {
        if (initialRows.some((r) => r.id === id)) next.add(id);
      }
      return next;
    });
  }, [initialRows]);

  const allSelected = rows.length > 0 && rows.every((r) => selectedIds.has(r.id));
  const someSelected = rows.some((r) => selectedIds.has(r.id)) && !allSelected;

  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = someSelected;
  }, [someSelected]);

  function refresh() {
    router.refresh();
  }

  function handleSaved() {
    setShowAddForm(false);
    setEditingRow(null);
    refresh();
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds((prev) => {
      if (rows.length > 0 && rows.every((r) => prev.has(r.id))) return new Set();
      return new Set(rows.map((r) => r.id));
    });
  }

  function handleBulkDelete() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (!window.confirm(`Delete ${ids.length} selected model${ids.length === 1 ? "" : "s"}? This cannot be undone.`)) {
      return;
    }
    startBulkDelete(async () => {
      const res = await deleteAiModels(ids);
      if (res.ok) {
        setSelectedIds(new Set());
        refresh();
      } else {
        window.alert(res.error);
      }
    });
  }

  const selectedCount = selectedIds.size;

  return (
    <div className="p-6">
      <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-5 py-3.5 dark:border-zinc-700">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Configured AI Models
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {selectedCount > 0 ? (
              <button
                type="button"
                onClick={handleBulkDelete}
                disabled={bulkDeleting}
                className="inline-flex items-center rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/50"
              >
                {bulkDeleting ? "Deleting…" : `Delete selected (${selectedCount})`}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-sky-500 dark:bg-sky-700 dark:hover:bg-sky-600"
            >
              <span className="text-sm font-bold leading-none">+</span>
              Add Model
            </button>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No AI models added yet.
            </p>
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-sky-500 dark:bg-sky-700 dark:hover:bg-sky-600"
            >
              <span className="text-sm font-bold leading-none">+</span>
              Add Model
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="border-b border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/60">
                <tr>
                  <th className="w-10 px-4 py-2.5 text-left">
                    <input
                      ref={selectAllRef}
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      className={checkboxCls}
                      aria-label="Select all models"
                    />
                  </th>
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
                  <ModelRow
                    key={r.id}
                    row={r}
                    selected={selectedIds.has(r.id)}
                    onToggleSelect={() => toggleSelect(r.id)}
                    onEdit={() => setEditingRow(r)}
                    onChanged={refresh}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAddForm && (
        <ModelForm onSaved={handleSaved} onCancel={() => setShowAddForm(false)} />
      )}
      {editingRow && (
        <ModelForm
          initial={editingRow}
          onSaved={handleSaved}
          onCancel={() => setEditingRow(null)}
        />
      )}
    </div>
  );
}
