"use server";

import { createClient } from "@/lib/supabase/server";

export type ChatMessage = { role: "user" | "assistant"; content: string };

export async function sendAiMessage(
  messages: ChatMessage[],
  systemPrompt: string,
  selectedModelId?: string,
  maxTokens = 1024,
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

    // ── Mistral / OpenAI-compatible ───────────────────────────────────────────
    const baseUrl = provider.toLowerCase().includes("mistral")
      ? "https://api.mistral.ai/v1"
      : "https://api.openai.com/v1";

    const res = await fetch(`${baseUrl}/chat/completions`, {
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
      return { ok: false, error: `API error ${res.status}` };
    }
    const data = await res.json() as { choices?: { message?: { content?: string } }[] };
    const reply = data.choices?.[0]?.message?.content ?? "";
    return { ok: true, reply };

  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Network error" };
  }
}
