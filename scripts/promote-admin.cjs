const { Client } = require("pg");

(async () => {
  const c = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: false,
  });
  await c.connect();
  const cols = await c.query(`
    select column_name, data_type
    from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles'
    order by ordinal_position
  `);
  console.log("columns", cols.rows);
  const p = await c.query("select * from public.profiles");
  console.log("rows", p.rows);
  await c.query(
    `update public.profiles set role = 'admin' where id = $1`,
    ["bb09cfa4-e2ff-47d5-9581-df2d973ff8fe"]
  );
  const p2 = await c.query(`select * from public.profiles where id = $1`, [
    "bb09cfa4-e2ff-47d5-9581-df2d973ff8fe",
  ]);
  console.log("updated", p2.rows);
  await c.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
