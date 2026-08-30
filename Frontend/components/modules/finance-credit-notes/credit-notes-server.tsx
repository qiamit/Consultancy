import { FinanceCreditNotesMaster } from "./master";
import { listCompanyNotesTemplates } from "@backend/shared/data/company-notes-templates";
import { listCompanyScopeOfWork } from "@backend/shared/data/company-scope-of-work";
import { listCompanyTerms } from "@backend/shared/data/company-terms";
import { DOCUMENTS_BUCKET } from "@backend/modules/storage/documents";
import { createClient } from "@backend/db/client/server";
import type { ProductMasterOptionRow } from "@backend/shared/types/finance-quotation";
import type { FinanceSalesOrderRow } from "@backend/shared/types/finance-sales-order";
import type { FinanceCreditNoteRow } from "@backend/shared/types/finance-credit-note";
import { printSettingsFromRow, type PrintCompanyInfo } from "@backend/modules/print/types";

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
  push("Account Holder", s(row, "bank_account_holder_name"));
  push("Account No.", s(row, "bank_account_number"));
  push("Branch", s(row, "bank_branch_name"));
  push("IFSC", s(row, "bank_ifsc"));
  push("SWIFT", s(row, "bank_swift"));
  push("UPI", s(row, "bank_upi_id"));
  return lines.join("\n");
}

async function signedImageUrl(
  supabase: Awaited<ReturnType<typeof createClient>>,
  path: string,
): Promise<string | null> {
  if (!path.trim()) return null;
  const { data, error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(path.trim(), 3600);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export async function FinanceCreditNotesServer({
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
        .from("finance_credit_notes")
        .select(
          `id, credit_note_number, credit_note_status, credit_note_date, valid_until_date, client_id, quotation_id, sales_order_id, proforma_invoice_id, invoice_type,
          notes, terms_and_conditions, scope_of_work, bank_details, seal_and_sign,
          subtotal, tax_total, grand_total, created_at, updated_at,
          clients(name, company_name),
          finance_quotations(quotation_number),
          finance_sales_orders(sales_order_number),
          finance_proforma_invoices(proforma_invoice_number),
          finance_credit_note_lines(
            id, credit_note_id, sort_order, product_master_item_id, item_description,
            unit_of_item, qty, unit_rate, line_discount, gst_rate, line_subtotal, line_tax, line_total, created_at
          )`,
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("clients")
        .select(
          "id,name,company_name,gst_number,contact_person_name,email,phone_country_code,phone,address,pin_code,city,state,country",
        )
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

  const rows = (qRaw ?? []) as unknown as FinanceCreditNoteRow[];
  for (const r of rows) {
    const lines = r.finance_credit_note_lines;
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
      contact_person_name: string | null;
      email: string | null;
      phone_country_code: string | null;
      phone: string | null;
      address: string | null;
      pin_code: string | null;
      city: string | null;
      state: string | null;
      country: string | null;
    }[];

  const productRows = (productsRaw ?? []) as unknown as ProductMasterOptionRow[];

  const defaultBankDetails = buildDefaultBankDetails(
    (company ?? null) as Record<string, unknown> | null,
  );
  const sealSignImagePath = s(
    (company ?? null) as Record<string, unknown> | null,
    "seal_sign_image_path",
  );
  const letterheadUpperPath = s(
    (company ?? null) as Record<string, unknown> | null,
    "letterhead_upper_path",
  );
  const letterheadLowerPath = s(
    (company ?? null) as Record<string, unknown> | null,
    "letterhead_lower_path",
  );
  const sealSignImageUrl = sealSignImagePath
    ? await signedImageUrl(supabase, sealSignImagePath)
    : null;
  const letterheadUpperImageUrl = letterheadUpperPath
    ? await signedImageUrl(supabase, letterheadUpperPath)
    : null;
  const letterheadLowerImageUrl = letterheadLowerPath
    ? await signedImageUrl(supabase, letterheadLowerPath)
    : null;

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
    letterhead_upper_url: letterheadUpperImageUrl,
    letterhead_lower_url: letterheadLowerImageUrl,
    seal_sign_url: sealSignImageUrl,
  };

  const salesOrderIdPrefill = firstSearchParam(sp, "sales_order_id");
  const wantSalesOrderPrefill =
    salesOrderIdPrefill && firstSearchParam(sp, "new") === "1";

  let prefillFromSalesOrder: FinanceSalesOrderRow | null = null;
  if (wantSalesOrderPrefill && salesOrderIdPrefill) {
    const { data: soPrefill } = await supabase
      .from("finance_sales_orders")
      .select(
        `id, sales_order_number, order_date, expected_delivery_date, client_id, order_type,
        notes, terms_and_conditions, scope_of_work, bank_details, seal_and_sign,
        subtotal, tax_total, grand_total,
        finance_sales_order_lines(
          id, sales_order_id, sort_order, product_master_item_id, item_description,
          unit_of_item, qty, unit_rate, line_discount, gst_rate, line_subtotal, line_tax, line_total
        )`,
      )
      .eq("id", salesOrderIdPrefill)
      .maybeSingle();
    prefillFromSalesOrder = (soPrefill ?? null) as unknown as FinanceSalesOrderRow | null;
  }

  return (
    <FinanceCreditNotesMaster
      initialRows={rows}
      fetchError={qErr?.message ?? null}
      queryError={firstSearchParam(sp, "error")}
      clientRows={clientRows}
      productRows={productRows}
      defaultBankDetails={defaultBankDetails}
      sealSignImageUrl={sealSignImageUrl}
      letterheadUpperImageUrl={letterheadUpperImageUrl}
      letterheadLowerImageUrl={letterheadLowerImageUrl}
      termsTemplates={termsTemplates}
      scopeTemplates={scopeTemplates}
      notesTemplates={notesTemplates}
      prefillFromSalesOrder={prefillFromSalesOrder}
      printSettings={printSettings}
      printCompany={printCompany}
    />
  );
}
