"use server";

import { sendAiMessage } from "@backend/actions/ai-chat";

const POLISH_SYSTEM = `You rewrite undertaking points for BIS General & ISS applications submitted to the Bureau of Indian Standards (India).

Your task:
- Polish the language to be professional, formal, and suitable for a legal undertaking letter
- Elaborate slightly where helpful while preserving the original meaning and factual claims
- Use clear Indian BIS/ISI certification context
- Keep one undertaking point only — do not split into multiple points
- Do not add new commitments the original text did not imply

Return ONLY the rewritten undertaking point. No quotes, markdown, labels, or explanation.`;

export async function polishUndertakingGeneralIssPoint(
  text: string,
): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  const draft = text.trim();
  if (!draft) {
    return { ok: false, error: "Enter undertaking text before using QE Assistant." };
  }

  const result = await sendAiMessage(
    [
      {
        role: "user",
        content: `Rewrite this undertaking point:\n\n${draft}`,
      },
    ],
    POLISH_SYSTEM,
    undefined,
    1024,
  );

  if (!result.ok) return result;

  const polished = result.reply.trim().replace(/^["']|["']$/g, "");
  if (!polished) {
    return { ok: false, error: "QE Assistant returned an empty response. Try again." };
  }

  return { ok: true, text: polished };
}
