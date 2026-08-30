/**
 * Smoke-test IMAP for the first email_accounts row.
 * Requires DATABASE_URL in .env.local (or environment).
 *
 * Usage: node Backend/scripts/test-imap.mjs
 */
import { readFileSync, existsSync } from "fs";
import { ImapFlow } from "imapflow";
import pg from "pg";

function loadEnv() {
  for (const path of [".env.local", "Frontend/.env.local"]) {
    if (!existsSync(path)) continue;
    const text = readFileSync(path, "utf8");
    for (const line of text.split("\n")) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m && process.env[m[1].trim()] === undefined) {
        process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
      }
    }
  }
}

loadEnv();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("Need DATABASE_URL in .env.local");
  process.exit(1);
}

const { Client } = pg;
const db = new Client({ connectionString: databaseUrl });
await db.connect();

const { rows } = await db.query(
  `select * from public.email_accounts order by created_at nulls last limit 1`,
);
await db.end();

const account = rows[0];
if (!account) {
  console.error("No email_accounts row found");
  process.exit(1);
}

console.log(
  "Testing IMAP for",
  account.email_address,
  "host",
  account.imap_host,
);
console.log("Password length:", account.password?.length ?? 0);

const client = new ImapFlow({
  host: account.imap_host,
  port: account.imap_port,
  secure: account.imap_secure,
  auth: {
    user: account.username || account.email_address,
    pass: account.password ?? "",
  },
  logger: false,
  connectionTimeout: 30_000,
  greetingTimeout: 30_000,
  socketTimeout: 60_000,
  emitLogs: false,
});

client.on("error", (err) => {
  console.error("CLIENT ERROR EVENT:", err.code, err.message);
});

try {
  const t0 = Date.now();
  await client.connect();
  console.log("Connected in", Date.now() - t0, "ms");
  const lock = await client.getMailboxLock("INBOX");
  try {
    const total =
      client.mailbox && typeof client.mailbox !== "boolean"
        ? client.mailbox.exists
        : 0;
    console.log("INBOX messages:", total);
  } finally {
    lock.release();
  }
  await client.logout();
  console.log("SUCCESS");
} catch (e) {
  console.error("FAILED:", e.code, e.message);
  try {
    client.close();
  } catch {
    /* ignore */
  }
  process.exit(1);
}
