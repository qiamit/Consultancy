"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@backend/db/client/server";
export type AddLicenseSurveillanceInput = {
  client_id: string;
  is_code_id: string;
  bis_project_id: string | null;
  cm_l_digits: string | null;
  project_kind: string | null;
  surveillance_date: string;
  allotted_employee_name: string;
};

export async function addLicenseSurveillance(
  input: AddLicenseSurveillanceInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const clientId = input.client_id.trim();
  const isCodeId = input.is_code_id.trim();
  const surveillanceDate = input.surveillance_date.trim();
  const employee = input.allotted_employee_name.trim();

  if (!clientId) return { ok: false, error: "Client is required." };
  if (!isCodeId) return { ok: false, error: "IS Code is required." };
  if (!surveillanceDate) return { ok: false, error: "Date of surveillance is required." };
  if (!employee) return { ok: false, error: "Allotted employee name is required." };

  const supabase = await createClient();
  const { error } = await supabase.from("license_surveillance").insert({
    client_id: clientId,
    is_code_id: isCodeId,
    bis_project_id: input.bis_project_id,
    cm_l_digits: input.cm_l_digits,
    project_kind: input.project_kind,
    surveillance_date: surveillanceDate,
    allotted_employee_name: employee,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard");
  return { ok: true };
}
