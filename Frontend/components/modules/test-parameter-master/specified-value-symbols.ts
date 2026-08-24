export type SymbolEntry = {
  char: string;
  group: string;
  tags?: string[];
};

export type SymbolGroup = {
  label: string;
  symbols: string[];
};

function latinUpper(): SymbolEntry[] {
  return "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((char) => ({
    char,
    group: "Uppercase",
    tags: ["letter", "latin", char.toLowerCase()],
  }));
}

function latinLower(): SymbolEntry[] {
  return "abcdefghijklmnopqrstuvwxyz".split("").map((char) => ({
    char,
    group: "Lowercase",
    tags: ["letter", "latin", char],
  }));
}

function greekLower(): SymbolEntry[] {
  return "αβγδεζηθικλμνξοπρστυφχψω".split("").map((char) => ({
    char,
    group: "Greek lowercase",
    tags: ["greek", char],
  }));
}

function greekUpper(): SymbolEntry[] {
  return "ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ".split("").map((char) => ({
    char,
    group: "Greek uppercase",
    tags: ["greek", char],
  }));
}

function subscriptDigits(): SymbolEntry[] {
  return "₀₁₂₃₄₅₆₇₈₉".split("").map((char, i) => ({
    char,
    group: "Subscript",
    tags: ["subscript", String(i)],
  }));
}

function superscriptChars(): SymbolEntry[] {
  return "⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾".split("").map((char) => ({
    char,
    group: "Superscript",
    tags: ["superscript"],
  }));
}

export const SPECIFIED_VALUE_SYMBOLS: SymbolEntry[] = [
  { char: "≤", group: "Comparison", tags: ["less", "equal", "lte", "maximum"] },
  { char: "≥", group: "Comparison", tags: ["greater", "equal", "gte", "minimum"] },
  { char: "<", group: "Comparison", tags: ["less", "lt"] },
  { char: ">", group: "Comparison", tags: ["greater", "gt"] },
  { char: "±", group: "Comparison", tags: ["plus", "minus", "tolerance"] },
  { char: "≈", group: "Comparison", tags: ["approx", "approximately"] },
  { char: "≠", group: "Comparison", tags: ["not", "equal"] },
  { char: "=", group: "Comparison", tags: ["equal"] },
  { char: "∝", group: "Comparison", tags: ["proportional"] },
  { char: "∴", group: "Comparison", tags: ["therefore"] },
  { char: "∵", group: "Comparison", tags: ["because"] },

  { char: "°", group: "Units & math", tags: ["degree", "celsius"] },
  { char: "℃", group: "Units & math", tags: ["celsius", "degree"] },
  { char: "℉", group: "Units & math", tags: ["fahrenheit"] },
  { char: "%", group: "Units & math", tags: ["percent"] },
  { char: "‰", group: "Units & math", tags: ["permille"] },
  { char: "µ", group: "Units & math", tags: ["micro", "mu"] },
  { char: "×", group: "Units & math", tags: ["multiply", "times"] },
  { char: "÷", group: "Units & math", tags: ["divide"] },
  { char: "·", group: "Units & math", tags: ["dot", "middle"] },
  { char: "√", group: "Units & math", tags: ["root", "sqrt"] },
  { char: "∞", group: "Units & math", tags: ["infinity"] },
  { char: "∑", group: "Units & math", tags: ["sum", "sigma"] },
  { char: "∫", group: "Units & math", tags: ["integral"] },
  { char: "∂", group: "Units & math", tags: ["partial"] },
  { char: "π", group: "Units & math", tags: ["pi"] },
  { char: "Δ", group: "Units & math", tags: ["delta", "change"] },
  { char: "₹", group: "Units & math", tags: ["rupee", "inr"] },

  { char: "½", group: "Fractions & powers", tags: ["half", "fraction"] },
  { char: "¼", group: "Fractions & powers", tags: ["quarter", "fraction"] },
  { char: "¾", group: "Fractions & powers", tags: ["three", "quarter"] },
  { char: "⅓", group: "Fractions & powers", tags: ["third"] },
  { char: "⅔", group: "Fractions & powers", tags: ["two", "third"] },
  { char: "²", group: "Fractions & powers", tags: ["square", "power", "superscript"] },
  { char: "³", group: "Fractions & powers", tags: ["cube", "power"] },
  { char: "⁻¹", group: "Fractions & powers", tags: ["inverse", "power"] },
  { char: "⁻²", group: "Fractions & powers", tags: ["inverse", "square"] },

  ...greekLower(),
  ...greekUpper(),
  ...latinUpper(),
  ...latinLower(),
  ...subscriptDigits(),
  ...superscriptChars(),

  { char: "←", group: "Arrows", tags: ["left"] },
  { char: "→", group: "Arrows", tags: ["right"] },
  { char: "↑", group: "Arrows", tags: ["up"] },
  { char: "↓", group: "Arrows", tags: ["down"] },
  { char: "↔", group: "Arrows", tags: ["left", "right"] },
  { char: "⇒", group: "Arrows", tags: ["implies"] },

  { char: "∧", group: "Logic & sets", tags: ["and"] },
  { char: "∨", group: "Logic & sets", tags: ["or"] },
  { char: "¬", group: "Logic & sets", tags: ["not"] },
  { char: "∈", group: "Logic & sets", tags: ["element", "in"] },
  { char: "∉", group: "Logic & sets", tags: ["not", "element"] },
  { char: "⊂", group: "Logic & sets", tags: ["subset"] },
  { char: "⊃", group: "Logic & sets", tags: ["superset"] },
  { char: "∪", group: "Logic & sets", tags: ["union"] },
  { char: "∩", group: "Logic & sets", tags: ["intersection"] },
  { char: "∅", group: "Logic & sets", tags: ["empty", "null"] },

  { char: "—", group: "Punctuation", tags: ["em", "dash"] },
  { char: "–", group: "Punctuation", tags: ["en", "dash"] },
  { char: "-", group: "Punctuation", tags: ["hyphen", "minus"] },
  { char: "(", group: "Punctuation", tags: ["parenthesis", "bracket"] },
  { char: ")", group: "Punctuation", tags: ["parenthesis", "bracket"] },
  { char: "[", group: "Punctuation", tags: ["bracket"] },
  { char: "]", group: "Punctuation", tags: ["bracket"] },
  { char: "{", group: "Punctuation", tags: ["brace"] },
  { char: "}", group: "Punctuation", tags: ["brace"] },
  { char: ",", group: "Punctuation", tags: ["comma"] },
  { char: ";", group: "Punctuation", tags: ["semicolon"] },
  { char: ":", group: "Punctuation", tags: ["colon"] },
  { char: "'", group: "Punctuation", tags: ["quote", "prime"] },
  { char: "\"", group: "Punctuation", tags: ["quote"] },
  { char: "/", group: "Punctuation", tags: ["slash"] },
  { char: "\\", group: "Punctuation", tags: ["backslash"] },
  { char: "@", group: "Punctuation", tags: ["at"] },
  { char: "#", group: "Punctuation", tags: ["hash", "number"] },
  { char: "&", group: "Punctuation", tags: ["and", "ampersand"] },
];

const GROUP_ORDER = [
  "Comparison",
  "Units & math",
  "Fractions & powers",
  "Greek lowercase",
  "Greek uppercase",
  "Uppercase",
  "Lowercase",
  "Subscript",
  "Superscript",
  "Arrows",
  "Logic & sets",
  "Punctuation",
] as const;

export function groupSymbolEntries(entries: SymbolEntry[]): SymbolGroup[] {
  const byGroup = new Map<string, string[]>();
  for (const entry of entries) {
    const list = byGroup.get(entry.group) ?? [];
    if (!list.includes(entry.char)) list.push(entry.char);
    byGroup.set(entry.group, list);
  }

  const ordered: SymbolGroup[] = [];
  for (const label of GROUP_ORDER) {
    const symbols = byGroup.get(label);
    if (symbols?.length) ordered.push({ label, symbols });
  }
  for (const [label, symbols] of byGroup) {
    if (!GROUP_ORDER.includes(label as (typeof GROUP_ORDER)[number])) {
      ordered.push({ label, symbols });
    }
  }
  return ordered;
}

export function filterSymbolEntries(
  entries: SymbolEntry[],
  query: string,
): SymbolEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return entries;

  return entries.filter((entry) => {
    if (entry.char.toLowerCase().includes(q)) return true;
    if (entry.group.toLowerCase().includes(q)) return true;
    return entry.tags?.some((tag) => tag.toLowerCase().includes(q)) ?? false;
  });
}

export const SPECIFIED_VALUE_SYMBOL_GROUPS: SymbolGroup[] =
  groupSymbolEntries(SPECIFIED_VALUE_SYMBOLS);

export const RECENT_SYMBOLS_STORAGE_KEY =
  "qe.test_parameter.recent_symbols";

export const MAX_RECENT_SYMBOLS = 14;

export function loadRecentSymbols(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_SYMBOLS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((s): s is string => typeof s === "string")
      .slice(0, MAX_RECENT_SYMBOLS);
  } catch {
    return [];
  }
}

export function saveRecentSymbol(symbol: string): string[] {
  const next = [
    symbol,
    ...loadRecentSymbols().filter((s) => s !== symbol),
  ].slice(0, MAX_RECENT_SYMBOLS);
  try {
    window.localStorage.setItem(RECENT_SYMBOLS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore quota errors
  }
  return next;
}
