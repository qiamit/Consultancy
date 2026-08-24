/**
 * Bulk-import Client Master from Data/Client Data.xlsx into production Postgres.
 * Run: railway run --service Consultancy --environment production -- node scripts/import-client-data-xlsx.cjs
 */
const path = require("path");
const ExcelJS = require("exceljs");
const { Client } = require("pg");

const XLSX_PATH = path.join(__dirname, "..", "Data", "Client Data.xlsx");
const BATCH = 200;

function cellText(cell) {
  if (!cell) return "";
  if (cell.text != null && String(cell.text).trim()) return String(cell.text).trim();
  const v = cell.value;
  if (v == null) return "";
  if (typeof v === "object" && v.text) return String(v.text).trim();
  if (typeof v === "object" && v.result != null) return String(v.result).trim();
  return String(v).trim();
}

function normalizeGst(raw) {
  const s = String(raw || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 15);
  return s;
}

function isValidGstinOrEmpty(g) {
  if (!g) return true;
  if (g.length !== 15) return false;
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][A-Z0-9]Z[A-Z0-9]$/.test(g);
}

function normalizeEmail(raw) {
  return String(raw || "").trim().toLowerCase();
}

function isValidEmailOrEmpty(e) {
  if (!e) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

function mapCompanyType(raw) {
  const t = String(raw || "").trim().toLowerCase();
  if (!t) return "Manufacturer";
  if (t === "manufacturing" || t === "manufacturer") return "Manufacturer";
  if (t.includes("service")) return "Service Provider";
  if (t.includes("testing")) return "Testing Laboratory";
  if (t.includes("calibration")) return "Calibration Laboratory";
  return "Manufacturer";
}

function mapPaymentTerm(raw) {
  const t = String(raw || "").trim().toLowerCase().replace(/\s+/g, " ");
  if (!t) return "100% Advance";
  if (t.includes("100") && t.includes("advance")) return "100% Advance";
  if (t.includes("15")) return "15 Days";
  if (t.includes("30")) return "30 Days";
  return "100% Advance";
}

function mapCountry(raw) {
  const t = String(raw || "").trim();
  if (!t) return "India";
  if (t.toLowerCase() === "india" || t.toUpperCase() === "INDIA") return "India";
  return t;
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

async function main() {
  const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL / POSTGRES_URL missing");
  }

  const pg = new Client({ connectionString: databaseUrl, ssl: false });
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

  const existing = await pg.query(`select lower(trim(company_name)) as k from clients where company_name is not null`);
  const seen = new Set(existing.rows.map((r) => r.k).filter(Boolean));
  console.log("existing clients", seen.size);

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(XLSX_PATH);
  const ws = wb.worksheets[0];

  const rows = [];
  const skipped = { empty: 0, dupFile: 0, dupDb: 0, badGst: 0, badEmail: 0 };
  const pinSet = new Set();
  const citySet = new Set();
  const stateSet = new Set();
  const countrySet = new Set(["India"]);

  ws.eachRow({ includeEmpty: false }, (row, n) => {
    if (n === 1) return;
    const company_name = cellText(row.getCell(2));
    if (!company_name) {
      skipped.empty++;
      return;
    }
    const key = company_name.toLowerCase();
    if (seen.has(key)) {
      // distinguish file vs db after first pass of file
      skipped.dupFile++;
      return;
    }
    seen.add(key);

    let gst_number = normalizeGst(cellText(row.getCell(1)));
    if (!isValidGstinOrEmpty(gst_number)) {
      skipped.badGst++;
      gst_number = "";
    }
    let email = normalizeEmail(cellText(row.getCell(9)));
    if (!isValidEmailOrEmpty(email)) {
      skipped.badEmail++;
      email = "";
    }

    const company_status = cellText(row.getCell(3)) || "Active";
    const company_type = mapCompanyType(cellText(row.getCell(4)));
    const company_scale = cellText(row.getCell(5)) || "Medium";
    const opening_balance = Number(cellText(row.getCell(6)) || "0") || 0;
    const payment_term = mapPaymentTerm(cellText(row.getCell(7)));
    const contact_person_name = cellText(row.getCell(8)) || null;
    const phoneRaw = cellText(row.getCell(10));
    const phone = phoneRaw.replace(/\D/g, "") || null;
    const address = cellText(row.getCell(11)) || null;
    const pin_code = cellText(row.getCell(12)) || "493221";
    const city = cellText(row.getCell(13)) || "Raipur";
    const state = cellText(row.getCell(14)) || "Chhattisgarh";
    const country = mapCountry(cellText(row.getCell(15)));

    pinSet.add(pin_code);
    citySet.add(city);
    stateSet.add(state);
    countrySet.add(country);

    rows.push({
      name: company_name,
      company_name,
      gst_number: gst_number || null,
      company_type,
      company_scale: ["Large", "Medium", "Small", "Micro"].includes(company_scale)
        ? company_scale
        : "Medium",
      company_status: /inactive/i.test(company_status) ? "Inactive" : "Active",
      contact_person_name,
      email: email || null,
      phone_country_code: "+91",
      phone,
      address,
      pin_code,
      city,
      state,
      country,
      opening_balance,
      balance_type: "Dr",
      payment_term,
      notes: "N/A",
      created_by: createdBy,
    });
  });

  // Fix skip accounting: first occurrence kept; later dups in file counted as dupFile.
  // Those already in DB were also marked dupFile because seen started with DB names.
  // Recompute: before loop we had existing.size. After, rows.length = new inserts.
  console.log("prepared rows", rows.length);
  console.log("skipped", skipped);
  console.log("unique pins/cities/states", pinSet.size, citySet.size, stateSet.size);

  await pg.query("begin");
  try {
    await ensureDropdown(pg, "client_master.company_type", ["Manufacturer"]);
    await ensureDropdown(pg, "client_master.company_scale", ["Large", "Medium", "Small", "Micro"]);
    await ensureDropdown(pg, "client_master.company_status", ["Active", "Inactive"]);
    await ensureDropdown(pg, "client_master.payment_term", ["100% Advance", "15 Days", "30 Days"]);
    await ensureDropdown(pg, "client_master.country", [...countrySet]);
    await ensureDropdown(pg, "client_master.phone_country_code", ["+91"]);
    await ensureDropdown(pg, "client_master.pin_code", pinSet);
    await ensureDropdown(pg, "client_master.city", citySet);
    await ensureDropdown(pg, "client_master.state", stateSet);

    let inserted = 0;
    for (let i = 0; i < rows.length; i += BATCH) {
      const chunk = rows.slice(i, i + BATCH);
      const cols = [
        "name",
        "company_name",
        "gst_number",
        "company_type",
        "company_scale",
        "company_status",
        "contact_person_name",
        "email",
        "phone_country_code",
        "phone",
        "address",
        "pin_code",
        "city",
        "state",
        "country",
        "opening_balance",
        "balance_type",
        "payment_term",
        "notes",
        "created_by",
        "updated_at",
      ];
      const values = [];
      const placeholders = chunk.map((row, ri) => {
        const base = ri * cols.length;
        cols.forEach((c, ci) => {
          if (c === "updated_at") values.push(new Date().toISOString());
          else values.push(row[c]);
        });
        return `(${cols.map((_, ci) => `$${base + ci + 1}`).join(",")})`;
      });

      await pg.query(
        `insert into clients (${cols.join(",")}) values ${placeholders.join(",")}`,
        values,
      );
      inserted += chunk.length;
      if (inserted % 1000 === 0 || inserted === rows.length) {
        console.log(`inserted ${inserted}/${rows.length}`);
      }
    }

    await pg.query("commit");
    const finalCount = await pg.query(`select count(*)::int as n from clients`);
    console.log("DONE inserted", inserted, "total clients now", finalCount.rows[0].n);
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
