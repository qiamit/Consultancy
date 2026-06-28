import type { FtrTestRowStored } from "@/lib/factory-test-report";

/** True when the user is entering an Excel-style formula (=…). */
export function isFtrObservedFormula(raw: string): boolean {
  return raw.trimStart().startsWith("=");
}

export type FtrFormulaResult =
  | { ok: true; value: string }
  | { ok: false; error: string };

export const FTR_OBSERVED_DECIMAL_PLACES = 2;
export const FTR_OBSERVED_DECIMAL_MIN = 0;
export const FTR_OBSERVED_DECIMAL_MAX = 6;

export function resolveObservedDecimals(decimals?: number): number {
  if (decimals == null || !Number.isFinite(decimals)) return FTR_OBSERVED_DECIMAL_PLACES;
  return Math.min(
    FTR_OBSERVED_DECIMAL_MAX,
    Math.max(FTR_OBSERVED_DECIMAL_MIN, Math.trunc(decimals)),
  );
}

const FUNCTION_NAMES = new Set([
  "SUM",
  "AVERAGE",
  "AVG",
  "MIN",
  "MAX",
  "ROUND",
  "SQRT",
  "ABS",
  "POWER",
  "POW",
]);

function formatNumericResult(n: number, decimalPlaces = FTR_OBSERVED_DECIMAL_PLACES): string {
  if (!Number.isFinite(n)) return String(n);
  return n.toFixed(resolveObservedDecimals(decimalPlaces));
}

/** Formats plain numeric observed values to the given decimal places. */
export function formatFtrObservedValue(
  raw: string,
  decimalPlaces = FTR_OBSERVED_DECIMAL_PLACES,
): string {
  const trimmed = raw.trim();
  if (!trimmed || isFtrObservedFormula(trimmed)) return raw;
  const n = Number.parseFloat(trimmed);
  if (!Number.isFinite(n)) return raw;
  if (/^-?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(trimmed)) {
    return n.toFixed(resolveObservedDecimals(decimalPlaces));
  }
  return raw;
}

/** Reformat a numeric observed value to the given decimal places, or null if not numeric. */
export function reformatFtrObservedNumeric(
  raw: string,
  decimalPlaces = FTR_OBSERVED_DECIMAL_PLACES,
): string | null {
  const trimmed = raw.trim();
  if (!trimmed || isFtrObservedFormula(trimmed)) return null;
  const n = Number.parseFloat(trimmed);
  if (!Number.isFinite(n)) return null;
  return n.toFixed(resolveObservedDecimals(decimalPlaces));
}

export function formatFtrObservedForDisplay(
  value: string,
  decimalPlaces?: number,
): string {
  const trimmed = value.trim();
  if (!trimmed || isFtrObservedFormula(trimmed)) return trimmed;
  const n = Number.parseFloat(trimmed);
  if (!Number.isFinite(n)) return trimmed;
  return n.toFixed(resolveObservedDecimals(decimalPlaces));
}

/** Observed values keyed by lowercase test name for formula references. */
export function buildFtrFormulaTestValues(rows: FtrTestRowStored[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of rows) {
    if (row.row_type !== "test") continue;
    const name = row.test_name.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    const raw = row.observed_value.trim();
    if (!raw || isFtrObservedFormula(raw)) {
      map.set(key, Number.NaN);
      continue;
    }
    const n = Number.parseFloat(raw);
    map.set(key, Number.isFinite(n) ? n : Number.NaN);
  }
  return map;
}

export function ftrFormulaTestNames(rows: FtrTestRowStored[]): string[] {
  return rows
    .filter((r) => r.row_type === "test" && r.test_name.trim())
    .map((r) => r.test_name.trim());
}

type Token =
  | { kind: "num"; value: number; pos: number }
  | { kind: "ident"; value: string; pos: number }
  | { kind: "str"; value: string; pos: number }
  | { kind: "op"; value: string; pos: number }
  | { kind: "lparen"; pos: number }
  | { kind: "rparen"; pos: number }
  | { kind: "comma"; pos: number };

class FormulaParser {
  private tokens: Token[] = [];
  private i = 0;

  constructor(
    input: string,
    private testValues: Map<string, number>,
  ) {
    this.tokens = tokenize(input);
  }

  parse(): number {
    const value = this.parseExpression();
    if (this.peek()?.kind !== undefined) {
      throw new Error("Unexpected characters after formula");
    }
    return value;
  }

  private peek(): Token | undefined {
    return this.tokens[this.i];
  }

  private consume(): Token {
    const t = this.tokens[this.i];
    if (!t) throw new Error("Unexpected end of formula");
    this.i += 1;
    return t;
  }

  private resolveTestRef(name: string, pos: number): number {
    const key = name.trim().toLowerCase();
    if (!key) throw new Error("Empty test name in formula");
    if (!this.testValues.has(key)) {
      throw new Error(
        `Unknown test "${name}". Use the exact test name, e.g. Carbon or [Carbon Equivalent].`,
      );
    }
    const value = this.testValues.get(key)!;
    if (!Number.isFinite(value)) {
      throw new Error(`Test "${name}" has no numeric observed value yet`);
    }
    return value;
  }

  private parseExpression(): number {
    let left = this.parseTerm();
    while (this.peek()?.kind === "op" && (this.peek() as Token & { value: string }).value.match(/^[+-]$/)) {
      const op = (this.consume() as Token & { value: string }).value;
      const right = this.parseTerm();
      left = op === "+" ? left + right : left - right;
    }
    return left;
  }

  private parseTerm(): number {
    let left = this.parsePower();
    while (this.peek()?.kind === "op" && (this.peek() as Token & { value: string }).value.match(/^[*\/]$/)) {
      const op = (this.consume() as Token & { value: string }).value;
      const right = this.parsePower();
      left = op === "*" ? left * right : left / right;
    }
    return left;
  }

  private parsePower(): number {
    let left = this.parseUnary();
    while (this.peek()?.kind === "op" && (this.peek() as Token & { value: string }).value === "^") {
      this.consume();
      const right = this.parseUnary();
      left = Math.pow(left, right);
    }
    return left;
  }

  private parseUnary(): number {
    if (this.peek()?.kind === "op" && (this.peek() as Token & { value: string }).value === "-") {
      this.consume();
      return -this.parseUnary();
    }
    if (this.peek()?.kind === "op" && (this.peek() as Token & { value: string }).value === "+") {
      this.consume();
      return this.parseUnary();
    }
    return this.parsePrimary();
  }

  private parsePrimary(): number {
    const t = this.peek();
    if (!t) throw new Error("Expected value");

    if (t.kind === "num") {
      this.consume();
      return t.value;
    }

    if (t.kind === "str") {
      this.consume();
      return this.resolveTestRef(t.value, t.pos);
    }

    if (t.kind === "ident") {
      const name = t.value;
      const upper = name.toUpperCase();
      if (this.peek()?.kind === "lparen" && FUNCTION_NAMES.has(upper)) {
        return this.parseFunctionCall();
      }
      this.consume();
      return this.resolveTestRef(name, t.pos);
    }

    if (t.kind === "lparen") {
      this.consume();
      const value = this.parseExpression();
      if (this.peek()?.kind !== "rparen") throw new Error("Missing closing parenthesis");
      this.consume();
      return value;
    }

    throw new Error(`Unexpected token at position ${t.pos + 1}`);
  }

  private parseFunctionCall(): number {
    const nameToken = this.consume() as Token & { value: string };
    const name = nameToken.value.toUpperCase();
    if (this.peek()?.kind !== "lparen") {
      return this.resolveTestRef(nameToken.value, nameToken.pos);
    }
    this.consume();
    const args: number[] = [];
    if (this.peek()?.kind !== "rparen") {
      args.push(this.parseExpression());
      while (this.peek()?.kind === "comma") {
        this.consume();
        args.push(this.parseExpression());
      }
    }
    if (this.peek()?.kind !== "rparen") throw new Error("Missing closing parenthesis in function");
    this.consume();
    return invokeFunction(name, args);
  }
}

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let pos = 0;

  while (pos < input.length) {
    const ch = input[pos];
    if (/\s/.test(ch)) {
      pos += 1;
      continue;
    }

    if (ch === '"' || ch === "'") {
      const quote = ch;
      pos += 1;
      const start = pos;
      while (pos < input.length && input[pos] !== quote) {
        pos += 1;
      }
      if (pos >= input.length) throw new Error("Unclosed quoted test name");
      tokens.push({ kind: "str", value: input.slice(start, pos), pos: start });
      pos += 1;
      continue;
    }

    if (ch === "[") {
      pos += 1;
      const start = pos;
      while (pos < input.length && input[pos] !== "]") {
        pos += 1;
      }
      if (pos >= input.length) throw new Error("Unclosed [test name]");
      tokens.push({ kind: "str", value: input.slice(start, pos).trim(), pos: start });
      pos += 1;
      continue;
    }

    if (/[0-9.]/.test(ch)) {
      const start = pos;
      let sawDot = false;
      while (pos < input.length && /[0-9.]/.test(input[pos])) {
        if (input[pos] === ".") {
          if (sawDot) break;
          sawDot = true;
        }
        pos += 1;
      }
      const raw = input.slice(start, pos);
      const value = Number.parseFloat(raw);
      if (!Number.isFinite(value)) throw new Error(`Invalid number "${raw}"`);
      tokens.push({ kind: "num", value, pos: start });
      continue;
    }

    if (/[A-Za-z_]/.test(ch)) {
      const start = pos;
      pos += 1;
      while (pos < input.length && /[A-Za-z0-9_]/.test(input[pos])) pos += 1;
      tokens.push({ kind: "ident", value: input.slice(start, pos), pos: start });
      continue;
    }

    if ("+-*/^(),".includes(ch)) {
      if (ch === "(") tokens.push({ kind: "lparen", pos });
      else if (ch === ")") tokens.push({ kind: "rparen", pos });
      else if (ch === ",") tokens.push({ kind: "comma", pos });
      else tokens.push({ kind: "op", value: ch, pos });
      pos += 1;
      continue;
    }

    throw new Error(`Invalid character "${ch}" at position ${pos + 1}`);
  }

  return tokens;
}

function invokeFunction(name: string, args: number[]): number {
  switch (name) {
    case "SUM":
      if (args.length === 0) throw new Error("SUM requires at least one value");
      return args.reduce((a, b) => a + b, 0);
    case "AVERAGE":
    case "AVG":
      if (args.length === 0) throw new Error("AVERAGE requires at least one value");
      return args.reduce((a, b) => a + b, 0) / args.length;
    case "MIN":
      if (args.length === 0) throw new Error("MIN requires at least one value");
      return Math.min(...args);
    case "MAX":
      if (args.length === 0) throw new Error("MAX requires at least one value");
      return Math.max(...args);
    case "ROUND": {
      if (args.length < 1) throw new Error("ROUND requires a value");
      const digits = args.length >= 2 ? Math.trunc(args[1]) : FTR_OBSERVED_DECIMAL_PLACES;
      const factor = 10 ** digits;
      return Math.round(args[0] * factor) / factor;
    }
    case "SQRT":
      if (args.length !== 1) throw new Error("SQRT requires one value");
      if (args[0] < 0) throw new Error("SQRT of negative number");
      return Math.sqrt(args[0]);
    case "ABS":
      if (args.length !== 1) throw new Error("ABS requires one value");
      return Math.abs(args[0]);
    case "POWER":
    case "POW":
      if (args.length !== 2) throw new Error("POWER requires two values");
      return Math.pow(args[0], args[1]);
    default:
      throw new Error(`Unknown function ${name}`);
  }
}

/** Evaluate =formula text (Excel-style subset). Returns formatted result string. */
export function evaluateFtrObservedFormula(
  raw: string,
  testValues: Map<string, number> = new Map(),
  decimalPlaces = FTR_OBSERVED_DECIMAL_PLACES,
): FtrFormulaResult {
  const trimmed = raw.trimStart();
  if (!trimmed.startsWith("=")) {
    return { ok: true, value: raw };
  }

  const body = trimmed.slice(1).trim();
  if (!body) {
    return { ok: false, error: "Formula is empty" };
  }

  try {
    const parser = new FormulaParser(body, testValues);
    const result = parser.parse();
    return { ok: true, value: formatNumericResult(result, decimalPlaces) };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid formula";
    return { ok: false, error: message };
  }
}
