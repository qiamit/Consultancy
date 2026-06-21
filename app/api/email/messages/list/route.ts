import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const accountId = searchParams.get("accountId");
  const folder = searchParams.get("folder") ?? "INBOX";
  const starred = searchParams.get("starred") === "1";

  if (!accountId) {
    return NextResponse.json({ error: "accountId required" }, { status: 400 });
  }

  const { data: account } = await supabase
    .from("email_accounts")
    .select("id")
    .eq("id", accountId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  let query = supabase
    .from("email_messages")
    .select("*")
    .eq("account_id", accountId)
    .order("email_date", { ascending: false });

  if (starred) {
    query = query.eq("is_starred", true);
  } else {
    query = query.eq("folder", folder);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ messages: data ?? [] });
}
