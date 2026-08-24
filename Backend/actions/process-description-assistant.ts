"use server";

import { sendAiMessage } from "@backend/actions/ai-chat";

const POLISH_SYSTEM = `You rewrite manufacturing process description points for BIS licence applications submitted to the Bureau of Indian Standards (India).

Your task:
- Polish the language to be professional, formal, and suitable for a BIS process description letter
- Elaborate slightly where helpful while preserving the original meaning and factual claims
- Use clear Indian BIS/ISI certification context
- Keep one process description point only — do not split into multiple points
- Do not add new process steps the original text did not imply

Return ONLY the rewritten process description point. No quotes, markdown, labels, or explanation.`;

export async function polishProcessDescriptionPoint(
  text: string,
): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  const draft = text.trim();
  if (!draft) {
    return { ok: false, error: "Enter process description text before using QE Assistant." };
  }

  const result = await sendAiMessage(
    [
      {
        role: "user",
        content: `Rewrite this process description point:\n\n${draft}`,
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
