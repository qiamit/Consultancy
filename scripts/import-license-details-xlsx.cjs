/**
 * Bulk-import / sync BIS Projects (License Details) from Data/License Details.xlsx.
 * Resolves IS Code -> is_codes.id and Name of Client -> clients.id.
 * Upserts by cm_l_digits (CML Number).
 *
 * Local:  node scripts/import-license-details-xlsx.cjs
 * Railway: railway run --service Consultancy --environment production -- node scripts/import-license-details-xlsx.cjs
 */
const path = require("path");
const ExcelJS = require("exceljs");
const { Client } = require("pg");

const XLSX_PATH = path.join(__dirname, "..", "Data", "License Details.xlsx");
const BATCH = 200;

function cellText(cell) {
  if (!cell) return "";
  if (cell.text != null && String(cell.text).trim()) {
    const t = String(cell.text).trim();
    if (t !== "Invalid Date") return t;
  }
  const v = cell.value;
  if (v == null) return "";
  if (typeof v === "object" && v.text) return String(v.text).trim();
  if (typeof v === "object" && v.result != null) return String(v.result).trim();
  return String(v).trim();
}

function parseDateCell(cell) {
  const v = cell?.value;
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    const y = v.getUTCFullYear();
    const m = String(v.getUTCMonth() + 1).padStart(2, "0");
    const d = String(v.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  const s = cellText(cell);
  if (!s || /^not applicable$/i.test(s)) return null;
  const m1 = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m1) return `${m1[1]}-${m1[2]}-${m1[3]}`;
  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) {
    const y = parsed.getUTCFullYear();
    const m = String(parsed.getUTCMonth() + 1).padStart(2, "0");
    const d = String(parsed.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return null;
}

function money(raw) {
  const s = String(raw ?? "").replace(/,/g, "").trim();
  if (!s || /^n\/?a$/i.test(s)) return 0;
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

function nullablePortal(raw) {
  const s = String(raw ?? "").trim();
  if (!s || /^not applicable$/i.test(s)) return null;
  return s;
}

function nullableScope(raw) {
  const s = String(raw ?? "").trim();
  if (!s || /^not applicable$/i.test(s)) return null;
  return s;
}

function mapProjectKind(raw) {
  const t = String(raw ?? "").trim();
  if (!t) return "Licence";
  if (/^licen/i.test(t)) return "Licence";
  if (/^application$/i.test(t)) return "Application";
  return t;
}

function mapBillingFrequency(raw) {
  const t = String(raw ?? "").trim();
  if (!t) return "Yearly";
  const known = ["Monthly", "Quarterly", "Half Yearly", "Yearly", "Based on Work"];
  const hit = known.find((k) => k.toLowerCase() === t.toLowerCase());
  return hit || "Yearly";
}

function companyKey(name) {
  return String(name || "").trim().toLowerCase();
}

function cmDigits(raw) {
  const d = String(raw ?? "").replace(/\D/g, "");
  if (d.length === 10) return d;
  // Excel often drops leading zeros from CM/L numbers (7-digit values in sheet).
  if (d.length >= 5 && d.length < 10) return d.padStart(10, "0");
  return null;
}

function buildIsCodeLookups(rows) {
  const byNumber = new Map();
  const byExactLabel = new Map();
  const byId = new Map();

  for (const row of rows) {
    byId.set(row.id, row);
    const numKey = row.is_number.trim().toLowerCase();
    if (!byNumber.has(numKey)) byNumber.set(numKey, []);
    byNumber.get(numKey).push(row);
    if (row.revision_year != null) {
      byExactLabel.set(`${row.is_number.trim()}: ${row.revision_year}`.toLowerCase(), row.id);
    }
  }

  return { byNumber, byExactLabel, byId };
}

function resolveIsCodeId(label, lookups) {
  const s = label.trim();
  if (!s) return null;

  const mColon = s.match(/^(.+?)\s*:\s*(\d{4})\s*$/);
  if (mColon) {
    const isNum = mColon[1].trim().toLowerCase();
    const year = Number(mColon[2]);
    const list = lookups.byNumber.get(isNum) || [];
    const hit = list.find((c) => Number(c.revision_year) === year);
    if (hit) return hit.id;
  }

  const exact = lookups.byExactLabel.get(s.toLowerCase());
  if (exact) return exact;

  const list = lookups.byNumber.get(s.toLowerCase()) || [];
  if (list.length === 1) return list[0].id;
  if (list.length > 1) {
    const sorted = [...list].sort(
      (a, b) => (Number(b.revision_year) || 0) - (Number(a.revision_year) || 0),
    );
    return sorted[0].id;
  }

  return null;
}

function buildTitle(clientRow, isCodeRow) {
  const clientPart = (clientRow.company_name || clientRow.name || "").trim();
  const isNumber = (isCodeRow.is_number || "").trim();
  const year = isCodeRow.revision_year;
  const title = (isCodeRow.is_code_title || "").trim();
  let isPart = isNumber;
  if (year != null && Number.isFinite(Number(year))) {
    isPart = `${isNumber}: ${year}`;
  } else if (title) {
    isPart = `${isNumber} — ${title}`;
  }
  const joined = [clientPart, isPart].filter(Boolean).join(" / ");
  if (!joined) return "BIS project";
  return joined.length > 500 ? `${joined.slice(0, 497)}…` : joined;
}

async function ensureDropdown(client, optionKey, values) {
  const uniq = [...new Set([...values].map((v) => String(v || "").trim()).filter(Boolean))];
  if (!uniq.length) return;
  await client.query(
    `insert into app_dropdown_options (option_key, value, label, sort_order)
     select $1, v, null, 0
     from unnest($2::text[]) as v
     on conflict (option_key, value) do nothing`,
    [optionKey, uniq],
  );
}

function parseExcelRow(row, ctx) {
  const isCodeLabel = cellText(row.getCell(2));
  const clientName = cellText(row.getCell(5));
  const cml = cmDigits(cellText(row.getCell(3)));

  if (!clientName) {
    ctx.skipped.emptyClient++;
    return null;
  }
  if (!isCodeLabel) {
    ctx.skipped.emptyIs++;
    return null;
  }
  if (!cml) {
    ctx.skipped.badCml++;
    return null;
  }

  const clientId = ctx.clientByKey.get(companyKey(clientName));
  if (!clientId) {
    ctx.skipped.noClient++;
    ctx.unmatchedClients.add(clientName);
    return null;
  }

  const isCodeId = resolveIsCodeId(isCodeLabel, ctx.isLookups);
  if (!isCodeId) {
    ctx.skipped.noIs++;
    ctx.unmatchedIs.add(isCodeLabel);
    return null;
  }

  const clientRow = ctx.clientById.get(clientId);
  const isCodeRow = ctx.isLookups.byId.get(isCodeId);

  const project_kind = mapProjectKind(cellText(row.getCell(1)));
  const license_validity_date = parseDateCell(row.getCell(4));
  const case_handled_by = cellText(row.getCell(8)) || "Amit Kumar";
  const case_referred_by = cellText(row.getCell(9)) || "QE";
  const billing_amount = money(cellText(row.getCell(10)));
  const billing_frequency = mapBillingFrequency(cellText(row.getCell(11)));
  const notes = nullableScope(cellText(row.getCell(12)));
  const portal_user_id = nullablePortal(cellText(row.getCell(6)));
  const portal_password = nullablePortal(cellText(row.getCell(7)));

  return {
    key: cml,
    title: buildTitle(clientRow, isCodeRow),
    project_kind,
    status: "in_progress",
    client_id: clientId,
    is_code_id: isCodeId,
    cm_l_digits: cml,
    license_number: cml,
    license_validity_date,
    case_handled_by,
    case_referred_by,
    billing_amount,
    billing_frequency,
    portal_user_id,
    portal_password,
    notes,
    start_date: null,
    target_date: null,
    created_by: ctx.createdBy,
  };
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL / POSTGRES_URL missing");
  }

  const ssl = databaseUrl.includes("railway") ? { rejectUnauthorized: false } : false;
  const pg = new Client({ connectionString: databaseUrl, ssl });
  await pg.connect();

  const userRes = await pg.query(
    `select id, email from app_users
     where lower(email) = lower($1)
        or lower(email) like '%admin%'
     order by case when lower(email) = lower($1) then 0 else 1 end
     limit 1`,
    [process.env.SUPER_ADMIN_EMAIL || "info@qengineering.in"],
  );
  if (!userRes.rows[0]) {
    throw new Error("No app_users row found for created_by");
  }
  const createdBy = userRes.rows[0].id;
  console.log("created_by", userRes.rows[0].email, createdBy);

  const clientsRes = await pg.query(
    `select id, name, company_name, lower(trim(company_name)) as k
     from clients where company_name is not null`,
  );
  const clientByKey = new Map(
    clientsRes.rows.filter((r) => r.k).map((r) => [r.k, r.id]),
  );
  const clientById = new Map(clientsRes.rows.map((r) => [r.id, r]));
  console.log("clients lookup", clientByKey.size);

  const isRes = await pg.query(
    `select id, is_number, is_code_title, revision_year from is_codes where is_number is not null`,
  );
  const isLookups = buildIsCodeLookups(isRes.rows);
  console.log("is_codes lookup", isRes.rows.length);

  const existingRes = await pg.query(
    `select id, cm_l_digits from bis_projects where cm_l_digits is not null`,
  );
  const existingByCml = new Map(
    existingRes.rows.filter((r) => r.cm_l_digits).map((r) => [r.cm_l_digits, r.id]),
  );
  console.log("existing bis_projects", existingByCml.size);

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(XLSX_PATH);
  const ws = wb.worksheets[0];
  console.log("excel sheet", ws.name, "rows", ws.rowCount);

  const ctx = {
    createdBy,
    clientByKey,
    clientById,
    isLookups,
    skipped: {
      emptyClient: 0,
      emptyIs: 0,
      badCml: 0,
      noClient: 0,
      noIs: 0,
      dupFile: 0,
    },
    unmatchedClients: new Set(),
    unmatchedIs: new Set(),
  };

  const byCml = new Map();
  ws.eachRow({ includeEmpty: false }, (row, n) => {
    if (n === 1) return;
    const parsed = parseExcelRow(row, ctx);
    if (!parsed) return;
    if (byCml.has(parsed.key)) ctx.skipped.dupFile++;
    byCml.set(parsed.key, parsed);
  });

  const rows = [...byCml.values()];

  console.log("parsed unique rows", rows.length);
  console.log("skipped", ctx.skipped);

  const kindSet = new Set(rows.map((r) => r.project_kind));
  const billingSet = new Set(rows.map((r) => r.billing_frequency));
  const handledSet = new Set(rows.map((r) => r.case_handled_by));
  const referredSet = new Set(rows.map((r) => r.case_referred_by));

  await pg.query("begin");
  try {
    await pg.query(`
      create unique index if not exists bis_projects_cm_l_digits_uidx
      on bis_projects (cm_l_digits)
      where cm_l_digits is not null
    `);

    await ensureDropdown(pg, "bis_projects.project_kind_catalog", kindSet);
    await ensureDropdown(pg, "bis_projects.billing_frequency_catalog", billingSet);
    await ensureDropdown(pg, "bis_projects.case_handled_by", handledSet);
    await ensureDropdown(pg, "bis_projects.case_referred_by", referredSet);

    let inserted = 0;
    let updated = 0;
    const upsertCols = [
      "title",
      "project_kind",
      "status",
      "client_id",
      "is_code_id",
      "cm_l_digits",
      "license_number",
      "license_validity_date",
      "case_handled_by",
      "case_referred_by",
      "billing_amount",
      "billing_frequency",
      "portal_user_id",
      "portal_password",
      "notes",
      "start_date",
      "target_date",
      "created_by",
    ];

    for (let i = 0; i < rows.length; i += BATCH) {
      const chunk = rows.slice(i, i + BATCH);
      const values = [];
      const placeholders = chunk.map((row, ri) => {
        const base = ri * upsertCols.length;
        upsertCols.forEach((c) => values.push(row[c]));
        return `(${upsertCols.map((_, ci) => `$${base + ci + 1}`).join(",")})`;
      });

      const result = await pg.query(
        `insert into bis_projects (${upsertCols.join(",")}, updated_at)
         values ${placeholders.map((p) => p.replace(/\)$/, ", now())")).join(",")}
         on conflict (cm_l_digits) where cm_l_digits is not null do update set
           title = excluded.title,
           project_kind = excluded.project_kind,
           status = excluded.status,
           client_id = excluded.client_id,
           is_code_id = excluded.is_code_id,
           license_number = excluded.license_number,
           license_validity_date = excluded.license_validity_date,
           case_handled_by = excluded.case_handled_by,
           case_referred_by = excluded.case_referred_by,
           billing_amount = excluded.billing_amount,
           billing_frequency = excluded.billing_frequency,
           portal_user_id = excluded.portal_user_id,
           portal_password = excluded.portal_password,
           notes = excluded.notes,
           start_date = excluded.start_date,
           target_date = excluded.target_date,
           updated_at = now()
         returning (xmax = 0) as inserted`,
        values,
      );

      for (const r of result.rows) {
        if (r.inserted) inserted++;
        else updated++;
      }

      if ((inserted + updated) % 5000 < BATCH || i + BATCH >= rows.length) {
        console.log(`upserted ${inserted + updated}/${rows.length} (ins ${inserted}, upd ${updated})`);
      }
    }

    await pg.query("commit");

    const finalCount = await pg.query(`select count(*)::int as n from bis_projects`);
    console.log(
      "DONE inserted",
      inserted,
      "updated",
      updated,
      "skipped_no_is",
      ctx.skipped.noIs,
      "skipped_no_client",
      ctx.skipped.noClient,
      "total bis_projects now",
      finalCount.rows[0].n,
    );
    console.log(
      "unmatched is codes (unique)",
      ctx.unmatchedIs.size,
      [...ctx.unmatchedIs].slice(0, 20),
    );
    console.log(
      "unmatched clients (unique)",
      ctx.unmatchedClients.size,
      [...ctx.unmatchedClients].slice(0, 20),
    );
  } catch (e) {
    await pg.query("rollback");
    throw e;
  } finally {
    await pg.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
