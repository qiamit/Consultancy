import { createClient } from "@/lib/supabase/server";
import type { FinancePaymentOutRow } from "@/lib/types/finance-payment-out";
import { FinancePaymentOutsMaster } from "./master";

function firstSearchParam(
  sp: Record<string, string | string[] | undefined>,
  key: string,
): string | null {
  const v = sp[key];
  if (v == null) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export async function FinancePaymentOutsServer({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const [{ data: rowsRaw }, { data: clientsRaw }] = await Promise.all([
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
  ]);
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
    />
  );
}


