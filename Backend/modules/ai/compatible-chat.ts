export function isXaiProvider(provider: string): boolean {
  const value = String(provider || "").toLowerCase();
  return value.includes("xai") || value.includes("x.ai") || value.includes("grok");
}

export function compatibleChatBaseUrl(provider: string): string {
  const value = String(provider || "").toLowerCase();
  if (isXaiProvider(value)) return "https://api.x.ai/v1";
  if (value.includes("mistral")) return "https://api.mistral.ai/v1";
  if (value.includes("deepseek")) return "https://api.deepseek.com/v1";
  return "https://api.openai.com/v1";
}

export type StoredAiModel = {
  provider: string;
  model_id: string;
  api_key: string | null;
};

/** Portal captcha prefers Grok when an active xAI key exists. */
export function pickPortalVisionModel(models: StoredAiModel[]): StoredAiModel | null {
  const ready = models.filter((row) => String(row.api_key || "").trim());
  if (ready.length === 0) return null;
  return ready.find((row) => isXaiProvider(row.provider)) ?? ready[0];
}
