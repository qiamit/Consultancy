const { Client } = require("pg");

async function main() {
  const c = new Client({
    connectionString: process.env.DATABASE_URL,
  });
  await c.connect();
  const cols = await c.query(`
    select column_name, data_type, is_nullable
    from information_schema.columns
    where table_schema = 'auth' and table_name = 'users'
    order by ordinal_position
  `);
  console.log("columns:", JSON.stringify(cols.rows, null, 2));
  const users = await c.query(`
    select id, email,
      encrypted_password is not null as has_pw,
      length(encrypted_password) as pw_len,
      left(encrypted_password, 7) as pw_prefix
    from auth.users
    limit 10
  `);
  console.log("users:", users.rows);
  const fks = await c.query(`
    select tc.table_schema, tc.table_name, kcu.column_name, tc.constraint_name
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on tc.constraint_name = kcu.constraint_name
     and tc.table_schema = kcu.table_schema
    join information_schema.constraint_column_usage ccu
      on ccu.constraint_name = tc.constraint_name
    where tc.constraint_type = 'FOREIGN KEY'
      and ccu.table_schema = 'auth'
      and ccu.table_name = 'users'
  `);
  console.log("fks to auth.users:", fks.rows);
  await c.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
