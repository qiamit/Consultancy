/**
 * Lightweight unit checks for QueryBuilder helpers (no DB required).
 * Run: node scripts/test-query-builder.cjs
 */

function parseSelectColumns(select) {
  if (!select || select.trim() === "" || select.trim() === "*") {
    return { columns: ["*"], embeds: [] };
  }
  const columns = [];
  const embeds = [];
  let buf = "";
  let depth = 0;
  const flush = () => {
    const part = buf.trim();
    buf = "";
    if (!part) return;
    const embedMatch = /^([a-zA-Z_][a-zA-Z0-9_]*)\((.*)\)$/s.exec(part);
    if (embedMatch) {
      embeds.push({ alias: embedMatch[1], columns: embedMatch[2].trim() || "*" });
      return;
    }
    columns.push(part);
  };
  for (let i = 0; i < select.length; i++) {
    const ch = select[i];
    if (ch === "(") {
      depth += 1;
      buf += ch;
    } else if (ch === ")") {
      depth = Math.max(0, depth - 1);
      buf += ch;
    } else if (ch === "," && depth === 0) {
      flush();
    } else {
      buf += ch;
    }
  }
  flush();
  if (columns.length === 0 && embeds.length > 0) columns.push("*");
  return { columns: columns.length ? columns : ["*"], embeds };
}

function parseOrFilter(filter) {
  const parts = [];
  let buf = "";
  let depth = 0;
  for (let i = 0; i < filter.length; i++) {
    const ch = filter[i];
    if (ch === "(") {
      depth += 1;
      buf += ch;
    } else if (ch === ")") {
      depth = Math.max(0, depth - 1);
      buf += ch;
    } else if (ch === "," && depth === 0) {
      parts.push(buf.trim());
      buf = "";
    } else {
      buf += ch;
    }
  }
  if (buf.trim()) parts.push(buf.trim());
  return parts;
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const parsed = parseSelectColumns(
  "id, name, clients(name, company_name), finance_quotation_lines(id, sort_order)",
);
assert(parsed.columns.includes("id") && parsed.columns.includes("name"), "main cols");
assert(parsed.embeds.length === 2, "two embeds");
assert(parsed.embeds[0].alias === "clients", "clients embed");
assert(parsed.embeds[1].alias === "finance_quotation_lines", "lines embed");

const orParts = parseOrFilter("status.is.null,status.eq.in_progress");
assert(orParts.length === 2, "or parts");
assert(orParts[0] === "status.is.null", "or first");
assert(orParts[1] === "status.eq.in_progress", "or second");

const ilikeParts = parseOrFilter("name.ilike.%acme%,company_name.ilike.%acme%");
assert(ilikeParts.length === 2, "ilike or parts");

console.log("test-query-builder: ok");
