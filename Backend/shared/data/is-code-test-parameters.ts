import { createClient } from "@backend/db/supabase/client";
import type { FtrTestParameterSeed } from "@backend/modules/bis/factory-test-report";

export async function fetchIsCodeTestParameters(
  isCodeId: string,
): Promise<FtrTestParameterSeed[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("test_parameters")
    .select("id, test_name, clause_no, test_method, unit, specified_value")
    .eq("is_code_id", isCodeId)
    .order("test_name", { ascending: true });

  return (data ?? []).map((r) => ({
    id: String(r.id ?? ""),
    test_name: String(r.test_name ?? ""),
    clause_no: String(r.clause_no ?? ""),
    test_method: String(r.test_method ?? ""),
    unit: String(r.unit ?? ""),
    specified_value: String(r.specified_value ?? ""),
  }));
}
