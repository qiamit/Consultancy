import { NextResponse } from "next/server";
import { createClient } from "@backend/db/supabase/server";
import { fetchMessageBody, formatImapError } from "@backend/modules/email/imap-client";
import type { EmailAccountRow } from "@backend/shared/types/email";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const messageId = new URL(req.url).searchParams.get("id");
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

  const cachedHtml = typeof msg.body_html === "string" ? msg.body_html.trim() : "";
  const hasUsableBody = Boolean(msg.body_text?.trim() || cachedHtml.length > 100);

  if (hasUsableBody) {
    return NextResponse.json({
      body_text: msg.body_text,
      body_html: msg.body_html,
      attachments: msg.attachments ?? [],
    });
  }

  try {
    const body = await fetchMessageBody(account as EmailAccountRow, msg.folder, msg.uid);

    await supabase
      .from("email_messages")
      .update({
        body_text: body.body_text,
        body_html: body.body_html,
        attachments: body.attachments,
        has_attachments: body.attachments.length > 0,
      })
      .eq("id", messageId);

    return NextResponse.json(body);
  } catch (e) {
    return NextResponse.json(
      { error: formatImapError(e).message },
      { status: 500 },
    );
  }
}
