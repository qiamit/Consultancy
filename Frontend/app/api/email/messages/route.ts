import { NextResponse } from "next/server";
import { createClient } from "@backend/db/supabase/server";
import { resolveImapFolder } from "@backend/modules/email/providers";
import { moveMessageToFolder, moveMessageToTrash, setMessageFlags } from "@backend/modules/email/imap-client";
import type { EmailAccountRow, EmailFolderKey } from "@backend/shared/types/email";

export async function PATCH(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as {
    messageId?: string;
    isRead?: boolean;
    isStarred?: boolean;
    moveToFolderKey?: EmailFolderKey;
  };

  if (!body.messageId) {
    return NextResponse.json({ error: "messageId required" }, { status: 400 });
  }

  const { data: msg } = await supabase
    .from("email_messages")
    .select("*")
    .eq("id", body.messageId)
    .maybeSingle();

  if (!msg) return NextResponse.json({ error: "Message not found" }, { status: 404 });

  const { data: account } = await supabase
    .from("email_accounts")
    .select("*")
    .eq("id", msg.account_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!account) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const row = account as EmailAccountRow;

  if (body.moveToFolderKey) {
    const targetFolder = resolveImapFolder(row.provider, body.moveToFolderKey);
    if (targetFolder !== msg.folder) {
      try {
        await moveMessageToFolder(row, msg.folder, msg.uid, targetFolder);
      } catch {
        /* continue to update cache */
      }
    }
    await supabase.from("email_messages").delete().eq("id", body.messageId);
    return NextResponse.json({ ok: true });
  }

  const updates: Record<string, boolean> = {};
  if (body.isRead !== undefined) updates.is_read = body.isRead;
  if (body.isStarred !== undefined) {
    updates.is_starred = body.isStarred;
    updates.is_flagged = body.isStarred;
  }

  await supabase.from("email_messages").update(updates).eq("id", body.messageId);

  try {
    await setMessageFlags(account as EmailAccountRow, msg.folder, msg.uid, {
      read: body.isRead,
      starred: body.isStarred,
    });
  } catch {
    /* cache updated even if IMAP flags fail */
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const messageId = searchParams.get("id");
  if (!messageId) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const { data: msg } = await supabase
    .from("email_messages")
    .select("*")
    .eq("id", messageId)
    .maybeSingle();

  if (!msg) return NextResponse.json({ error: "Message not found" }, { status: 404 });

  const { data: account } = await supabase
    .from("email_accounts")
    .select("*")
    .eq("id", msg.account_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!account) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const row = account as EmailAccountRow;
  const trashFolder = resolveImapFolder(row.provider, "trash");

  try {
    await moveMessageToTrash(row, msg.folder, msg.uid, trashFolder);
  } catch {
    /* continue to remove from cache */
  }

  await supabase.from("email_messages").delete().eq("id", messageId);
  return NextResponse.json({ ok: true });
}
