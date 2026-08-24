import { NextResponse } from "next/server";
import { createClient } from "@backend/db/supabase/server";
import { fetchMessageAttachment, formatImapError } from "@backend/modules/email/imap-client";
import type { EmailAccountRow } from "@backend/shared/types/email";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const messageId = searchParams.get("messageId");
  const indexRaw = searchParams.get("index");
  if (!messageId || indexRaw === null) {
    return NextResponse.json({ error: "messageId and index required" }, { status: 400 });
  }
  const index = Number(indexRaw);
  if (!Number.isFinite(index) || index < 0) {
    return NextResponse.json({ error: "Invalid attachment index" }, { status: 400 });
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

  try {
    const file = await fetchMessageAttachment(
      account as EmailAccountRow,
      msg.folder,
      msg.uid,
      index,
    );
    if (!file) {
      return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
    }

    return new NextResponse(new Uint8Array(file.content), {
      headers: {
        "Content-Type": file.contentType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(file.filename)}"`,
        "Content-Length": String(file.content.length),
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: formatImapError(e).message },
      { status: 500 },
    );
  }
}
