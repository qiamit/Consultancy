const { Client } = require("pg");

async function main() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  const pg = new Client({
    connectionString: url,
    ssl: url.includes("railway") ? { rejectUnauthorized: false } : false,
  });
  await pg.connect();
  const r = await pg.query(`
    select pid, state, wait_event_type, wait_event,
           left(query, 120) as query,
           now() - xact_start as xact_age,
           now() - query_start as query_age
    from pg_stat_activity
    where datname = current_database()
      and pid <> pg_backend_pid()
    order by xact_start nulls last
  `);
  console.log(JSON.stringify(r.rows, null, 2));
  await pg.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
