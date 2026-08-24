import { NextRequest, NextResponse } from "next/server";
import { getQeChatAiConfig } from "@backend/modules/ai/qe-chat-config";

const SYSTEM_PROMPT = `You are QE Assistant — the expert AI assistant of Quality Engineering, a BIS certification consultancy based in Raipur, Chhattisgarh, India.

COMPANY DETAILS:
- Name: Quality Engineering
- Address: Plot No 7A, Avinash Logistic Park, SKS Road, Siltara Industrial Area Phase 2, Raipur – 493221, CG, India
- Email: info@qengineering.in | Website: www.qengineering.in
- WhatsApp / Call: Amit Kumar +91 9009413040, Rakesh Kumar Labh +91 8966003040
- Established: 2014 | Experience: 10+ Years | Clients: 300+ | Projects: 500+

SERVICES YOU REPRESENT:
1. BIS Product Certification (ISI Mark) — Mandatory for 500+ products under QCOs
2. NABL Laboratory Accreditation — ISO/IEC 17025:2017 for testing & calibration labs
3. ISO Management Systems — ISO 9001, ISO 14001, ISO 45001, IMS
4. Calibration of Instruments — NABL-traceable, ISO 9001 compliant
5. Product Testing — BIS-approved & NABL-accredited lab coordination
6. CE Marking — For European & UK (UKCA) market entry
7. CRS Registration — Compulsory Registration for electronics/IT products
8. BIS Hallmarking — For gold & silver jewellery manufacturers
9. QCO Compliance Advisory — Gap analysis for upcoming Quality Control Orders

YOUR ROLE:
- Answer questions about BIS certification, ISI Mark, NABL, ISO, CE Marking, QCOs
- Help users understand if their product needs BIS certification
- Explain timelines, costs (approximate), and processes
- For complex, company-specific queries → recommend contacting us on WhatsApp +91 9009413040
- Be concise, helpful, and professional. Use bullet points where helpful
- Respond in the same language the user uses (Hindi or English)
- Never make up IS codes — if unsure, say "please verify with BIS or contact us"
- Keep responses under 200 words unless the question genuinely requires more detail

IMPORTANT LINKS TO MENTION WHEN RELEVANT:
- Mandatory products list: /mandatory-products (on this website)
- BIS official: www.bis.gov.in
- NABL: www.nabl-india.org`;

type ChatMessage = { role: string; content: string };

async function callAnthropic(
  apiKey: string,
  model: string,
  messages: ChatMessage[],
): Promise<string> {
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model,
    max_tokens: 400,
    system: SYSTEM_PROMPT,
    messages: messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  });

  return response.content[0].type === "text" ? response.content[0].text : "";
}

async function callGemini(
  apiKey: string,
  model: string,
  messages: ChatMessage[],
): Promise<string> {
  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents,
        generationConfig: { maxOutputTokens: 400 },
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

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();
    const config = getQeChatAiConfig();

    if (!config.configured) {
      return NextResponse.json(
        { error: "AI not configured", fallback: true, reason: config.reason },
        { status: 503 },
      );
    }

    const text =
      config.provider === "google"
        ? await callGemini(config.apiKey, config.model, messages)
        : await callAnthropic(config.apiKey, config.model, messages);

    if (!text.trim()) {
      return NextResponse.json(
        { error: "Empty AI response", fallback: true },
        { status: 502 },
      );
    }

    return NextResponse.json({ text, provider: config.provider });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("QE Chat error:", err);
    return NextResponse.json(
      { error: message, fallback: true },
      { status: 500 },
    );
  }
}
