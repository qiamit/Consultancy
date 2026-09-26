"use server";

import { createClient } from "@backend/db/client/server";
import {
  compatibleChatBaseUrl,
  isXaiProvider,
  pickPortalVisionModel,
} from "@backend/modules/ai/compatible-chat";

const READ_IMAGE_PROMPT = `You help Quality Engineering Consultancy staff read a small security image they already see on their own portal tab.
Look at the image and type the printed letters and digits exactly as shown.
Reply with only those 4 to 8 characters. No spaces, no punctuation, no extra words.
If you cannot read the characters, reply EMPTY.`;

function parseCaptchaReply(raw: string): string {
  const text = String(raw || "").replace(/```[\s\S]*?```/g, " ").trim();
  if (!text) return "";
  const tokens = text.match(/[A-Za-z0-9]{4,8}/g) || [];
  const skip = /^(empty|sorry|unable|refuse|policy|image|text|none|unreadable)$/i;
  const token = tokens.find((item) => !skip.test(item));
  if (token) return token;
  const compact = text.replace(/[^A-Za-z0-9]/g, "");
  if (compact.length < 4 || compact.length > 10) return "";
  if (skip.test(compact)) return "";
  return compact;
}

function choiceText(data: unknown): string {
  const msg = (data as { choices?: { message?: { content?: unknown } }[] })?.choices?.[0]
    ?.message?.content;
  if (typeof msg === "string") return msg;
  if (Array.isArray(msg)) {
    return msg
      .map((part) =>
        typeof part === "string" ? part : String((part as { text?: string })?.text || ""),
      )
      .join("");
  }
  return "";
}

function splitDataUrl(image: string): { mime: string; base64: string } | null {
  const raw = String(image || "").trim();
  const match = raw.match(/^data:(image\/(?:png|jpeg|jpg|webp|gif));base64,([A-Za-z0-9+/=\s]+)$/i);
  if (!match) return null;
  const base64 = match[2].replace(/\s+/g, "");
  if (base64.length < 80 || base64.length > 400_000) return null;
  const mime = match[1].toLowerCase() === "image/jpg" ? "image/jpeg" : match[1].toLowerCase();
  return { mime, base64 };
}

export async function solveIsPortalCaptcha(
  imageDataUrl: string,
): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const image = splitDataUrl(imageDataUrl);
  if (!image) return { ok: false, error: "Captcha image was empty or too large." };

  const { data: models } = await supabase
    .from("ai_models")
    .select("provider, model_id, api_key")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  const model = pickPortalVisionModel(
    (models ?? []) as { provider: string; model_id: string; api_key: string | null }[],
  );
  if (!model?.api_key) {
    return {
      ok: false,
      error: "No active QE Assistant model. Add xAI (Grok) in App Settings → AI Settings.",
    };
  }

  const provider = String(model.provider || "").toLowerCase();

  try {
    if (provider.includes("anthropic") || provider.includes("claude")) {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": model.api_key,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: model.model_id,
          max_tokens: 256,
          system: READ_IMAGE_PROMPT,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: image.mime,
                    data: image.base64,
                  },
                },
                { type: "text", text: "Type the printed characters only." },
              ],
            },
          ],
        }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
        return { ok: false, error: err.error?.message ?? `Anthropic error ${res.status}` };
      }
      const data = (await res.json()) as { content?: { text?: string }[] };
      return { ok: true, text: parseCaptchaReply(data.content?.[0]?.text ?? "") };
    }

    if (provider.includes("google") || provider.includes("gemini")) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model.model_id}:generateContent?key=${model.api_key}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: READ_IMAGE_PROMPT }] },
            contents: [
              {
                role: "user",
                parts: [
                  { inlineData: { mimeType: image.mime, data: image.base64 } },
                  { text: "Type the printed characters only." },
                ],
              },
            ],
            generationConfig: { maxOutputTokens: 256, temperature: 0 },
          }),
        },
      );
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
        return { ok: false, error: err.error?.message ?? `Gemini error ${res.status}` };
      }
      const data = (await res.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };
      return {
        ok: true,
        text: parseCaptchaReply(data.candidates?.[0]?.content?.parts?.[0]?.text ?? ""),
      };
    }

    const baseUrl = compatibleChatBaseUrl(model.provider);
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${model.api_key}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: model.model_id,
        max_tokens: 256,
        temperature: 0,
        ...(isXaiProvider(model.provider) ? { reasoning_effort: "low" } : {}),
        messages: [
          { role: "system", content: READ_IMAGE_PROMPT },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: `data:${image.mime};base64,${image.base64}` },
              },
              { type: "text", text: "Type the printed characters only." },
            ],
          },
        ],
      }),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      return { ok: false, error: err.error?.message ?? `Vision API error ${res.status}` };
    }
    const data = await res.json();
    return { ok: true, text: parseCaptchaReply(choiceText(data)) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "QE Assistant network error." };
  }
}
