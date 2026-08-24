import { NextResponse } from "next/server";
import { createClient } from "@backend/db/supabase/server";
import { buildConversationThread, normalizeEmailSubject } from "@backend/modules/email/threading";
import type { EmailMessageRow } from "@backend/shared/types/email";

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

  const { data: anchor } = await supabase
    .from("email_messages")
    .select("*")
    .eq("id", messageId)
    .maybeSingle();

  if (!anchor) return NextResponse.json({ error: "Message not found" }, { status: 404 });

  const { data: account } = await supabase
    .from("email_accounts")
    .select("id")
    .eq("id", anchor.account_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!account) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const normalized = normalizeEmailSubject(anchor.subject);
  if (!normalized) {
    return NextResponse.json({ messages: [anchor] as EmailMessageRow[] });
  }

  const { data: pool, error } = await supabase
    .from("email_messages")
    .select("*")
    .eq("account_id", anchor.account_id)
    .order("email_date", { ascending: true })
    .limit(5000);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const messages = buildConversationThread(
    anchor as EmailMessageRow,
    (pool ?? []) as EmailMessageRow[],
  );

  return NextResponse.json({ messages });
}
