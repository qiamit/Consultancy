import "server-only";

import { ImapFlow, type MessageStructureObject } from "imapflow";
import { simpleParser } from "mailparser";
import { htmlToPlainText } from "@backend/modules/email/format-body";
import type { EmailAccountRow, EmailMessageRow } from "@backend/shared/types/email";

type ParsedMessage = Omit<EmailMessageRow, "id" | "account_id" | "synced_at">;

function addrList(
  list: { name?: string | null; address?: string | null }[] | undefined,
) {
  return (list ?? [])
    .filter((a) => a.address)
    .map((a) => ({ name: a.name ?? undefined, address: a.address! }));
}

function normalizeAppPassword(pass: string | null | undefined): string {
  return (pass ?? "").replace(/\s+/g, "").trim();
}

function listAttachments(struct?: MessageStructureObject): {
  filename: string;
  contentType?: string;
  size?: number;
  index: number;
}[] {
  if (!struct) return [];
  const items: { filename: string; contentType?: string; size?: number; index: number }[] = [];
  let counter = 0;

  function walk(node: MessageStructureObject) {
    if (node.disposition?.toLowerCase() === "attachment") {
      items.push({
        filename:
          node.dispositionParameters?.filename ??
          node.parameters?.name ??
          `attachment-${counter + 1}`,
        contentType: node.type,
        size: node.size,
        index: counter++,
      });
    }
    for (const child of node.childNodes ?? []) {
      walk(child);
    }
  }

  walk(struct);
  return items;
}

export function formatImapError(error: unknown): Error {
  if (error instanceof Error) {
    const code = (error as NodeJS.ErrnoException).code;
    const msg = error.message.toLowerCase();
    const response = String(
      (error as { responseText?: string; authenticationFailed?: boolean }).responseText ?? "",
    ).toLowerCase();

    if (
      msg.includes("invalid credentials") ||
      response.includes("invalid credentials") ||
      msg.includes("authentication failed") ||
      response.includes("authenticationfailed") ||
      (error as { authenticationFailed?: boolean }).authenticationFailed
    ) {
      return new Error(
        "IMAP login failed — invalid app password. For Gmail: Google Account → Security → App passwords → generate a new 16-character password, paste it in Edit account, and save.",
      );
    }
    if (code === "ETIMEOUT" || msg.includes("timeout")) {
      return new Error(
        "IMAP connection timed out. Check your internet, app password, and that IMAP is enabled for this mailbox.",
      );
    }
    if (
      msg.includes("auth") ||
      msg.includes("invalid credentials") ||
      msg.includes("authentication failed")
    ) {
      return new Error(
        "IMAP authentication failed. Use a valid app password (not your regular login password).",
      );
    }
    if (msg.includes("enotfound") || msg.includes("getaddrinfo")) {
      return new Error("Could not reach the IMAP server. Check the provider and network.");
    }
    return error;
  }
  return new Error("IMAP operation failed.");
}

async function closeClient(client: ImapFlow): Promise<void> {
  try {
    if (client.authenticated) {
      await Promise.race([
        client.logout(),
        new Promise<void>((_, reject) => {
          setTimeout(() => reject(new Error("logout timeout")), 5_000);
        }),
      ]);
      return;
    }
  } catch {
    /* fall through to force close */
  }
  try {
    client.close();
  } catch {
    /* ignore */
  }
}

async function withImapClient<T>(
  account: EmailAccountRow,
  fn: (client: ImapFlow) => Promise<T>,
  opts?: { socketTimeout?: number },
): Promise<T> {
  const client = buildClient(account, opts);
  const errors: Error[] = [];
  client.on("error", (err: Error) => {
    errors.push(err);
  });

  try {
    await client.connect();
    const result = await fn(client);
    if (errors.length > 0) throw errors[errors.length - 1];
    return result;
  } catch (error) {
    throw errors.length > 0 ? errors[errors.length - 1] : error;
  } finally {
    await closeClient(client);
  }
}

export async function testImapConnection(account: EmailAccountRow): Promise<void> {
  await withImapClient(account, async (client) => {
    await client.mailboxOpen("INBOX", { readOnly: true });
  });
}

const SYNC_BATCH_SIZE = 100;

async function parseFetchedMessage(
  msg: {
    uid: number;
    source?: Buffer;
    envelope?: {
      messageId?: string;
      subject?: string;
      from?: { name?: string | null; address?: string | null }[];
      to?: { name?: string | null; address?: string | null }[];
      cc?: { name?: string | null; address?: string | null }[];
      bcc?: { name?: string | null; address?: string | null }[];
      date?: Date;
    };
    flags?: Set<string>;
    bodyStructure?: MessageStructureObject;
  },
  folder: string,
): Promise<ParsedMessage> {
  let snippet = "";
  let inReplyTo: string | null = null;
  let replyReferences: string | null = null;

  if (msg.source) {
    try {
      const parsed = await simpleParser(msg.source);
      snippet = (parsed.text ?? htmlToPlainText(typeof parsed.html === "string" ? parsed.html : ""))
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 160);
      inReplyTo = parsed.inReplyTo ?? null;
      replyReferences = Array.isArray(parsed.references)
        ? parsed.references.join(" ")
        : parsed.references ?? null;
    } catch {
      snippet = "";
    }
  }

  if (!snippet && msg.envelope?.subject) {
    snippet = msg.envelope.subject.slice(0, 160);
  }

  const attachments = listAttachments(msg.bodyStructure);

  return {
    uid: msg.uid,
    folder,
    message_id: msg.envelope?.messageId ?? null,
    subject: msg.envelope?.subject ?? "(No subject)",
    from_address: msg.envelope?.from?.[0]?.address ?? null,
    from_name: msg.envelope?.from?.[0]?.name ?? null,
    to_addresses: addrList(msg.envelope?.to),
    cc_addresses: addrList(msg.envelope?.cc),
    bcc_addresses: addrList(msg.envelope?.bcc),
    body_text: null,
    body_html: null,
    snippet,
    email_date: (msg.envelope?.date ?? new Date()).toISOString(),
    is_read: msg.flags?.has("\\Seen") ?? false,
    is_starred: msg.flags?.has("\\Flagged") ?? false,
    is_flagged: msg.flags?.has("\\Flagged") ?? false,
    has_attachments: attachments.length > 0,
    attachments,
    in_reply_to: inReplyTo,
    reply_references: replyReferences,
  };
}

export async function syncFolderMessages(
  account: EmailAccountRow,
  folder: string,
  limit = 0,
): Promise<ParsedMessage[]> {
  return withImapClient(
    account,
    async (client) => {
      const lock = await client.getMailboxLock(folder);
      try {
        const mailbox = client.mailbox;
        const total = mailbox && typeof mailbox !== "boolean" ? mailbox.exists : 0;
        if (total === 0) return [];

        const cap = limit > 0 ? Math.min(limit, total) : total;
        const results: ParsedMessage[] = [];
        let end = total;
        let fetched = 0;

        while (fetched < cap) {
          const batchSize = Math.min(SYNC_BATCH_SIZE, cap - fetched);
          const start = end - batchSize + 1;
          const range = `${start}:${end}`;

          for await (const msg of client.fetch(range, {
            uid: true,
            flags: true,
            envelope: true,
            bodyStructure: true,
            source: { start: 0, maxLength: 16384 },
          })) {
            results.push(await parseFetchedMessage(msg, folder));
          }

          fetched += batchSize;
          end = start - 1;
          if (start <= 1) break;
        }

        return results.sort(
          (a, b) =>
            new Date(b.email_date ?? 0).getTime() -
            new Date(a.email_date ?? 0).getTime(),
        );
      } finally {
        lock.release();
      }
    },
    { socketTimeout: 120_000 },
  );
}

export async function fetchMessageBody(
  account: EmailAccountRow,
  folder: string,
  uid: number,
): Promise<{
  body_text: string | null;
  body_html: string | null;
  attachments: { filename: string; contentType?: string; size?: number; index: number }[];
}> {
  return withImapClient(
    account,
    async (client) => {
      const lock = await client.getMailboxLock(folder);
      try {
        const msg = await client.fetchOne(String(uid), { source: true }, { uid: true });
        if (!msg || !msg.source) {
          return { body_text: null, body_html: null, attachments: [] };
        }
        const parsed = await simpleParser(msg.source);
        const bodyHtml = typeof parsed.html === "string" ? parsed.html : null;
        const attachments = (parsed.attachments ?? []).map((a, index) => ({
          filename: a.filename ?? `attachment-${index + 1}`,
          contentType: a.contentType,
          size: a.size,
          index,
        }));
        return {
          body_text: parsed.text ?? (bodyHtml ? htmlToPlainText(bodyHtml) : null),
          body_html: bodyHtml,
          attachments,
        };
      } finally {
        lock.release();
      }
    },
    { socketTimeout: 90_000 },
  );
}

export async function fetchMessageAttachment(
  account: EmailAccountRow,
  folder: string,
  uid: number,
  index: number,
): Promise<{ filename: string; contentType: string; content: Buffer } | null> {
  return withImapClient(
    account,
    async (client) => {
      const lock = await client.getMailboxLock(folder);
      try {
        const msg = await client.fetchOne(String(uid), { source: true }, { uid: true });
        if (!msg || !("source" in msg) || !msg.source) return null;
        const parsed = await simpleParser(msg.source);
        const attachment = parsed.attachments?.[index];
        if (!attachment?.content) return null;
        return {
          filename: attachment.filename ?? `attachment-${index + 1}`,
          contentType: attachment.contentType ?? "application/octet-stream",
          content: attachment.content,
        };
      } finally {
        lock.release();
      }
    },
    { socketTimeout: 90_000 },
  );
}

export async function setMessageFlags(
  account: EmailAccountRow,
  folder: string,
  uid: number,
  flags: { read?: boolean; starred?: boolean },
): Promise<void> {
  await withImapClient(account, async (client) => {
    const lock = await client.getMailboxLock(folder);
    try {
      if (flags.read === true) await client.messageFlagsAdd({ uid }, ["\\Seen"], { uid: true });
      if (flags.read === false) await client.messageFlagsRemove({ uid }, ["\\Seen"], { uid: true });
      if (flags.starred === true) await client.messageFlagsAdd({ uid }, ["\\Flagged"], { uid: true });
      if (flags.starred === false) await client.messageFlagsRemove({ uid }, ["\\Flagged"], { uid: true });
    } finally {
      lock.release();
    }
  });
}

export async function moveMessageToFolder(
  account: EmailAccountRow,
  folder: string,
  uid: number,
  targetFolder: string,
): Promise<void> {
  await withImapClient(account, async (client) => {
    const lock = await client.getMailboxLock(folder);
    try {
      await client.messageMove({ uid }, targetFolder, { uid: true });
    } finally {
      lock.release();
    }
  });
}

export async function moveMessageToTrash(
  account: EmailAccountRow,
  folder: string,
  uid: number,
  trashFolder: string,
): Promise<void> {
  await moveMessageToFolder(account, folder, uid, trashFolder);
}

function buildClient(account: EmailAccountRow, opts?: { socketTimeout?: number }) {
  if (!account.imap_host) throw new Error("IMAP host is not configured.");
  const pass = normalizeAppPassword(account.password);
  if (!pass && account.auth_type === "imap") {
    throw new Error("Email password or app password is required.");
  }

  return new ImapFlow({
    host: account.imap_host,
    port: account.imap_port,
    secure: account.imap_secure,
    auth: {
      user: account.username || account.email_address,
      pass,
    },
    logger: false,
    connectionTimeout: 30_000,
    greetingTimeout: 30_000,
    socketTimeout: opts?.socketTimeout ?? 30_000,
  });
}
