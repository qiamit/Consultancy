export function isDatabaseConfigured(): boolean {
  const secret = process.env.SESSION_SECRET ?? "";
  return Boolean(process.env.DATABASE_URL && secret.length >= 32);
}

/** @deprecated Prefer isDatabaseConfigured — kept for existing call sites. */
export function isSupabaseConfigured(): boolean {
  return isDatabaseConfigured();
}

/** User-friendly message when auth fails due to network / misconfiguration. */
export function formatAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (
    lower.includes("failed to fetch") ||
    lower.includes("networkerror") ||
    lower.includes("err_name_not_resolved") ||
    lower.includes("load failed") ||
    lower.includes("econnrefused") ||
    lower.includes("database_url")
  ) {
    return [
      "Cannot connect to the database (network or configuration error).",
      "Set DATABASE_URL and SESSION_SECRET (min 32 characters) in the environment, then redeploy.",
    ].join(" ");
  }
  return message;
}
