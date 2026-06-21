import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateEmailDraft } from "@/lib/email/ai-compose";
import type { AiDraftRequest } from "@/lib/email/ai-compose";
import type { EmailAccountRow } from "@/lib/types/email";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as {
    accountId?: string;
    draft?: AiDraftRequest;
  };

  if (!body.accountId || !body.draft) {
    return NextResponse.json({ error: "accountId and draft required" }, { status: 400 });
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
    const result = await generateEmailDraft(account as EmailAccountRow, body.draft);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "AI draft failed" },
      { status: 500 },
    );
  }
}
