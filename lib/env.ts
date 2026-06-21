export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
  );
}

/** User-friendly message when auth fails due to bad/missing Supabase URL in production. */
export function formatAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (
    lower.includes("failed to fetch") ||
    lower.includes("networkerror") ||
    lower.includes("err_name_not_resolved") ||
    lower.includes("load failed")
  ) {
    return [
      "Cannot connect to Supabase (network error).",
      "In Vercel → Project → Settings → Environment Variables, set NEXT_PUBLIC_SUPABASE_URL to your project URL",
      "(e.g. https://zpsflksszoktlzgrytpb.supabase.co) and the matching anon key, then redeploy.",
    ].join(" ");
  }
  return message;
}
