import { NextResponse } from "next/server";
import { createClient } from "@backend/db/client/server";
import { resolveImapFolder } from "@backend/modules/email/providers";
import { providerMismatchMessage } from "@backend/modules/email/domain-provider-hints";
import { syncFolderMessages, formatImapError } from "@backend/modules/email/imap-client";
import type { EmailAccountRow, EmailFolderKey, EmailMessageRow } from "@backend/shared/types/email";

export const runtime = "nodejs";
export const maxDuration = 300;

const ALL_SYNC_FOLDERS: EmailFolderKey[] = [
  "inbox",
  "sent",
  "drafts",
  "archive",
  "junk",
  "trash",
];

type ParsedMessage = Omit<EmailMessageRow, "id" | "account_id" | "synced_at">;

function toUpsertRow(accountId: string, imapFolder: string, m: ParsedMessage) {
  return {
    account_id: accountId,
    uid: m.uid,
    folder: imapFolder,
    message_id: m.message_id,
    subject: m.subject,
    from_address: m.from_address,
    from_name: m.from_name,
    to_addresses: m.to_addresses,
    cc_addresses: m.cc_addresses,
    bcc_addresses: m.bcc_addresses,
    body_text: m.body_text,
    body_html: m.body_html,
    snippet: m.snippet,
    email_date: m.email_date,
    is_read: m.is_read,
    is_starred: m.is_starred,
    is_flagged: m.is_flagged,
    has_attachments: m.has_attachments,
    attachments: m.attachments,
    in_reply_to: m.in_reply_to,
    reply_references: m.reply_references,
    synced_at: new Date().toISOString(),
  };
}

async function upsertFolderMessages(
  supabase: Awaited<ReturnType<typeof createClient>>,
  accountId: string,
  imapFolder: string,
  messages: ParsedMessage[],
) {
  if (messages.length === 0) return;

  const upserts = messages.map((m) => toUpsertRow(accountId, imapFolder, m));
  const { error: upErr } = await supabase.from("email_messages").upsert(upserts, {
    onConflict: "account_id,folder,uid",
  });
  if (upErr) throw new Error(upErr.message);

  const syncedUids = new Set(messages.map((m) => m.uid));
  const { data: existing } = await supabase
    .from("email_messages")
    .select("uid")
    .eq("account_id", accountId)
    .eq("folder", imapFolder);

  const staleUids = (existing ?? [])
    .filter((row) => !syncedUids.has(row.uid))
    .map((row) => row.uid);

  if (staleUids.length > 0) {
    await supabase
      .from("email_messages")
      .delete()
      .eq("account_id", accountId)
      .eq("folder", imapFolder)
      .in("uid", staleUids);
  }
}

async function syncOneFolder(
  supabase: Awaited<ReturnType<typeof createClient>>,
  row: EmailAccountRow,
  folderKey: EmailFolderKey,
) {
  const imapFolder =
    folderKey === "starred"
      ? resolveImapFolder(row.provider, "inbox")
      : resolveImapFolder(row.provider, folderKey);

  const messages = await syncFolderMessages(row, imapFolder, 0);

  if (folderKey !== "starred") {
    await upsertFolderMessages(supabase, row.id, imapFolder, messages);
  }

  return { count: messages.length, folder: imapFolder, folderKey };
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as {
    accountId?: string;
    folderKey?: EmailFolderKey;
    allFolders?: boolean;
  };

  if (!body.accountId) {
    return NextResponse.json({ error: "accountId required" }, { status: 400 });
  }

  const { data: account, error: accErr } = await supabase
    .from("email_accounts")
    .select("*")
    .eq("id", body.accountId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (accErr || !account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  const row = account as EmailAccountRow;
  const providerHint = providerMismatchMessage(row.email_address, row.provider);
  if (providerHint) {
    return NextResponse.json({ error: providerHint }, { status: 400 });
  }

  try {
    const foldersToSync = body.allFolders
      ? ALL_SYNC_FOLDERS
      : body.folderKey
        ? [body.folderKey]
        : ["inbox" as EmailFolderKey];

    let totalCount = 0;
    const synced: { folder: string; count: number }[] = [];

    for (const folderKey of foldersToSync) {
      const result = await syncOneFolder(supabase, row, folderKey);
      totalCount += result.count;
      synced.push({ folder: result.folder, count: result.count });
    }

    await supabase
      .from("email_accounts")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("id", row.id);

    return NextResponse.json({
      ok: true,
      count: totalCount,
      synced,
      allFolders: Boolean(body.allFolders),
    });
  } catch (e) {
    return NextResponse.json(
      { error: formatImapError(e).message },
      { status: 500 },
    );
  }
}
