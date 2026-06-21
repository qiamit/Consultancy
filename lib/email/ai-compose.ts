import { createClient } from "@/lib/supabase/server";
import type { EmailAccountRow } from "@/lib/types/email";

export type AiDraftRequest = {
  mode: "draft" | "reply" | "replyAll" | "forward";
  tone?: "professional" | "friendly" | "formal";
  instructions?: string;
  subject?: string;
  originalFrom?: string;
  originalBody?: string;
  recipientHint?: string;
};

async function resolveAppAiModel() {
  const supabase = await createClient();
  const { data: model } = await supabase
    .from("ai_models")
    .select("provider, model_id, api_key")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!model) {
    throw new Error(
      "No active AI model configured. Go to App Settings → AI Settings to add one.",
    );
  }

  const { provider, model_id, api_key } = model as {
    provider: string;
    model_id: string;
    api_key: string | null;
  };

  if (!api_key) {
    throw new Error("Active AI model has no API key saved.");
  }

  return { provider, modelId: model_id, apiKey: api_key };
}

async function callAppAiModel(
  provider: string,
  modelId: string,
  apiKey: string,
  system: string,
  user: string,
  maxOutputTokens: number,
): Promise<string> {
  const providerLower = provider.toLowerCase();

  if (providerLower.includes("anthropic")) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: modelId,
        max_tokens: maxOutputTokens,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(
        (err as { error?: { message?: string } }).error?.message ??
          `Anthropic API error ${res.status}`,
      );
    }
    const data = (await res.json()) as { content?: { text?: string }[] };
    return data.content?.[0]?.text ?? "";
  }

  if (providerLower.includes("openai")) {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: modelId,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        max_tokens: maxOutputTokens,
        temperature: 0.3,
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(
        (err as { error?: { message?: string } }).error?.message ??
          `OpenAI API error ${res.status}`,
      );
    }
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    return data.choices?.[0]?.message?.content ?? "";
  }

  if (providerLower.includes("google")) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: "user", parts: [{ text: user }] }],
          generationConfig: {
            maxOutputTokens,
            temperature: 0.3,
            responseMimeType: "application/json",
          },
        }),
      },
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(
        (err as { error?: { message?: string } }).error?.message ??
          `Gemini API error ${res.status}`,
      );
    }
    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  }

  const baseUrl = providerLower.includes("mistral")
    ? "https://api.mistral.ai/v1"
    : "https://api.openai.com/v1";

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: modelId,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      max_tokens: maxOutputTokens,
      temperature: 0.3,
    }),
  });
  if (!res.ok) {
    throw new Error(`API error ${res.status}`);
  }
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return data.choices?.[0]?.message?.content ?? "";
}

export async function generateEmailDraft(
  account: EmailAccountRow,
  req: AiDraftRequest,
): Promise<{ subject: string; body: string }> {
  const ai = await resolveAppAiModel();

  const system = `You are an expert email assistant for a BIS/ISO certification consultancy in India.
Write clear, professional emails. Return ONLY valid JSON: {"subject":"...","body":"..."}.
Body should be plain text with line breaks, no markdown. Keep emails concise unless asked otherwise.`;

  const user = JSON.stringify({
    mode: req.mode,
    tone: req.tone ?? "professional",
    instructions: req.instructions ?? "",
    currentSubject: req.subject ?? "",
    originalFrom: req.originalFrom ?? "",
    originalBody: (req.originalBody ?? "").slice(0, 4000),
    recipientHint: req.recipientHint ?? "",
    senderName: account.display_name,
    senderEmail: account.email_address,
  });

  const raw = await callAppAiModel(
    ai.provider,
    ai.modelId,
    ai.apiKey,
    system,
    user,
    1500,
  );

  const cleaned = raw.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
  const parsed = JSON.parse(cleaned) as { subject?: string; body?: string };
  return {
    subject: parsed.subject ?? req.subject ?? "",
    body: parsed.body ?? "",
  };
}
