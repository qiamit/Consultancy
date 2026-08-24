/**
 * Upsert IS Code Master from Data/IS Code Details.xlsx
 * Run: railway run --service Postgres-MC1Y --environment production -- node scripts/import-is-code-details-xlsx.cjs
 */
const path = require("path");
const ExcelJS = require("exceljs");
const { Client } = require("pg");

const XLSX_PATH = path.join(__dirname, "..", "Data", "IS Code Details.xlsx");
const BATCH = 150;

function cellText(cell) {
  if (!cell) return "";
  if (cell.text != null && String(cell.text).trim()) return String(cell.text).trim();
  const v = cell.value;
  if (v == null) return "";
  if (typeof v === "object" && v.text) return String(v.text).trim();
  if (typeof v === "object" && v.result != null) return String(v.result).trim();
  return String(v).trim();
}

function money(raw) {
  const s = String(raw ?? "").replace(/,/g, "").trim();
  if (!s || /^n\/?a$/i.test(s)) return 0;
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function yearOrNull(raw) {
  const s = String(raw ?? "").trim();
  if (!s || s === "0") return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  if (n < 1000 || n > 9999) return null;
  return Math.trunc(n);
}

function revisionYear(raw) {
  const n = yearOrNull(raw);
  if (n == null) throw new Error(`Invalid revision year: ${raw}`);
  return n;
}

function amendment(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return "00";
  if (/^\d+$/.test(s)) return s.padStart(2, "0");
  return s;
}

function qty(raw, fallback) {
  const s = String(raw ?? "").trim();
  if (!s) return fallback;
  return s;
}

async function ensureDropdown(client, optionKey, values) {
  const uniq = [
    ...new Set([...values].map((v) => String(v || "").trim()).filter(Boolean)),
  ];
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
  if (!databaseUrl) throw new Error("DATABASE_URL / POSTGRES_URL missing");

  const pg = new Client({ connectionString: databaseUrl, ssl: false });
  await pg.connect();

  const userRes = await pg.query(
    `select id, email from app_users
     where lower(email) = lower($1)
     order by 1 limit 1`,
    [process.env.SUPER_ADMIN_EMAIL || "info@qengineering.in"],
  );
  if (!userRes.rows[0]) throw new Error("No app_users for created_by");
  const createdBy = userRes.rows[0].id;
  console.log("created_by", userRes.rows[0].email);

  const existing = await pg.query(
    `select id, lower(trim(is_number)) as is_number, revision_year from is_codes`,
  );
  const byKey = new Map(
    existing.rows.map((r) => [`${r.is_number}|${r.revision_year}`, r.id]),
  );
  console.log("existing is_codes", byKey.size);

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(XLSX_PATH);
  const ws = wb.worksheets[0];

  const rows = [];
  const unitSet = new Set(["Tonne"]);
  const aspectSet = new Set(["Specification"]);
  const skipped = { empty: 0, badYear: 0, dupFile: 0 };
  const seenFile = new Set();

  ws.eachRow({ includeEmpty: false }, (row, n) => {
    if (n === 1) return;
    const is_number = cellText(row.getCell(1));
    if (!is_number) {
      skipped.empty++;
      return;
    }

    let revision_year;
    try {
      revision_year = revisionYear(cellText(row.getCell(2)));
    } catch {
      skipped.badYear++;
      return;
    }

    const key = `${is_number.toLowerCase()}|${revision_year}`;
    if (seenFile.has(key)) {
      skipped.dupFile++;
      return;
    }
    seenFile.add(key);

    const aspect_of_is = cellText(row.getCell(5)) || "Specification";
    let unit_of_is = cellText(row.getCell(13));
    if (!unit_of_is) unit_of_is = "Tonne";

    aspectSet.add(aspect_of_is);
    unitSet.add(unit_of_is);

    const pm = cellText(row.getCell(6));
    const title = cellText(row.getCell(7));
    if (!title) {
      skipped.empty++;
      return;
    }

    rows.push({
      key,
      existingId: byKey.get(key) || null,
      is_number,
      revision_year,
      reaffirmation_year: yearOrNull(cellText(row.getCell(3))),
      amendment_number: amendment(cellText(row.getCell(4))),
      aspect_of_is,
      product_manual_number: pm || null,
      is_code_title: title,
      testing_charges: money(cellText(row.getCell(8))),
      mmf_large_scale: money(cellText(row.getCell(9))),
      mmf_medium_scale: money(cellText(row.getCell(10))),
      mmf_small_scale: money(cellText(row.getCell(11))),
      mmf_micro_scale: money(cellText(row.getCell(12))),
      unit_of_is,
      // Excel: rate then quantity; DB: quantity then rate
      slab_1_rate: money(cellText(row.getCell(14))),
      slab_1_quantity: qty(cellText(row.getCell(15)), "All Quantities"),
      slab_2_rate: money(cellText(row.getCell(16))),
      slab_2_quantity: qty(cellText(row.getCell(17)), "N/A"),
      slab_3_rate: money(cellText(row.getCell(18))),
      slab_3_quantity: qty(cellText(row.getCell(19)), "N/A"),
      created_by: createdBy,
    });
  });

  const toInsert = rows.filter((r) => !r.existingId);
  const toUpdate = rows.filter((r) => r.existingId);
  console.log("prepared", rows.length, "insert", toInsert.length, "update", toUpdate.length);
  console.log("skipped", skipped);
  console.log("units", unitSet.size, "aspects", [...aspectSet]);

  await pg.query("begin");
  try {
    await ensureDropdown(pg, "is_code_master.aspect_of_is", aspectSet);
    await ensureDropdown(pg, "is_code_master.unit", unitSet);

    let updated = 0;
    for (const r of toUpdate) {
      await pg.query(
        `update is_codes set
          reaffirmation_year = $1,
          amendment_number = $2,
          aspect_of_is = $3,
          product_manual_number = $4,
          is_code_title = $5,
          testing_charges = $6,
          unit_of_is = $7,
          mmf_large_scale = $8,
          mmf_medium_scale = $9,
          mmf_small_scale = $10,
          mmf_micro_scale = $11,
          slab_1_quantity = $12,
          slab_1_rate = $13,
          slab_2_quantity = $14,
          slab_2_rate = $15,
          slab_3_quantity = $16,
          slab_3_rate = $17,
          updated_at = now()
         where id = $18`,
        [
          r.reaffirmation_year,
          r.amendment_number,
          r.aspect_of_is,
          r.product_manual_number,
          r.is_code_title,
          r.testing_charges,
          r.unit_of_is,
          r.mmf_large_scale,
          r.mmf_medium_scale,
          r.mmf_small_scale,
          r.mmf_micro_scale,
          r.slab_1_quantity,
          r.slab_1_rate,
          r.slab_2_quantity,
          r.slab_2_rate,
          r.slab_3_quantity,
          r.slab_3_rate,
          r.existingId,
        ],
      );
      updated++;
    }

    let inserted = 0;
    for (let i = 0; i < toInsert.length; i += BATCH) {
      const chunk = toInsert.slice(i, i + BATCH);
      const cols = [
        "is_number",
        "revision_year",
        "reaffirmation_year",
        "amendment_number",
        "aspect_of_is",
        "product_manual_number",
        "is_code_title",
        "testing_charges",
        "unit_of_is",
        "mmf_large_scale",
        "mmf_medium_scale",
        "mmf_small_scale",
        "mmf_micro_scale",
        "slab_1_quantity",
        "slab_1_rate",
        "slab_2_quantity",
        "slab_2_rate",
        "slab_3_quantity",
        "slab_3_rate",
        "created_by",
        "updated_at",
      ];
      const values = [];
      const placeholders = chunk.map((row, ri) => {
        const base = ri * cols.length;
        for (const c of cols) {
          if (c === "updated_at") values.push(new Date().toISOString());
          else values.push(row[c]);
        }
        return `(${cols.map((_, ci) => `$${base + ci + 1}`).join(",")})`;
      });
      await pg.query(
        `insert into is_codes (${cols.join(",")}) values ${placeholders.join(",")}`,
        values,
      );
      inserted += chunk.length;
      if (inserted % 500 === 0 || inserted === toInsert.length) {
        console.log(`inserted ${inserted}/${toInsert.length}`);
      }
    }

    await pg.query("commit");
    const finalCount = await pg.query(`select count(*)::int as n from is_codes`);
    console.log(
      "DONE inserted",
      inserted,
      "updated",
      updated,
      "total is_codes",
      finalCount.rows[0].n,
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
