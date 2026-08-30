const { Client } = require("pg");

async function main() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  const pg = new Client({
    connectionString: url,
    ssl: url.includes("railway") ? { rejectUnauthorized: false } : false,
  });
  await pg.connect();

  const stuck = await pg.query(`
    select pid, state, left(query, 80) as query
    from pg_stat_activity
    where datname = current_database()
      and pid <> pg_backend_pid()
      and (
        state = 'idle in transaction'
        or (state = 'active' and query ilike '%clients%')
      )
  `);

  for (const row of stuck.rows) {
    console.log("terminating", row.pid, row.state, row.query);
    await pg.query("select pg_terminate_backend($1)", [row.pid]);
  }

  console.log("terminated", stuck.rows.length, "sessions");
  await pg.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
