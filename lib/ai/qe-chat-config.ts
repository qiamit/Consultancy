export type QeAiProvider = "anthropic" | "google";

const PLACEHOLDER_KEYS = new Set(["", "your_key_here", "your-gemini-key-here"]);

function isConfiguredKey(value: string | undefined): value is string {
  return Boolean(value && !PLACEHOLDER_KEYS.has(value.trim()));
}

const DEFAULT_MODELS: Record<QeAiProvider, string> = {
  anthropic: "claude-haiku-4-5-20251001",
  google: "gemini-2.5-flash",
};

export function resolveQeAiProvider(): QeAiProvider {
  const raw = (process.env.QE_AI_PROVIDER ?? "").toLowerCase().trim();
  if (raw === "google" || raw === "gemini") return "google";
  if (raw === "anthropic" || raw === "claude") return "anthropic";
  // Auto-detect when provider not set explicitly
  if (isConfiguredKey(process.env.GEMINI_API_KEY)) return "google";
  return "anthropic";
}

export function getQeChatAiConfig():
  | { configured: true; provider: QeAiProvider; apiKey: string; model: string }
  | { configured: false; provider: QeAiProvider; reason: string } {
  const preferred = resolveQeAiProvider();
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  const anthropicOk = isConfiguredKey(anthropicKey);
  const geminiOk = isConfiguredKey(geminiKey);

  let provider = preferred;
  if (provider === "anthropic" && !anthropicOk && geminiOk) provider = "google";
  if (provider === "google" && !geminiOk && anthropicOk) provider = "anthropic";

  if (provider === "google") {
    if (!geminiOk) {
      return {
        configured: false,
        provider,
        reason: "GEMINI_API_KEY is not set in .env.local (or QE_AI_PROVIDER=google with no key)",
      };
    }
    const model =
      process.env.GEMINI_MODEL?.trim() || DEFAULT_MODELS.google;
    return { configured: true, provider, apiKey: geminiKey!, model };
  }

  if (!anthropicOk) {
    return {
      configured: false,
      provider,
      reason: geminiOk
        ? "Set QE_AI_PROVIDER=google in .env.local to use your Gemini key"
        : "ANTHROPIC_API_KEY is not set in .env.local",
    };
  }
  const model =
    process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_MODELS.anthropic;
  return { configured: true, provider, apiKey: anthropicKey!, model };
}
