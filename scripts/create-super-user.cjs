const { Client } = require("pg");

async function createUserViaAuth() {
  const service = process.env.SERVICE_ROLE_KEY;
  const base = process.env.SUPABASE_URL;
  const res = await fetch(`${base}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      apikey: service,
      Authorization: `Bearer ${service}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: "info@qengineering.in",
      password: process.env.SUPER_USER_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: "Super Admin" },
    }),
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  console.log("auth_status", res.status);
  console.log(JSON.stringify(data, null, 2));
  return data;
}

async function ensureAdminProfile(userId, email) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: false,
  });
  await client.connect();
  await client.query(
    `insert into public.profiles (id, email, full_name, role)
     values ($1, $2, 'Super Admin', 'admin')
     on conflict (id) do update
       set role = 'admin',
           email = excluded.email,
           full_name = coalesce(public.profiles.full_name, excluded.full_name)`,
    [userId, email]
  );
  const p = await client.query(
    "select id, email, role from public.profiles where email = $1",
    [email]
  );
  console.log("profile", p.rows);
  await client.end();
}

(async () => {
  const data = await createUserViaAuth();
  const id = data?.id || data?.user?.id;
  const email = data?.email || data?.user?.email || "info@qengineering.in";
  if (!id) {
    // maybe already exists — look up
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: false,
    });
    await client.connect();
    const u = await client.query(
      "select id, email from auth.users where email = $1",
      ["info@qengineering.in"]
    );
    console.log("lookup", u.rows);
    await client.end();
    if (!u.rows[0]) process.exit(1);
    await ensureAdminProfile(u.rows[0].id, u.rows[0].email);
    return;
  }
  await ensureAdminProfile(id, email);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
