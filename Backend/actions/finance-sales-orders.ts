"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { joinSalesOrderNumberParts } from "@backend/modules/finance/finance-sales-order-number";
import { createClient } from "@backend/db/supabase/server";

const LIST_PATH = "/dashboard/finance/sales/sales-order";
type OrderStatus = "pending" | "accepted" | "cancelled";

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function nullableStr(formData: FormData, key: string) {
  const s = str(formData, key);
  return s ? s : null;
}

function parseGstPercent(raw: string): number {
  const m = String(raw ?? "")
    .trim()
    .match(/^(\d+(?:\.\d+)?)/);
  if (!m) return 0;
  const n = Number(m[1]);
  return Number.isFinite(n) ? Math.min(n, 100) : 0;
}

type LineIn = {
  product_master_item_id: string | null;
  item_description: string;
  unit_of_item: string;
  qty: number;
  unit_rate: number;
  line_discount: string;
  gst_rate: string;
};

function parseLinesJson(raw: string): LineIn[] {
  try {
    const v = JSON.parse(raw) as unknown;
    if (!Array.isArray(v)) return [];
    const out: LineIn[] = [];
    for (const row of v) {
      if (!row || typeof row !== "object") continue;
      const o = row as Record<string, unknown>;
      const qty = Number(o.qty);
      const unit_rate = Number(o.unit_rate);
      const pid =
        typeof o.product_master_item_id === "string" && o.product_master_item_id
          ? o.product_master_item_id
          : null;
      const lineDiscountRaw = String(o.line_discount ?? "").trim();
      out.push({
        product_master_item_id: pid,
        item_description: String(o.item_description ?? "").trim(),
        unit_of_item: String(o.unit_of_item ?? "").trim(),
        qty: Number.isFinite(qty) ? qty : 0,
        unit_rate: Number.isFinite(unit_rate) ? unit_rate : 0,
        line_discount: lineDiscountRaw || "0%",
        gst_rate: String(o.gst_rate ?? "").trim(),
      });
    }
    return out;
  } catch {
    return [];
  }
}

function computeTotals(lines: LineIn[]) {
  let subtotal = 0;
  let taxTotal = 0;
  let grandTotal = 0;
  const built = lines.map((L, idx) => {
    const qty = Math.max(0, L.qty);
    const rate = Math.max(0, L.unit_rate);
    const gross = Math.round(qty * rate * 100) / 100;
    const discPct = parseGstPercent(L.line_discount);
    const discAmt = Math.round(gross * (discPct / 100) * 100) / 100;
    const lineSub = Math.max(0, Math.round((gross - discAmt) * 100) / 100);
    const pct = parseGstPercent(L.gst_rate);
    const lineTax = Math.round(lineSub * (pct / 100) * 100) / 100;
    const lineTot = Math.round((lineSub + lineTax) * 100) / 100;
    subtotal += lineSub;
    taxTotal += lineTax;
    grandTotal += lineTot;
    const discountStored =
      L.line_discount?.trim() && L.line_discount.trim() !== "0%"
        ? L.line_discount.trim()
        : null;
    return {
      sort_order: idx,
      product_master_item_id: L.product_master_item_id,
      item_description: L.item_description || null,
      unit_of_item: L.unit_of_item || null,
      qty,
      unit_rate: rate,
      line_discount: discountStored,
      gst_rate: L.gst_rate || null,
      line_subtotal: lineSub,
      line_tax: lineTax,
      line_total: lineTot,
    };
  });
  subtotal = Math.round(subtotal * 100) / 100;
  taxTotal = Math.round(taxTotal * 100) / 100;
  grandTotal = Math.round(grandTotal * 100) / 100;
  return { built, subtotal, taxTotal, grandTotal };
}

export async function saveFinanceSalesOrder(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = nullableStr(formData, "id");
  const order_date = str(formData, "order_date");
  const expected_delivery_date = str(formData, "expected_delivery_date");
  const client_id = nullableStr(formData, "client_id");
  const quotation_id = nullableStr(formData, "quotation_id");
  const order_type = str(formData, "order_type") || "service";
  const order_status_in = str(formData, "order_status").toLowerCase();
  const order_status: OrderStatus | null =
    order_status_in === "accepted" || order_status_in === "cancelled"
      ? order_status_in
      : order_status_in === "pending"
        ? "pending"
        : null;
  if (order_type !== "service" && order_type !== "supply") {
    redirect(`${LIST_PATH}?error=type`);
  }
  if (!order_date || !expected_delivery_date) redirect(`${LIST_PATH}?error=dates`);

  const lines = parseLinesJson(str(formData, "lines_json"));
  const validLines = lines.filter(
    (L) =>
      L.product_master_item_id ||
      L.item_description ||
      L.unit_rate > 0 ||
      L.qty > 0,
  );
  if (validLines.length === 0) redirect(`${LIST_PATH}?error=lines`);

  const { built, subtotal, taxTotal, grandTotal } = computeTotals(validLines);

  const sales_order_number_in = joinSalesOrderNumberParts(
    str(formData, "sales_order_number_prefix"),
    str(formData, "sales_order_number_value"),
  );

  const header = {
    order_date,
    expected_delivery_date,
    client_id,
    quotation_id,
    order_type,
    ...(order_status ? { order_status } : {}),
    notes: nullableStr(formData, "notes"),
    terms_and_conditions: nullableStr(formData, "terms_and_conditions"),
    scope_of_work: nullableStr(formData, "scope_of_work"),
    bank_details: nullableStr(formData, "bank_details"),
    seal_and_sign: nullableStr(formData, "seal_and_sign"),
    subtotal,
    tax_total: taxTotal,
    grand_total: grandTotal,
    updated_at: new Date().toISOString(),
  };

  if (id) {
    if (!sales_order_number_in) {
      redirect(`${LIST_PATH}?error=sales_order_number_required`);
    }
    const { error: uErr } = await supabase
      .from("finance_sales_orders")
      .update({
        ...header,
        sales_order_number: sales_order_number_in,
      })
      .eq("id", id);
    if (uErr?.code === "23505") {
      redirect(`${LIST_PATH}?error=sales_order_number_duplicate`);
    }
    if (uErr) redirect(`${LIST_PATH}?error=db`);
    const { error: dErr } = await supabase
      .from("finance_sales_order_lines")
      .delete()
      .eq("sales_order_id", id);
    if (dErr) redirect(`${LIST_PATH}?error=db`);
    const rows = built.map((b) => ({ ...b, sales_order_id: id }));
    const { error: lErr } = await supabase.from("finance_sales_order_lines").insert(rows);
    if (lErr) redirect(`${LIST_PATH}?error=db`);
    revalidatePath(LIST_PATH, "layout");
    redirect(`${LIST_PATH}?id=${encodeURIComponent(id)}`);
  }

  const insertHeader = {
    ...header,
    sales_order_number: sales_order_number_in,
    created_by: user.id,
  };

  const { data: ins, error: iErr } = await supabase
    .from("finance_sales_orders")
    .insert(insertHeader)
    .select("id")
    .single();
  if (iErr?.code === "23505") {
    redirect(`${LIST_PATH}?error=sales_order_number_duplicate`);
  }
  if (iErr || !ins?.id) redirect(`${LIST_PATH}?error=db`);

  const newId = ins.id as string;
  const rows = built.map((b) => ({ ...b, sales_order_id: newId }));
  const { error: lErr } = await supabase.from("finance_sales_order_lines").insert(rows);
  if (lErr) redirect(`${LIST_PATH}?error=db`);

  revalidatePath(LIST_PATH, "layout");
  redirect(`${LIST_PATH}?id=${encodeURIComponent(newId)}`);
}

export async function deleteFinanceSalesOrder(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const trimmed = id.trim();
  if (!trimmed) redirect(LIST_PATH);
  const { error } = await supabase.from("finance_sales_orders").delete().eq("id", trimmed);
  if (error) redirect(`${LIST_PATH}?error=db`);
  revalidatePath(LIST_PATH, "layout");
  redirect(LIST_PATH);
}

export async function deleteFinanceSalesOrderForm(formData: FormData) {
  await deleteFinanceSalesOrder(String(formData.get("id") ?? ""));
}

export async function deleteFinanceSalesOrders(ids: string[]) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const trimmed = [...new Set(ids.map((id) => id?.trim()).filter(Boolean))];
  if (trimmed.length === 0) redirect(LIST_PATH);

  const { error } = await supabase
    .from("finance_sales_orders")
    .delete()
    .in("id", trimmed);
  if (error) redirect(`${LIST_PATH}?error=db`);

  revalidatePath(LIST_PATH, "layout");
  redirect(LIST_PATH);
}

function nullableStrFromRecord(rec: Record<string, string>, key: string) {
  const s = String(rec[key] ?? "").trim();
  return s ? s : null;
}

export async function importFinanceSalesOrders(
  records: Record<string, string>[],
): Promise<{ ok: true; inserted: number } | { ok: false; error: string }> {
  if (records.length === 0) {
    return { ok: false, error: "No rows to import." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const now = new Date().toISOString();

  for (let i = 0; i < records.length; i++) {
    const rec = records[i];
    const order_date = String(rec.order_date ?? "").trim();
    const expected_delivery_date = String(rec.expected_delivery_date ?? "").trim();
    if (!order_date || !expected_delivery_date) {
      return {
        ok: false,
        error: `Row ${i + 2} (after header): order_date and expected_delivery_date are required.`,
      };
    }

    const order_typeRaw = String(rec.order_type ?? "service").trim();
    const order_type = order_typeRaw === "supply" ? "supply" : "service";

    const lines = parseLinesJson(String(rec.lines_json ?? ""));
    const validLines = lines.filter(
      (L) =>
        L.product_master_item_id ||
        L.item_description ||
        L.unit_rate > 0 ||
        L.qty > 0,
    );
    if (validLines.length === 0) {
      return {
        ok: false,
        error: `Row ${i + 2} (after header): lines_json must contain at least one line with qty, rate, description, or product.`,
      };
    }

    const { built, subtotal, taxTotal, grandTotal } = computeTotals(validLines);

    const clientRaw = String(rec.client_id ?? "").trim();
    const client_id = clientRaw ? clientRaw : null;

    const qidRaw = String(rec.quotation_id ?? "").trim();
    const quotation_id = qidRaw ? qidRaw : null;

    const header = {
      order_date,
      expected_delivery_date,
      client_id,
      quotation_id,
      order_type,
      order_status:
        String(rec.order_status ?? "").trim().toLowerCase() === "accepted" ||
        String(rec.order_status ?? "").trim().toLowerCase() === "cancelled"
          ? (String(rec.order_status ?? "").trim().toLowerCase() as OrderStatus)
          : "pending",
      notes: nullableStrFromRecord(rec, "notes"),
      terms_and_conditions: nullableStrFromRecord(rec, "terms_and_conditions"),
      scope_of_work: nullableStrFromRecord(rec, "scope_of_work"),
      bank_details: nullableStrFromRecord(rec, "bank_details"),
      seal_and_sign: nullableStrFromRecord(rec, "seal_and_sign"),
      subtotal,
      tax_total: taxTotal,
      grand_total: grandTotal,
      updated_at: now,
    };

    const soNum = String(rec.sales_order_number ?? "").trim();
    const insertHeader = {
      ...header,
      sales_order_number: soNum,
      created_by: user.id,
    };

    const { data: ins, error: iErr } = await supabase
      .from("finance_sales_orders")
      .insert(insertHeader)
      .select("id")
      .single();
    if (iErr || !ins?.id) {
      if (iErr?.code === "23505") {
        return {
          ok: false,
          error: `Row ${i + 2} (after header): duplicate sales_order_number or database constraint.`,
        };
      }
      return {
        ok: false,
        error: `Row ${i + 2} (after header): could not insert (${iErr?.message ?? "unknown error"}).`,
      };
    }

    const newId = ins.id as string;
    const lineRows = built.map((b) => ({ ...b, sales_order_id: newId }));
    const { error: lErr } = await supabase
      .from("finance_sales_order_lines")
      .insert(lineRows);
    if (lErr) {
      await supabase.from("finance_sales_orders").delete().eq("id", newId);
      return {
        ok: false,
        error: `Row ${i + 2} (after header): could not insert line items.`,
      };
    }
  }

  revalidatePath(LIST_PATH, "layout");
  return { ok: true, inserted: records.length };
}

export async function updateFinanceSalesOrderStatus(input: {
  id: string;
  status: OrderStatus;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please login again." };

  const id = String(input.id ?? "").trim();
  const statusRaw = String(input.status ?? "").trim().toLowerCase();
  const status: OrderStatus =
    statusRaw === "accepted" || statusRaw === "cancelled" ? statusRaw : "pending";
  if (!id) return { ok: false, error: "Sales order id missing." };

  const { error } = await supabase
    .from("finance_sales_orders")
    .update({
      order_status: status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { ok: false, error: "Could not update sales order status." };

  revalidatePath(LIST_PATH, "layout");
  return { ok: true };
}
