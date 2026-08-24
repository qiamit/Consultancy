import type { ProcessDescriptionStored } from "@backend/modules/bis/process-description";

export type ProcessDescriptionQeUpdate = {
  apply?: boolean;
  points?: string[];
};

export function parseProcessDescriptionQeReply(reply: string): {
  displayReply: string;
  update: ProcessDescriptionQeUpdate | null;
} {
  const fenceMatch = reply.match(/```(?:json)?\s*([\s\S]*?)\s*```\s*$/);
  if (!fenceMatch) return { displayReply: reply, update: null };

  try {
    const parsed = JSON.parse(fenceMatch[1]!.trim()) as ProcessDescriptionQeUpdate;
    const points = (parsed.points ?? []).map((p) => String(p ?? "").trim()).filter(Boolean);
    if (parsed.apply && points.length > 0) {
      const displayReply = reply.slice(0, fenceMatch.index).trimEnd();
      return { displayReply, update: { apply: true, points } };
    }
  } catch {
    // ignore malformed JSON
  }

  return { displayReply: reply, update: null };
}

export function applyProcessDescriptionQeUpdate(
  update: ProcessDescriptionQeUpdate,
  document: ProcessDescriptionStored,
): ProcessDescriptionStored {
  const points = (update.points ?? []).map((p) => String(p ?? "").trim()).filter(Boolean);
  if (points.length === 0) return document;
  return { ...document, description_points: points };
}
