"use server";

import { createClient } from "@backend/db/client/server";
import { compatibleChatBaseUrl } from "@backend/modules/ai/compatible-chat";

export type ChatMessage = { role: "user" | "assistant"; content: string };

export type SendAiOptions = {
  /** DeepSeek V4 / Grok reasoning. Extraction should disable thinking so JSON is not empty. */
  thinking?: "enabled" | "disabled";
  jsonObject?: boolean;
};

function assistantTextFromMessage(message: unknown): string {
  if (!message || typeof message !== "object") return "";
  const row = message as Record<string, unknown>;
  const content = row.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in part) {
          return String((part as { text?: unknown }).text ?? "");
        }
        return "";
      })
      .join("");
  }
  return "";
}

function compatibleChatBody(
  modelId: string,
  systemPrompt: string,
  messages: ChatMessage[],
  maxTokens: number,
  options?: SendAiOptions,
) {
  const body: Record<string, unknown> = {
    model: modelId,
    max_tokens: maxTokens,
    messages: [
      { role: "system", content: systemPrompt },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ],
  };
  if (options?.thinking) {
    body.thinking = { type: options.thinking };
  }
  if (options?.jsonObject) {
    body.response_format = { type: "json_object" };
  }
  return body;
}

export async function sendAiMessage(
  messages: ChatMessage[],
  systemPrompt: string,
  selectedModelId?: string,
  maxTokens = 1024,
  options?: SendAiOptions,
): Promise<{ ok: true; reply: string } | { ok: false; error: string }> {
  const supabase = await createClient();

  // Pick selected model or first active AI model
  const query = supabase
    .from("ai_models")
    .select("provider, model_id, api_key");

  const { data: models } = await (selectedModelId
    ? query.eq("id", selectedModelId).limit(1)
    : query.eq("is_active", true).order("sort_order", { ascending: true }).limit(1));

  const model = models?.[0];
  if (!model) {
    return { ok: false, error: "No active AI model configured. Go to App Settings → AI Settings to add one." };
  }

  const { provider, model_id, api_key } = model as {
    provider: string;
    model_id: string;
    api_key: string | null;
  };

  if (!api_key) {
    return { ok: false, error: "Active AI model has no API key saved." };
  }

  try {
    // ── Anthropic ─────────────────────────────────────────────────────────────
    if (provider.toLowerCase().includes("anthropic")) {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": api_key,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: model_id,
          max_tokens: maxTokens,
          system: systemPrompt,
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return { ok: false, error: (err as { error?: { message?: string } }).error?.message ?? `Anthropic API error ${res.status}` };
      }
      const data = await res.json() as { content?: { text?: string }[] };
      const reply = data.content?.[0]?.text ?? "";
      return { ok: true, reply };
    }

    // ── OpenAI ────────────────────────────────────────────────────────────────
    if (provider.toLowerCase().includes("openai")) {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${api_key}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: model_id,
          max_tokens: maxTokens,
          messages: [
            { role: "system", content: systemPrompt },
            ...messages.map((m) => ({ role: m.role, content: m.content })),
          ],
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return { ok: false, error: (err as { error?: { message?: string } }).error?.message ?? `OpenAI API error ${res.status}` };
      }
      const data = await res.json() as { choices?: { message?: { content?: string } }[] };
      const reply = data.choices?.[0]?.message?.content ?? "";
      return { ok: true, reply };
    }

    // ── Google Gemini ─────────────────────────────────────────────────────────
    if (provider.toLowerCase().includes("google")) {
      const contents = messages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model_id}:generateContent?key=${api_key}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents,
            generationConfig: { maxOutputTokens: maxTokens },
          }),
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return { ok: false, error: (err as { error?: { message?: string } }).error?.message ?? `Gemini API error ${res.status}` };
      }
      const data = await res.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      return { ok: true, reply };
    }

    // ── Mistral / DeepSeek / OpenAI-compatible ────────────────────────────────
    const baseUrl = compatibleChatBaseUrl(provider);

    const postCompatible = async (body: Record<string, unknown>) => {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${api_key}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: { message?: string };
        choices?: { finish_reason?: string; message?: unknown }[];
      };
      if (!res.ok) {
        return {
          ok: false as const,
          error: data.error?.message ?? `API error ${res.status}`,
        };
      }
      const reply = assistantTextFromMessage(data.choices?.[0]?.message);
      return {
        ok: true as const,
        reply,
        finishReason: data.choices?.[0]?.finish_reason ?? "",
      };
    };

    const first = await postCompatible(
      compatibleChatBody(model_id, systemPrompt, messages, maxTokens, options),
    );
    if (!first.ok) return first;

    let reply = first.reply.trim();
    // DeepSeek V4 Pro defaults to thinking-on. Reasoning eats max_tokens and content stays empty.
    if (!reply && options?.thinking !== "enabled") {
      const retry = await postCompatible(
        compatibleChatBody(model_id, systemPrompt, messages, Math.max(maxTokens, 4096), {
          ...options,
          thinking: "disabled",
        }),
      );
      if (!retry.ok) return retry;
      reply = retry.reply.trim();
      if (!reply) {
        return {
          ok: false,
          error:
            "QE Assistant finished reasoning but returned no text. Disable thinking on the model, or raise max tokens, then try again.",
        };
      }
      return { ok: true, reply };
    }

    if (!reply) {
      return {
        ok: false,
        error:
          first.finishReason === "length"
            ? "QE Assistant used the full token budget on reasoning and returned an empty extract. Try again."
            : "QE Assistant returned an empty reply.",
      };
    }
    return { ok: true, reply };

  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Network error" };
  }
}
