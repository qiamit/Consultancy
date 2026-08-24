import { createClient } from "@backend/db/supabase/server";
import type { FinancePaymentOutRow } from "@backend/shared/types/finance-payment-out";
import { printSettingsFromRow, type PrintCompanyInfo } from "@backend/modules/print/types";
import { FinancePaymentOutsMaster } from "./master";

function firstSearchParam(
  sp: Record<string, string | string[] | undefined>,
  key: string,
): string | null {
  const v = sp[key];
  if (v == null) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

function s(row: Record<string, unknown> | null, key: string): string {
  const v = row?.[key];
  return v != null && String(v).trim() ? String(v).trim() : "";
}

export async function FinancePaymentOutsServer({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const [{ data: rowsRaw }, { data: clientsRaw }, { data: company }] = await Promise.all([
    supabase
      .from("transactions")
      .select(
        "id,client_id,payment_flow,txn_date,amount,currency,mode_of_payment,status,description,notes,created_at,clients(name,company_name)",
      )
      .eq("payment_flow", "out")
      .order("txn_date", { ascending: false }),
    supabase
      .from("clients")
      .select("id,name,company_name")
      .order("company_name", { ascending: true, nullsFirst: false })
      .order("name", { ascending: true }),
    supabase.from("company_settings").select("*").eq("id", 1).maybeSingle(),
  ]);

  const companyRow = (company ?? null) as Record<string, unknown> | null;
  const printSettings = printSettingsFromRow(companyRow);
  const printCompany: PrintCompanyInfo = {
    name: s(companyRow, "company_name"),
    address: s(companyRow, "address"),
    city: s(companyRow, "company_city"),
    state: s(companyRow, "company_state"),
    pin_code: s(companyRow, "company_pin_code"),
    country: s(companyRow, "company_country"),
    gst_number: s(companyRow, "gst_number"),
    email: s(companyRow, "email"),
    phone: s(companyRow, "phone"),
    contact_person: s(companyRow, "contact_person_name"),
    website: s(companyRow, "website"),
    logo_url: null,
    letterhead_upper_url: null,
    letterhead_lower_url: null,
    seal_sign_url: null,
  };

  return (
    <FinancePaymentOutsMaster
      initialRows={(rowsRaw ?? []) as unknown as FinancePaymentOutRow[]}
      queryId={firstSearchParam(sp, "id")}
      isNew={firstSearchParam(sp, "new") === "1"}
      clientRows={
        (clientsRaw ?? []) as unknown as Array<{
          id: string;
          name: string;
          company_name: string | null;
        }>
      }
      printSettings={printSettings}
      printCompany={printCompany}
    />
  );
}
