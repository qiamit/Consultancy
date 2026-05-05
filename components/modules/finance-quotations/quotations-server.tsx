import { FinanceQuotationsMaster } from "./master";
import { listCompanyNotesTemplates } from "@/lib/data/company-notes-templates";
import { listCompanyScopeOfWork } from "@/lib/data/company-scope-of-work";
import { listCompanyTerms } from "@/lib/data/company-terms";
import { createClient } from "@/lib/supabase/server";
import type {
  FinanceQuotationRow,
  ProductMasterOptionRow,
} from "@/lib/types/finance-quotation";

function firstSearchParam(
  sp: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const v = sp[key];
  if (v === undefined) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

function s(row: Record<string, unknown> | null, key: string): string {
  if (!row) return "";
  const v = row[key];
  return typeof v === "string" ? v.trim() : "";
}

function buildDefaultBankDetails(row: Record<string, unknown> | null): string {
  if (!row) return "";
  const lines: string[] = [];
  const push = (label: string, val: string) => {
    if (val) lines.push(`${label}: ${val}`);
  };
  if (s(row, "company_name")) lines.push(s(row, "company_name"));
  if (s(row, "address")) lines.push(s(row, "address"));
  const loc = [s(row, "company_pin_code"), s(row, "company_city"), s(row, "company_state"), s(row, "company_country")]
    .filter(Boolean)
    .join(", ");
  if (loc) lines.push(loc);
  push("GSTIN", s(row, "gst_number"));
  push("Contact person", s(row, "contact_person_name"));
  push("Phone", s(row, "phone"));
  push("Email", s(row, "email"));
  lines.push("");
  lines.push("Bank details");
  push("Account holder", s(row, "bank_account_holder_name"));
  push("Account no.", s(row, "bank_account_number"));
  push("Branch", s(row, "bank_branch_name"));
  push("IFSC", s(row, "bank_ifsc"));
  push("SWIFT", s(row, "bank_swift"));
  push("UPI", s(row, "bank_upi_id"));
  return lines.join("\n");
}

export async function FinanceQuotationsServer({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  const [
    { data: qRaw, error: qErr },
    { data: clientsRaw },
    { data: productsRaw },
    { data: company },
    termsTemplates,
    scopeTemplates,
    notesTemplates,
  ] = await Promise.all([
      supabase
        .from("finance_quotations")
        .select(
          `id, quotation_number, quotation_date, expiry_date, client_id, quotation_type,
          notes, terms_and_conditions, scope_of_work, bank_details, seal_and_sign,
          subtotal, tax_total, grand_total, created_at, updated_at,
          clients(name, company_name),
          finance_quotation_lines(
            id, quotation_id, sort_order, product_master_item_id, item_description,
            unit_of_item, qty, unit_rate, line_discount, gst_rate, line_subtotal, line_tax, line_total, created_at
          )`,
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("clients")
        .select("id,name,company_name,gst_number")
        .order("company_name", { ascending: true, nullsFirst: false })
        .order("name", { ascending: true }),
      supabase
        .from("product_master_items")
        .select(
          "id,item_code,name,description,unit_of_item,sale_price,gst_rate,category",
        )
        .order("item_code", { ascending: true }),
      supabase.from("company_settings").select("*").eq("id", 1).maybeSingle(),
      listCompanyTerms(),
      listCompanyScopeOfWork(),
      listCompanyNotesTemplates(),
    ]);

  const rows = (qRaw ?? []) as unknown as FinanceQuotationRow[];
  for (const r of rows) {
    const lines = r.finance_quotation_lines;
    if (Array.isArray(lines)) {
      lines.sort((a, b) => a.sort_order - b.sort_order);
    }
  }

  const clientRows =
    (clientsRaw ?? []) as unknown as {
      id: string;
      name: string;
      company_name: string | null;
      gst_number: string | null;
    }[];

  const productRows = (productsRaw ?? []) as unknown as ProductMasterOptionRow[];

  const defaultBankDetails = buildDefaultBankDetails(
    (company ?? null) as Record<string, unknown> | null,
  );

  return (
    <FinanceQuotationsMaster
      initialRows={rows}
      fetchError={qErr?.message ?? null}
      queryError={firstSearchParam(sp, "error")}
      clientRows={clientRows}
      productRows={productRows}
      defaultBankDetails={defaultBankDetails}
      termsTemplates={termsTemplates}
      scopeTemplates={scopeTemplates}
      notesTemplates={notesTemplates}
    />
  );
}
