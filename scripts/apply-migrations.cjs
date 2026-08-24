const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

async function main() {
  const dir = path.join("Backend", "db", "migrations");
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: false,
  });
  await client.connect();
  await client.query(`
    create table if not exists public._railway_migrations (
      id text primary key,
      applied_at timestamptz not null default now()
    )
  `);
  const applied = new Set(
    (await client.query("select id from public._railway_migrations")).rows.map(
      (r) => r.id
    )
  );
  let ok = 0;
  let skip = 0;
  let fail = 0;
  for (const file of files) {
    if (applied.has(file)) {
      skip++;
      continue;
    }
    const sql = fs.readFileSync(path.join(dir, file), "utf8");
    try {
      await client.query("begin");
      await client.query(sql);
      await client.query(
        "insert into public._railway_migrations(id) values ($1)",
        [file]
      );
      await client.query("commit");
      ok++;
      console.log("OK", file);
    } catch (e) {
      await client.query("rollback");
      fail++;
      console.error("FAIL", file, String(e.message).split("\n")[0]);
    }
  }
  console.log(JSON.stringify({ ok, skip, fail, total: files.length }));
  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
