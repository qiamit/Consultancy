"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@backend/db/supabase/server";
import { applyProviderPreset } from "@backend/modules/email/providers";
import { providerMismatchMessage } from "@backend/modules/email/domain-provider-hints";
import type { EmailAccountRow, EmailAccountSafe, EmailProvider } from "@backend/shared/types/email";

function stripSecrets(row: Record<string, unknown>): EmailAccountSafe {
  const {
    password: _p,
    oauth_access_token: _oa,
    oauth_refresh_token: _or,
    ai_api_key: _ak,
    ...safe
  } = row;
  return safe as EmailAccountSafe;
}

export type SaveEmailAccountResult =
  | { ok: true; warning?: string }
  | { ok: false; error: string };

export async function fetchEmailAccounts(): Promise<{
  accounts: EmailAccountSafe[];
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("email_accounts")
      .select("*")
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: true });

    if (error) {
      return { accounts: [], error: error.message };
    }

    return {
      accounts: (data ?? []).map((r) => stripSecrets(r as Record<string, unknown>)),
      error: null,
    };
  } catch (e) {
    return {
      accounts: [],
      error: e instanceof Error ? e.message : "Could not load email accounts.",
    };
  }
}

export async function saveEmailAccount(formData: FormData): Promise<SaveEmailAccountResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { ok: false, error: "You must be signed in to add an email account." };
    }

    const id = String(formData.get("id") ?? "").trim();
    const provider = String(formData.get("provider") ?? "gmail") as EmailProvider;
    const testConnection = formData.get("test_connection") === "1";

    const preset = applyProviderPreset(provider, {
      imap_host: String(formData.get("imap_host") ?? "").trim() || undefined,
      smtp_host: String(formData.get("smtp_host") ?? "").trim() || undefined,
      imap_port: Number(formData.get("imap_port") ?? 993),
      smtp_port: Number(formData.get("smtp_port") ?? 587),
    });

    const payload = {
      user_id: user.id,
      display_name: String(formData.get("display_name") ?? "").trim(),
      email_address: String(formData.get("email_address") ?? "").trim().toLowerCase(),
      provider,
      auth_type: "imap" as const,
      ...preset,
      username:
        String(formData.get("username") ?? "").trim() ||
        String(formData.get("email_address") ?? "").trim(),
      signature: String(formData.get("signature") ?? "").trim() || null,
      accent_color: String(formData.get("accent_color") ?? "#0ea5e9").trim(),
      is_default: formData.get("is_default") === "1",
      updated_at: new Date().toISOString(),
    };

    const password = String(formData.get("password") ?? "")
      .trim()
      .replace(/\s+/g, "");

    if (!payload.display_name || !payload.email_address) {
      return { ok: false, error: "Display name and email are required." };
    }

    if (provider === "custom" && (!preset.imap_host || !preset.smtp_host)) {
      return { ok: false, error: "IMAP and SMTP host are required for custom providers." };
    }

    const providerHint = providerMismatchMessage(payload.email_address, provider);
    if (providerHint) {
      return { ok: false, error: providerHint };
    }

    let savedRow: EmailAccountRow;

    if (id) {
      const update: Record<string, unknown> = { ...payload };
      if (password) update.password = password;

      const { data: existing } = await supabase
        .from("email_accounts")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!existing) return { ok: false, error: "Account not found." };

      const { error } = await supabase.from("email_accounts").update(update).eq("id", id);
      if (error) return { ok: false, error: error.message };

      savedRow = {
        ...(existing as EmailAccountRow),
        ...(update as Partial<EmailAccountRow>),
        password: password || String(existing.password ?? "").replace(/\s+/g, ""),
      };
    } else {
      if (!password) {
        return { ok: false, error: "App password is required for new accounts." };
      }

      const row = { ...payload, password };
      const { data: inserted, error } = await supabase
        .from("email_accounts")
        .insert(row)
        .select("*")
        .single();

      if (error) return { ok: false, error: error.message };
      savedRow = inserted as EmailAccountRow;
    }

    if (payload.is_default) {
      await supabase
        .from("email_accounts")
        .update({ is_default: false })
        .eq("user_id", user.id);
      await supabase
        .from("email_accounts")
        .update({ is_default: true })
        .eq("user_id", user.id)
        .eq("email_address", payload.email_address);
    }

    revalidatePath("/dashboard/email");

    if (testConnection) {
      try {
        const { testEmailAccountConnection } = await import("@backend/modules/email/test-connection");
        await testEmailAccountConnection(savedRow);
        return { ok: true };
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Connection test failed.";
        return {
          ok: true,
          warning: `Account saved, but connection test failed: ${msg}. Check app password / IMAP settings, then use Sync.`,
        };
      }
    }

    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not save email account.",
    };
  }
}

export async function deleteEmailAccount(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Not authenticated." };

    const { error } = await supabase
      .from("email_accounts")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) return { ok: false, error: error.message };
    revalidatePath("/dashboard/email");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not remove account.",
    };
  }
}

export async function fetchCachedMessages(
  accountId: string,
  folder: string,
  starredOnly = false,
) {
  const supabase = await createClient();
  let query = supabase
    .from("email_messages")
    .select("*")
    .eq("account_id", accountId)
    .order("email_date", { ascending: false })
    .limit(100);

  if (starredOnly) {
    query = query.eq("is_starred", true);
  } else {
    query = query.eq("folder", folder);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}
