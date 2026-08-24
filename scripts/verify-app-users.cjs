const { Client } = require("pg");
const bcrypt = require("bcryptjs");

async function main() {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  const u = await c.query(
    "select id, email, left(password_hash,10) as pref, length(password_hash) as len from public.app_users",
  );
  console.log("app_users", u.rows);
  const fk = await c.query(`
    select tc.table_name, tc.constraint_name, ccu.table_schema as ref_schema, ccu.table_name as ref_table
    from information_schema.table_constraints tc
    join information_schema.constraint_column_usage ccu
      on ccu.constraint_name = tc.constraint_name
     and ccu.table_schema = tc.table_schema
    where tc.constraint_type = 'FOREIGN KEY'
      and tc.table_schema = 'public'
      and tc.table_name = 'profiles'
  `);
  console.log("profiles fks", fk.rows);
  if (process.env.TEST_PASSWORD) {
    const row = u.rows[0];
    const full = await c.query(
      "select password_hash from public.app_users where id = $1",
      [row.id],
    );
    const ok = await bcrypt.compare(
      process.env.TEST_PASSWORD,
      full.rows[0].password_hash,
    );
    console.log("password match:", ok);
  }
  await c.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
