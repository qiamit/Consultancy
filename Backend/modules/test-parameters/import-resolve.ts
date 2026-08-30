import "server-only";

import { addAppDropdownOption } from "@backend/actions/app-dropdown-options";
import { formatIsCodeRevisionLabel } from "@/components/modules/test-parameter-master/constants";
import { DEFAULT_UNIT } from "@backend/shared/constants/is-code-master";
import { fetchAppDropdownOptions } from "@backend/shared/data/app-dropdown-options";
import { DROPDOWN_KEY_IS_CODE_UNIT } from "@backend/shared/dropdown-keys";
import {
  normalizeIsNumberForMatch,
  parseTestMethodIsReference,
} from "@backend/modules/test-parameters/import-normalize";
import type { AppDbClient } from "@backend/db/client/types";

type IsCodeRow = {
  id: string;
  is_number: string;
  revision_year: number;
  is_code_title: string;
};

function findIsCodeMatch(
  codes: IsCodeRow[],
  isNumber: string,
  revisionYear?: number,
): IsCodeRow | undefined {
  const target = normalizeIsNumberForMatch(isNumber);
  let matches = codes.filter(
    (c) => normalizeIsNumberForMatch(c.is_number) === target,
  );
  if (revisionYear != null) {
    const byYear = matches.filter((c) => c.revision_year === revisionYear);
    if (byYear.length > 0) matches = byYear;
  }
  return matches.sort((a, b) => b.revision_year - a.revision_year)[0];
}

async function createPlaceholderTestMethodIsCode(
  supabase: AppDbClient,
  userId: string,
  isNumber: string,
  revisionYear: number,
  sourceLabel: string,
  codes: IsCodeRow[],
): Promise<IsCodeRow | null> {
  const existing = findIsCodeMatch(codes, isNumber, revisionYear);
  if (existing) return existing;

  const row = {
    is_number: isNumber,
    revision_year: revisionYear,
    aspect_of_is: "Test Method",
    is_code_title: `Test Method (${sourceLabel.trim().slice(0, 120)})`,
    unit_of_is: DEFAULT_UNIT,
    testing_charges: 0,
    mmf_large_scale: 0,
    mmf_medium_scale: 0,
    mmf_small_scale: 0,
    mmf_micro_scale: 0,
    slab_1_quantity: "All Quantities",
    slab_1_rate: 0,
    slab_2_quantity: "N/A",
    slab_2_rate: 0,
    slab_3_quantity: "N/A",
    slab_3_rate: 0,
    created_by: userId,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("is_codes")
    .insert(row)
    .select("id, is_number, revision_year, is_code_title")
    .single();

  if (error) {
    if (error.code === "23505") {
      return findIsCodeMatch(codes, isNumber, revisionYear) ?? null;
    }
    return null;
  }

  const created = data as IsCodeRow;
  codes.push(created);
  return created;
}

/** Resolve test_method to an IS Code Master label; auto-add missing test-method IS codes. */
export async function resolveTestMethodLabel(
  supabase: AppDbClient,
  userId: string,
  testMethodRaw: string,
  parentIsCode: IsCodeRow,
  allIsCodes: IsCodeRow[],
): Promise<{ label: string; created: string[] }> {
  const parentLabel = formatIsCodeRevisionLabel(
    parentIsCode.is_number,
    parentIsCode.revision_year,
  );
  const created: string[] = [];

  const trimmed = testMethodRaw.trim();
  if (!trimmed) {
    return { label: parentLabel, created };
  }

  const ref = parseTestMethodIsReference(trimmed);
  if (!ref) {
    return { label: trimmed, created };
  }

  const revisionYear =
    ref.revisionYear ?? parentIsCode.revision_year;

  let match = findIsCodeMatch(allIsCodes, ref.isNumber, revisionYear);
  if (!match) {
    match =
      (await createPlaceholderTestMethodIsCode(
        supabase,
        userId,
        ref.isNumber,
        revisionYear,
        trimmed,
        allIsCodes,
      )) ?? undefined;
    if (match) {
      created.push(formatIsCodeRevisionLabel(match.is_number, match.revision_year));
    }
  }

  if (match) {
    return {
      label: formatIsCodeRevisionLabel(match.is_number, match.revision_year),
      created,
    };
  }

  return { label: trimmed, created };
}

/** Ensure unit exists in IS Code unit dropdown; auto-add if missing. */
export async function ensureUnitInCatalog(
  supabase: AppDbClient,
  unitRaw: string,
): Promise<{ unit: string; created: boolean }> {
  const unit = unitRaw.trim();
  if (!unit) return { unit: "", created: false };

  const options = await fetchAppDropdownOptions(
    supabase,
    DROPDOWN_KEY_IS_CODE_UNIT,
  );
  const exists = options.some(
    (o) => o.value.trim().toLowerCase() === unit.toLowerCase(),
  );
  if (exists) return { unit, created: false };

  const added = await addAppDropdownOption(DROPDOWN_KEY_IS_CODE_UNIT, unit);
  if (!added.ok) {
    return {
      unit,
      created: added.error.toLowerCase().includes("already exists"),
    };
  }
  return { unit, created: true };
}

export type { IsCodeRow };
