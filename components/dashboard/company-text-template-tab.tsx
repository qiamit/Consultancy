import type { ReactNode } from "react";
import type { CompanyTextTemplateRow } from "@/lib/types/company-text-template";

const inp =
  "block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100";

const btnPrimary =
  "rounded-lg bg-sky-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-500";
const btnDanger =
  "rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-900/60 dark:bg-zinc-900 dark:text-red-300 dark:hover:bg-red-950/50";

type Actions = {
  create: (formData: FormData) => Promise<void>;
  update: (formData: FormData) => Promise<void>;
  remove: (formData: FormData) => Promise<void>;
};

function TemplateCard({
  row,
  actions,
  variant,
  bodyLabel,
  defaultLockedHint,
}: {
  row: CompanyTextTemplateRow;
  actions: Actions;
  variant: string;
  bodyLabel: string;
  defaultLockedHint: ReactNode;
}) {
  const isDefault = row.code === "default";
  return (
    <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/60">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
          Link code (use in the app to load this text)
        </p>
        <code className="rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
          {row.code}
        </code>
      </div>
      <form action={actions.update} className="space-y-3">
        <input type="hidden" name="id" value={row.id} />
        <div className="space-y-1.5">
          <label
            className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
            htmlFor={`${variant}-name-${row.id}`}
          >
            Display name
          </label>
          <input
            id={`${variant}-name-${row.id}`}
            name="name"
            defaultValue={row.name}
            className={inp}
            required
            autoComplete="off"
          />
        </div>
        <div className="space-y-1.5">
          <label
            className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
            htmlFor={`${variant}-body-${row.id}`}
          >
            {bodyLabel}
          </label>
          <textarea
            id={`${variant}-body-${row.id}`}
            name="body"
            rows={8}
            defaultValue={row.body}
            className={inp}
          />
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <button type="submit" className={btnPrimary}>
            Save template
          </button>
        </div>
      </form>
      {!isDefault ? (
        <form action={actions.remove} className="border-t border-zinc-100 pt-3 dark:border-zinc-800">
          <input type="hidden" name="id" value={row.id} />
          <button type="submit" className={btnDanger}>
            Delete template
          </button>
        </form>
      ) : (
        <div className="border-t border-zinc-100 pt-3 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
          {defaultLockedHint}
        </div>
      )}
    </div>
  );
}

export function CompanyTextTemplateTab({
  rows,
  actions,
  variant,
  intro,
  bodyLabel,
  addCodePlaceholder,
  addNamePlaceholder,
  defaultLockedHint,
}: {
  rows: CompanyTextTemplateRow[];
  actions: Actions;
  variant: string;
  intro: ReactNode;
  bodyLabel: string;
  addCodePlaceholder?: string;
  addNamePlaceholder?: string;
  defaultLockedHint: ReactNode;
}) {
  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-sky-100 bg-sky-50/80 px-4 py-3 text-sm text-sky-950 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-100">
        {intro}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {rows.map((row) => (
          <TemplateCard
            key={row.id}
            row={row}
            actions={actions}
            variant={variant}
            bodyLabel={bodyLabel}
            defaultLockedHint={defaultLockedHint}
          />
        ))}
      </div>

      <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/80 p-5 dark:border-zinc-600 dark:bg-zinc-900/40">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Add template
        </h3>
        <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
          Choose a new unique link code — it cannot be changed later.
        </p>
        <form action={actions.create} className="mt-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Link code
              </label>
              <input
                name="code"
                placeholder={addCodePlaceholder ?? "e.g. standard_audit"}
                className={inp}
                required
                autoComplete="off"
                spellCheck={false}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Display name
              </label>
              <input
                name="name"
                placeholder={addNamePlaceholder ?? "e.g. Standard package"}
                className={inp}
                required
                autoComplete="off"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {bodyLabel}
            </label>
            <textarea name="body" rows={6} className={inp} placeholder="" />
          </div>
          <button type="submit" className={btnPrimary}>
            Add template
          </button>
        </form>
      </div>
    </div>
  );
}
