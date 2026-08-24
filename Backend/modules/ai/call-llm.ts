import { getQeChatAiConfig } from "@backend/modules/ai/qe-chat-config";

export async function callLlmText(
  systemPrompt: string,
  userPrompt: string,
  maxOutputTokens = 2000,
): Promise<string> {
  const config = getQeChatAiConfig();
  if (!config.configured) {
    throw new Error(config.reason);
  }

  if (config.provider === "google") {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: userPrompt }] }],
          generationConfig: {
            maxOutputTokens,
            temperature: 0.2,
            responseMimeType: "application/json",
          },
        }),
      },
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const message =
        (err as { error?: { message?: string } }).error?.message ??
        `Gemini API error ${res.status}`;
      throw new Error(message);
    }

    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  }

  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic({ apiKey: config.apiKey });
  const response = await client.messages.create({
    model: config.model,
    max_tokens: maxOutputTokens,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  return response.content[0].type === "text" ? response.content[0].text : "";
}
