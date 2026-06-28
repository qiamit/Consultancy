import { Suspense } from "react";
import { IsCodeMaster } from "@/components/modules/is-code-master";
import {
  ASPECTS,
  DEFAULT_ASPECT_OF_IS,
  DEFAULT_UNIT,
  UNITS,
} from "@/components/modules/is-code-master/constants";
import {
  DROPDOWN_KEY_IS_CODE_ASPECT,
  DROPDOWN_KEY_IS_CODE_UNIT,
} from "@/lib/dropdown-keys";
import { fetchAppDropdownOptions } from "@/lib/data/app-dropdown-options";
import { createClient } from "@/lib/supabase/server";
import type { IsCodeFileRow, IsCodeMasterRow } from "@/lib/types/is-code-master";
import type { AppDropdownOptionRow } from "@/lib/types/app-dropdown-option";

function MasterFallback() {
  return (
    <div className="mx-auto max-w-[1400px] animate-pulse rounded-lg border border-zinc-200 bg-zinc-100 p-8 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
      Loading IS Code Master…
    </div>
  );
}

function firstSearchParam(
  sp: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const v = sp[key];
  if (v === undefined) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

export default async function IsCodeMasterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: codes, error } = await supabase
    .from("is_codes")
    .select("*")
    .order("created_at", { ascending: false });

  const codeRows = (codes ?? []) as unknown as IsCodeMasterRow[];
  const ids = codeRows.map((r) => r.id);

  const filesByCode = new Map<string, IsCodeFileRow[]>();
  if (ids.length > 0) {
    const { data: fileRows } = await supabase
      .from("is_code_files")
      .select("id,is_code_id,storage_path,file_name,created_at")
      .in("is_code_id", ids);
    for (const f of (fileRows ?? []) as unknown as IsCodeFileRow[]) {
      const list = filesByCode.get(f.is_code_id) ?? [];
      list.push(f);
      filesByCode.set(f.is_code_id, list);
    }
  }

  const rows: IsCodeMasterRow[] = codeRows.map((r) => ({
    ...r,
    files: filesByCode.get(r.id) ?? [],
  }));

  let aspectOptions: AppDropdownOptionRow[] = await fetchAppDropdownOptions(
    supabase,
    DROPDOWN_KEY_IS_CODE_ASPECT,
  );
  if (aspectOptions.length === 0) {
    aspectOptions = ASPECTS.map((value, i) => ({
      id: `__static_aspect__${i}`,
      value,
      label: null,
      canDelete: false,
    }));
  }
  if (!aspectOptions.some((o) => o.value === DEFAULT_ASPECT_OF_IS)) {
    aspectOptions = [
      {
        id: `__static_aspect_default__`,
        value: DEFAULT_ASPECT_OF_IS,
        label: null,
        canDelete: false,
      },
      ...aspectOptions,
    ];
  }

  let unitOptions: AppDropdownOptionRow[] = await fetchAppDropdownOptions(
    supabase,
    DROPDOWN_KEY_IS_CODE_UNIT,
  );
  if (unitOptions.length === 0) {
    unitOptions = UNITS.map((value, i) => ({
      id: `__static_unit__${i}`,
      value,
      label: null,
      canDelete: false,
    }));
  }
  if (!unitOptions.some((o) => o.value === DEFAULT_UNIT)) {
    unitOptions = [
      {
        id: `__static_unit_default__`,
        value: DEFAULT_UNIT,
        label: null,
        canDelete: false,
      },
      ...unitOptions,
    ];
  }

  return (
    <Suspense fallback={<MasterFallback />}>
      <IsCodeMaster
        initialRows={rows}
        fetchError={error?.message ?? null}
        queryError={firstSearchParam(sp, "error")}
        dbErrorCode={firstSearchParam(sp, "db_code")}
        dbErrorHint={firstSearchParam(sp, "db_hint")}
        aspectOptions={aspectOptions}
        unitOptions={unitOptions}
      />
    </Suspense>
  );
}
