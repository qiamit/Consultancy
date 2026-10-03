import { NextResponse } from "next/server";
import { createClient } from "@backend/db/client/server";

export const dynamic = "force-dynamic";

/** Short in-memory cache so header polls do not hammer the DB. */
const cache = new Map<string, { count: number; at: number }>();
const CACHE_TTL_MS = 45_000;

/**
 * Lightweight unread inbox count for the header badge.
 * Prefer this over the server action so navigation does not POST/RSC-refresh the page.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ count: 0 }, { status: 401 });
    }

    const cached = cache.get(user.id);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
      return NextResponse.json(
        { count: cached.count },
        {
          headers: {
            "Cache-Control": "private, max-age=30",
          },
        },
      );
    }

    const { data: accounts, error: accountsError } = await supabase
      .from("email_accounts")
      .select("id")
      .eq("user_id", user.id);

    if (accountsError || !accounts?.length) {
      cache.set(user.id, { count: 0, at: Date.now() });
      return NextResponse.json({ count: 0 });
    }

    const accountIds = accounts.map((a) => a.id as string);
    const { count, error } = await supabase
      .from("email_messages")
      .select("id", { count: "exact", head: true })
      .in("account_id", accountIds)
      .eq("is_read", false)
      .eq("folder", "INBOX");

    const value = error ? 0 : (count ?? 0);
    cache.set(user.id, { count: value, at: Date.now() });

    return NextResponse.json(
      { count: value },
      {
        headers: {
          "Cache-Control": "private, max-age=30",
        },
      },
    );
  } catch {
    return NextResponse.json({ count: 0 });
  }
}
