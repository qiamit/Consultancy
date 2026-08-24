import { readFileSync } from "fs";
import { ImapFlow } from "imapflow";

function loadEnv() {
  const text = readFileSync(".env.local", "utf8");
  for (const line of text.split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key || key.includes("your_")) {
  console.error("Need SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const { createClient } = await import("@supabase/supabase-js");
const sb = createClient(url, key);
const { data: account, error } = await sb
  .from("email_accounts")
  .select("*")
  .limit(1)
  .maybeSingle();

if (error || !account) {
  console.error("No account:", error?.message);
  process.exit(1);
}

console.log("Testing IMAP for", account.email_address, "host", account.imap_host);
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
  console.error("FAILED after", Date.now(), "ms:", e.code, e.message);
  try {
    client.close();
  } catch {}
  process.exit(1);
}
