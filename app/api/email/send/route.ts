import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/smtp-client";
import type { EmailAccountRow } from "@/lib/types/email";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as {
    accountId?: string;
    to?: string[];
    cc?: string[];
    bcc?: string[];
    subject?: string;
    text?: string;
    html?: string;
    inReplyTo?: string;
    references?: string;
    attachments?: { filename: string; contentType: string; content: string }[];
  };

  if (!body.accountId || !body.to?.length || !body.subject || !body.text) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const { data: account } = await supabase
    .from("email_accounts")
    .select("*")
    .eq("id", body.accountId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  try {
    const result = await sendEmail(account as EmailAccountRow, {
      to: body.to,
      cc: body.cc,
      bcc: body.bcc,
      subject: body.subject,
      text: body.text,
      html: body.html,
      inReplyTo: body.inReplyTo,
      references: body.references,
      attachments: body.attachments,
    });
    return NextResponse.json({ ok: true, messageId: result.messageId });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Send failed" },
      { status: 500 },
    );
  }
}
