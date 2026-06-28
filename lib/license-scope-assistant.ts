import type { LicenseScopeFormat } from "@/lib/license-scope-format";
import {
  parsePlainTextToRows,
  storedRowsToEditorRows,
  type LicenseScopeRow,
} from "@/lib/license-scope-format";

export type LicenseScopeAssistantUpdate = {
  apply?: boolean;
  plain?: string;
  rows?: { component: string; value: string }[];
};

export function parseLicenseScopeAssistantReply(reply: string): {
  displayReply: string;
  update: LicenseScopeAssistantUpdate | null;
} {
  const fenceMatch = reply.match(/```(?:json)?\s*([\s\S]*?)\s*```\s*$/);
  if (!fenceMatch) return { displayReply: reply, update: null };

  try {
    const parsed = JSON.parse(fenceMatch[1]!.trim()) as LicenseScopeAssistantUpdate;
    const hasPlain = Boolean(parsed.plain?.trim());
    const hasRows = Boolean(parsed.rows?.some((r) => r.component?.trim() || r.value?.trim()));
    if (parsed.apply && (hasPlain || hasRows)) {
      const displayReply = reply.slice(0, fenceMatch.index).trimEnd();
      return { displayReply, update: parsed };
    }
  } catch {
    // ignore malformed JSON
  }

  return { displayReply: reply, update: null };
}

export function applyLicenseScopeUpdate(
  update: LicenseScopeAssistantUpdate,
  format: LicenseScopeFormat,
  setDraftScope: (value: string) => void,
  setTableRows: (rows: LicenseScopeRow[]) => void,
): void {
  if (format === "plain") {
    if (update.plain?.trim()) {
      setDraftScope(update.plain.trim());
      return;
    }
    if (update.rows?.length) {
      const text = update.rows
        .filter((r) => r.component.trim() || r.value.trim())
        .map((r, i) => {
          const component = r.component.trim();
          const value = r.value.trim();
          if (component && value) return `${i + 1}. ${component}: ${value}`;
          if (component) return `${i + 1}. ${component}`;
          return `${i + 1}. ${value}`;
        })
        .join("\n");
      setDraftScope(text);
    }
    return;
  }

  if (update.rows?.length) {
    const filled = update.rows.filter((r) => r.component.trim() || r.value.trim());
    if (filled.length > 0) {
      setTableRows(storedRowsToEditorRows(filled));
      return;
    }
  }
  if (update.plain?.trim()) {
    setTableRows(parsePlainTextToRows(update.plain));
  }
}
