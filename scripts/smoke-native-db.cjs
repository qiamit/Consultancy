process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://supabase_admin:rh047f4z46nj6cjzgsutpk6cat02o3x96uhnj3exwb7k8m0b8pomktdw9nnumu0o@yamabiko.proxy.rlwy.net:55278/postgres";
process.env.SESSION_SECRET =
  process.env.SESSION_SECRET ||
  "qe-railway-session-secret-change-in-prod-32chars-min-ok";

async function main() {
  // Dynamic import of compiled TS won't work; test via pg + bcrypt + query builder requires tsx
  const { Client } = require("pg");
  const bcrypt = require("bcryptjs");
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();

  const user = await c.query(
    "select id, email, password_hash from public.app_users where email = $1",
    ["info@qengineering.in"],
  );
  console.log("user_found", Boolean(user.rows[0]));
  const ok = await bcrypt.compare("Amit@1988", user.rows[0].password_hash);
  console.log("password_ok", ok);

  const clients = await c.query(
    "select id, company_name from public.clients order by created_at desc nulls last limit 3",
  );
  console.log(
    "clients_sample",
    clients.rows.map((r) => r.company_name),
  );

  const embed = await c.query(`
    select b.id, b.title, c.company_name
    from public.bis_projects b
    left join public.clients c on c.id = b.client_id
    limit 2
  `);
  console.log("join_sample", embed.rows);

  await c.end();
  console.log("db_ok");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
