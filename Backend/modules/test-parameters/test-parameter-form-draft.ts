import { emptyForm } from "@/components/modules/test-parameter-master/constants";

const DRAFT_KEY = "qe.test_parameter.form_draft";
const OPEN_MODE_KEY = "qe.test_parameter.form_open_mode";

export type TestParameterFormDraftMode = "new" | string;

export function testParameterDraftStorageKey(mode: TestParameterFormDraftMode): string {
  return mode === "new" ? "new" : `id:${mode}`;
}

export function saveTestParameterFormDraft(
  mode: TestParameterFormDraftMode,
  form: Record<string, string>,
): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(form));
    window.sessionStorage.setItem(OPEN_MODE_KEY, testParameterDraftStorageKey(mode));
  } catch {
    // ignore quota errors
  }
}

export function loadTestParameterFormDraft(
  mode: TestParameterFormDraftMode,
): Record<string, string> | null {
  if (typeof window === "undefined") return null;
  try {
    const openMode = window.sessionStorage.getItem(OPEN_MODE_KEY);
    if (openMode !== testParameterDraftStorageKey(mode)) return null;
    const raw = window.sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    return { ...emptyForm(), ...(parsed as Record<string, string>) };
  } catch {
    return null;
  }
}

export function getStoredTestParameterOpenMode(): TestParameterFormDraftMode | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(OPEN_MODE_KEY);
    if (!raw) return null;
    if (raw === "new") return "new";
    if (raw.startsWith("id:")) return raw.slice(3);
    return null;
  } catch {
    return null;
  }
}

export function clearTestParameterFormDraft(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(DRAFT_KEY);
    window.sessionStorage.removeItem(OPEN_MODE_KEY);
  } catch {
    // ignore
  }
}

export function currentTestParameterFormMode(
  idParam: string | null,
  isNewParam: boolean,
): TestParameterFormDraftMode | null {
  if (isNewParam) return "new";
  if (idParam) return idParam;
  return null;
}

/** Opens Test master scoped to the given IS code (inline blank row ready). */
export function openNewTestParameterForIsCode(isCodeId: string): void {
  if (typeof window === "undefined") return;
  clearTestParameterFormDraft();
  window.open(
    `/dashboard/test-parameters?is_code_id=${encodeURIComponent(isCodeId)}`,
    "_blank",
    "noopener,noreferrer",
  );
}
