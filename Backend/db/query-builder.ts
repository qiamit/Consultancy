import "server-only";
import { query } from "@backend/db/pool";

export type DbError = { message: string; code?: string; details?: string } | null;

export type DbResult<T = any> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: T;
  error: DbError;
  count?: number | null;
};

export type SelectOptions = {
  count?: "exact";
  head?: boolean;
};

export type UpsertOptions = {
  onConflict?: string;
};

type FilterOp =
  | { type: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "ilike"; column: string; value: unknown }
  | { type: "in"; column: string; value: unknown[] }
  | { type: "is"; column: string; value: null | boolean }
  | { type: "not"; column: string; operator: string; value: unknown }
  | { type: "or"; filter: string };

type OrderBy = { column: string; ascending: boolean; nullsFirst?: boolean };

type Action = "select" | "insert" | "update" | "delete" | "upsert";

type FkRelation = {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
};

type ParsedSelect = {
  columns: string[];
  embeds: { alias: string; columns: string }[];
};

const fkCache = new Map<string, FkRelation[]>();

function quoteIdent(ident: string): string {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(ident)) {
    throw new Error(`Invalid identifier: ${ident}`);
  }
  return `"${ident}"`;
}

function quoteQualified(table: string): string {
  return `public.${quoteIdent(table)}`;
}

export function parseSelectColumns(select?: string): ParsedSelect {
  if (!select || select.trim() === "" || select.trim() === "*") {
    return { columns: ["*"], embeds: [] };
  }

  const columns: string[] = [];
  const embeds: { alias: string; columns: string }[] = [];
  let buf = "";
  let depth = 0;

  const flush = () => {
    const part = buf.trim();
    buf = "";
    if (!part) return;
    const embedMatch = /^([a-zA-Z_][a-zA-Z0-9_]*)\(([\s\S]*)\)$/.exec(part);
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

  if (columns.length === 0 && embeds.length > 0) {
    columns.push("*");
  }
  return { columns: columns.length ? columns : ["*"], embeds };
}

function parseInList(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw !== "string") return [raw];
  const trimmed = raw.trim();
  if (trimmed.startsWith("(") && trimmed.endsWith(")")) {
    const inner = trimmed.slice(1, -1).trim();
    if (!inner) return [];
    return inner.split(",").map((s) => {
      const v = s.trim();
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        return v.slice(1, -1);
      }
      return v;
    });
  }
  return [trimmed];
}

/** Parse simple `.or()` clauses: `status.is.null,status.eq.in_progress`. */
export function parseOrFilter(
  filter: string,
  startIndex: number,
): { sql: string; params: unknown[]; nextIndex: number } {
  const parts: string[] = [];
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

  const params: unknown[] = [];
  const clauses: string[] = [];
  let idx = startIndex;

  for (const part of parts) {
    if (!part) continue;
    const isNull = /^([a-zA-Z_][a-zA-Z0-9_]*)\.is\.null$/i.exec(part);
    if (isNull) {
      clauses.push(`${quoteIdent(isNull[1])} is null`);
      continue;
    }
    const isTrue = /^([a-zA-Z_][a-zA-Z0-9_]*)\.is\.true$/i.exec(part);
    if (isTrue) {
      clauses.push(`${quoteIdent(isTrue[1])} is true`);
      continue;
    }
    const isFalse = /^([a-zA-Z_][a-zA-Z0-9_]*)\.is\.false$/i.exec(part);
    if (isFalse) {
      clauses.push(`${quoteIdent(isFalse[1])} is false`);
      continue;
    }
    const eq = /^([a-zA-Z_][a-zA-Z0-9_]*)\.eq\.(.+)$/i.exec(part);
    if (eq) {
      idx += 1;
      params.push(eq[2]);
      clauses.push(`${quoteIdent(eq[1])} = $${idx}`);
      continue;
    }
    const neq = /^([a-zA-Z_][a-zA-Z0-9_]*)\.neq\.(.+)$/i.exec(part);
    if (neq) {
      idx += 1;
      params.push(neq[2]);
      clauses.push(`${quoteIdent(neq[1])} <> $${idx}`);
      continue;
    }
    const ilike = /^([a-zA-Z_][a-zA-Z0-9_]*)\.ilike\.(.+)$/i.exec(part);
    if (ilike) {
      idx += 1;
      params.push(ilike[2]);
      clauses.push(`${quoteIdent(ilike[1])} ilike $${idx}`);
      continue;
    }
    const gte = /^([a-zA-Z_][a-zA-Z0-9_]*)\.gte\.(.+)$/i.exec(part);
    if (gte) {
      idx += 1;
      params.push(gte[2]);
      clauses.push(`${quoteIdent(gte[1])} >= $${idx}`);
      continue;
    }
    const lte = /^([a-zA-Z_][a-zA-Z0-9_]*)\.lte\.(.+)$/i.exec(part);
    if (lte) {
      idx += 1;
      params.push(lte[2]);
      clauses.push(`${quoteIdent(lte[1])} <= $${idx}`);
      continue;
    }
    const gt = /^([a-zA-Z_][a-zA-Z0-9_]*)\.gt\.(.+)$/i.exec(part);
    if (gt) {
      idx += 1;
      params.push(gt[2]);
      clauses.push(`${quoteIdent(gt[1])} > $${idx}`);
      continue;
    }
    const lt = /^([a-zA-Z_][a-zA-Z0-9_]*)\.lt\.(.+)$/i.exec(part);
    if (lt) {
      idx += 1;
      params.push(lt[2]);
      clauses.push(`${quoteIdent(lt[1])} < $${idx}`);
      continue;
    }
    throw new Error(`Unsupported or-filter clause: ${part}`);
  }

  return {
    sql: clauses.length ? `(${clauses.join(" or ")})` : "true",
    params,
    nextIndex: idx,
  };
}

function buildWhere(
  filters: FilterOp[],
  startIndex = 0,
): { sql: string; params: unknown[]; nextIndex: number } {
  const params: unknown[] = [];
  const clauses: string[] = [];
  let idx = startIndex;

  for (const f of filters) {
    if (f.type === "or") {
      const parsed = parseOrFilter(f.filter, idx);
      clauses.push(parsed.sql);
      params.push(...parsed.params);
      idx = parsed.nextIndex;
      continue;
    }
    if (f.type === "is") {
      if (f.value === null) {
        clauses.push(`${quoteIdent(f.column)} is null`);
      } else if (f.value === true) {
        clauses.push(`${quoteIdent(f.column)} is true`);
      } else {
        clauses.push(`${quoteIdent(f.column)} is false`);
      }
      continue;
    }
    if (f.type === "not") {
      const op = f.operator.toLowerCase();
      if (op === "is" && (f.value === null || f.value === "null")) {
        clauses.push(`${quoteIdent(f.column)} is not null`);
        continue;
      }
      if (op === "in") {
        const list = parseInList(f.value);
        if (list.length === 0) {
          clauses.push("true");
          continue;
        }
        const placeholders: string[] = [];
        for (const v of list) {
          idx += 1;
          params.push(v);
          placeholders.push(`$${idx}`);
        }
        clauses.push(`${quoteIdent(f.column)} not in (${placeholders.join(", ")})`);
        continue;
      }
      idx += 1;
      params.push(f.value);
      if (op === "eq") clauses.push(`${quoteIdent(f.column)} <> $${idx}`);
      else if (op === "neq") clauses.push(`${quoteIdent(f.column)} = $${idx}`);
      else if (op === "ilike") clauses.push(`${quoteIdent(f.column)} not ilike $${idx}`);
      else throw new Error(`Unsupported .not() operator: ${f.operator}`);
      continue;
    }
    if (f.type === "in") {
      const list = f.value;
      if (list.length === 0) {
        clauses.push("false");
        continue;
      }
      const placeholders: string[] = [];
      for (const v of list) {
        idx += 1;
        params.push(v);
        placeholders.push(`$${idx}`);
      }
      clauses.push(`${quoteIdent(f.column)} in (${placeholders.join(", ")})`);
      continue;
    }

    idx += 1;
    params.push(f.value);
    const col = quoteIdent(f.column);
    if (f.type === "eq") clauses.push(`${col} = $${idx}`);
    else if (f.type === "neq") clauses.push(`${col} <> $${idx}`);
    else if (f.type === "gt") clauses.push(`${col} > $${idx}`);
    else if (f.type === "gte") clauses.push(`${col} >= $${idx}`);
    else if (f.type === "lt") clauses.push(`${col} < $${idx}`);
    else if (f.type === "lte") clauses.push(`${col} <= $${idx}`);
    else if (f.type === "ilike") clauses.push(`${col} ilike $${idx}`);
  }

  return {
    sql: clauses.length ? clauses.join(" and ") : "true",
    params,
    nextIndex: idx,
  };
}

async function loadForeignKeys(table: string): Promise<FkRelation[]> {
  const cached = fkCache.get(table);
  if (cached) return cached;

  const { rows } = await query<{
    from_table: string;
    from_column: string;
    to_table: string;
    to_column: string;
  }>(
    `select
       tc.table_name as from_table,
       kcu.column_name as from_column,
       ccu.table_name as to_table,
       ccu.column_name as to_column
     from information_schema.table_constraints tc
     join information_schema.key_column_usage kcu
       on tc.constraint_name = kcu.constraint_name
      and tc.table_schema = kcu.table_schema
     join information_schema.constraint_column_usage ccu
       on ccu.constraint_name = tc.constraint_name
      and ccu.table_schema = tc.table_schema
     where tc.constraint_type = 'foreign key'
       and tc.table_schema = 'public'
       and (tc.table_name = $1 or ccu.table_name = $1)`,
    [table],
  );

  const relations = rows.map((r) => ({
    fromTable: r.from_table,
    fromColumn: r.from_column,
    toTable: r.to_table,
    toColumn: r.to_column,
  }));
  fkCache.set(table, relations);
  return relations;
}

function selectColumnSql(columns: string[]): string {
  if (columns.length === 1 && columns[0] === "*") return "*";
  return columns
    .map((c) => {
      if (c === "*") return "*";
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(c)) {
        throw new Error(`Invalid select column: ${c}`);
      }
      return quoteIdent(c);
    })
    .join(", ");
}

async function nestEmbeds(
  table: string,
  rows: Record<string, unknown>[],
  embeds: { alias: string; columns: string }[],
): Promise<Record<string, unknown>[]> {
  if (!embeds.length || rows.length === 0) return rows;

  const fks = await loadForeignKeys(table);
  const result = rows.map((r) => ({ ...r }));

  for (const embed of embeds) {
    const m2oFk = fks.find(
      (fk) => fk.fromTable === table && fk.toTable === embed.alias,
    );
    // Fallback when FK metadata is missing: clients -> client_id, is_codes -> is_code_id
    const inferredFrom =
      !m2oFk && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(embed.alias)
        ? `${embed.alias.replace(/s$/, "")}_id`
        : null;
    const m2o = m2oFk
      ? { fromColumn: m2oFk.fromColumn, toColumn: m2oFk.toColumn }
      : inferredFrom &&
          result.some((r) => Object.prototype.hasOwnProperty.call(r, inferredFrom))
        ? { fromColumn: inferredFrom, toColumn: "id" }
        : null;

    const o2m = fks.find(
      (fk) => fk.fromTable === embed.alias && fk.toTable === table,
    );

    const embedParsed = parseSelectColumns(embed.columns);
    const colSql = selectColumnSql(embedParsed.columns);

    if (m2o) {
      const ids = [
        ...new Set(
          result
            .map((r) => r[m2o.fromColumn])
            .filter((v) => v !== null && v !== undefined)
            .map((v) => String(v)),
        ),
      ];
      const byId = new Map<string, Record<string, unknown>>();
      if (ids.length > 0) {
        const placeholders = ids.map((_, i) => `$${i + 1}`).join(", ");
        // Always fetch the join key so lookups work even when callers omit it
        // (e.g. clients(name, company_name) without id).
        const needsJoinKey =
          colSql !== "*" &&
          !embedParsed.columns.includes(m2o.toColumn) &&
          !embedParsed.columns.includes("*");
        const selectSql = needsJoinKey
          ? `${quoteIdent(m2o.toColumn)}, ${colSql}`
          : colSql;
        const { rows: related } = await query<Record<string, unknown>>(
          `select ${selectSql} from ${quoteQualified(embed.alias)}
           where ${quoteIdent(m2o.toColumn)} in (${placeholders})`,
          ids,
        );
        for (const row of related) {
          byId.set(String(row[m2o.toColumn]), row);
        }
      }
      for (const row of result) {
        const key = row[m2o.fromColumn];
        row[embed.alias] =
          key == null ? null : (byId.get(String(key)) ?? null);
      }
      continue;
    }

    if (o2m) {
      const parentIds = [
        ...new Set(
          result
            .map((r) => r[o2m.toColumn] ?? r.id)
            .filter((v) => v !== null && v !== undefined),
        ),
      ];
      const byParent = new Map<unknown, Record<string, unknown>[]>();
      if (parentIds.length > 0) {
        const placeholders = parentIds.map((_, i) => `$${i + 1}`).join(", ");
        const { rows: related } = await query<Record<string, unknown>>(
          `select ${colSql} from ${quoteQualified(embed.alias)}
           where ${quoteIdent(o2m.fromColumn)} in (${placeholders})`,
          parentIds,
        );
        for (const row of related) {
          const key = row[o2m.fromColumn];
          const list = byParent.get(key) ?? [];
          list.push(row);
          byParent.set(key, list);
        }
      }
      for (const row of result) {
        const key = row[o2m.toColumn] ?? row.id;
        row[embed.alias] = byParent.get(key) ?? [];
      }
      continue;
    }

    for (const row of result) {
      row[embed.alias] = null;
    }
  }

  return result;
}

export type SerializedQuery = {
  table: string;
  action: Action;
  selectColumns?: string;
  selectOpts?: SelectOptions;
  filters: FilterOp[];
  order: OrderBy[];
  limit?: number;
  single?: boolean;
  maybeSingle?: boolean;
  payload?: unknown;
  upsertOpts?: UpsertOptions;
  returningSelect?: string;
};

/** Default TData is any[] so list-query .map/.find callbacks get contextual types. */
export class QueryBuilder<TData = any[]> implements PromiseLike<DbResult<TData>> {
  private table: string;
  private action: Action = "select";
  private selectColumns?: string;
  private selectOpts?: SelectOptions;
  private filters: FilterOp[] = [];
  private orderBy: OrderBy[] = [];
  private limitN?: number;
  private wantSingle = false;
  private wantMaybeSingle = false;
  private payload?: unknown;
  private upsertOpts?: UpsertOptions;
  private returningSelect?: string;

  constructor(table: string) {
    this.table = table;
  }

  static fromSerialized(serialized: SerializedQuery): QueryBuilder {
    const qb = new QueryBuilder(serialized.table);
    qb.action = serialized.action;
    qb.selectColumns = serialized.selectColumns;
    qb.selectOpts = serialized.selectOpts;
    qb.filters = serialized.filters ?? [];
    qb.orderBy = serialized.order ?? [];
    qb.limitN = serialized.limit;
    qb.wantSingle = Boolean(serialized.single);
    qb.wantMaybeSingle = Boolean(serialized.maybeSingle);
    qb.payload = serialized.payload;
    qb.upsertOpts = serialized.upsertOpts;
    qb.returningSelect = serialized.returningSelect;
    return qb;
  }

  toJSON(): SerializedQuery {
    return {
      table: this.table,
      action: this.action,
      selectColumns: this.selectColumns,
      selectOpts: this.selectOpts,
      filters: this.filters,
      order: this.orderBy,
      limit: this.limitN,
      single: this.wantSingle,
      maybeSingle: this.wantMaybeSingle,
      payload: this.payload,
      upsertOpts: this.upsertOpts,
      returningSelect: this.returningSelect,
    };
  }

  select(columns?: string, opts?: SelectOptions): this {
    if (this.action === "insert" || this.action === "update" || this.action === "upsert" || this.action === "delete") {
      this.returningSelect = columns ?? "*";
      return this;
    }
    this.action = "select";
    this.selectColumns = columns ?? "*";
    this.selectOpts = opts;
    return this;
  }

  insert(row: Record<string, unknown> | Record<string, unknown>[]): this {
    this.action = "insert";
    this.payload = row;
    return this;
  }

  update(patch: Record<string, unknown>): this {
    this.action = "update";
    this.payload = patch;
    return this;
  }

  delete(): this {
    this.action = "delete";
    return this;
  }

  upsert(
    row: Record<string, unknown> | Record<string, unknown>[],
    opts?: UpsertOptions,
  ): this {
    this.action = "upsert";
    this.payload = row;
    this.upsertOpts = opts;
    return this;
  }

  eq(column: string, value: unknown): this {
    this.filters.push({ type: "eq", column, value });
    return this;
  }

  neq(column: string, value: unknown): this {
    this.filters.push({ type: "neq", column, value });
    return this;
  }

  gt(column: string, value: unknown): this {
    this.filters.push({ type: "gt", column, value });
    return this;
  }

  gte(column: string, value: unknown): this {
    this.filters.push({ type: "gte", column, value });
    return this;
  }

  lt(column: string, value: unknown): this {
    this.filters.push({ type: "lt", column, value });
    return this;
  }

  lte(column: string, value: unknown): this {
    this.filters.push({ type: "lte", column, value });
    return this;
  }

  ilike(column: string, pattern: string): this {
    this.filters.push({ type: "ilike", column, value: pattern });
    return this;
  }

  in(column: string, values: unknown[]): this {
    this.filters.push({ type: "in", column, value: values });
    return this;
  }

  is(column: string, value: null | boolean): this {
    this.filters.push({ type: "is", column, value });
    return this;
  }

  not(column: string, operator: string, value: unknown): this {
    this.filters.push({ type: "not", column, operator, value });
    return this;
  }

  or(filter: string): this {
    this.filters.push({ type: "or", filter });
    return this;
  }

  order(
    column: string,
    opts?: { ascending?: boolean; nullsFirst?: boolean },
  ): this {
    this.orderBy.push({
      column,
      ascending: opts?.ascending !== false,
      nullsFirst: opts?.nullsFirst,
    });
    return this;
  }

  limit(n: number): this {
    this.limitN = n;
    return this;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  single(): QueryBuilder<any> {
    this.wantSingle = true;
    this.wantMaybeSingle = false;
    return this as unknown as QueryBuilder<any>;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  maybeSingle(): QueryBuilder<any> {
    this.wantMaybeSingle = true;
    this.wantSingle = false;
    return this as unknown as QueryBuilder<any>;
  }

  then<TResult1 = DbResult<TData>, TResult2 = never>(
    onfulfilled?:
      | ((value: DbResult<TData>) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(
      onfulfilled as ((value: DbResult) => TResult1 | PromiseLike<TResult1>) | null | undefined,
      onrejected,
    );
  }

  private async execute(): Promise<DbResult> {
    try {
      if (this.action === "select") return this.executeSelect();
      if (this.action === "insert") return this.executeInsert();
      if (this.action === "update") return this.executeUpdate();
      if (this.action === "delete") return this.executeDelete();
      if (this.action === "upsert") return this.executeUpsert();
      return { data: null, error: { message: `Unknown action: ${this.action}` } };
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      const code =
        e && typeof e === "object" && "code" in e
          ? String((e as { code: unknown }).code)
          : undefined;
      return { data: null, error: { message, code } };
    }
  }

  private finalizeRows(rows: Record<string, unknown>[]): DbResult {
    if (this.wantSingle) {
      if (rows.length === 0) {
        return {
          data: null,
          error: {
            message: "JSON object requested, multiple (or no) rows returned",
            code: "PGRST116",
          },
        };
      }
      if (rows.length > 1) {
        return {
          data: null,
          error: {
            message: "JSON object requested, multiple (or no) rows returned",
            code: "PGRST116",
          },
        };
      }
      return { data: rows[0], error: null };
    }
    if (this.wantMaybeSingle) {
      if (rows.length > 1) {
        return {
          data: null,
          error: {
            message: "JSON object requested, multiple (or no) rows returned",
            code: "PGRST116",
          },
        };
      }
      return { data: rows[0] ?? null, error: null };
    }
    return { data: rows, error: null };
  }

  private async executeSelect(): Promise<DbResult> {
    const parsed = parseSelectColumns(this.selectColumns);
    const where = buildWhere(this.filters);
    const whereSql = where.sql === "true" ? "" : ` where ${where.sql}`;

    let count: number | null | undefined;
    if (this.selectOpts?.count === "exact") {
      const countRes = await query<{ count: string }>(
        `select count(*)::text as count from ${quoteQualified(this.table)}${whereSql}`,
        where.params,
      );
      count = Number(countRes.rows[0]?.count ?? 0);
      if (this.selectOpts.head) {
        return { data: null, error: null, count };
      }
    }

    const orderSql = this.orderBy.length
      ? ` order by ${this.orderBy
          .map((o) => {
            const dir = o.ascending ? "asc" : "desc";
            const nulls =
              o.nullsFirst === true
                ? " nulls first"
                : o.nullsFirst === false
                  ? " nulls last"
                  : "";
            return `${quoteIdent(o.column)} ${dir}${nulls}`;
          })
          .join(", ")}`
      : "";
    const limitSql =
      this.limitN != null
        ? ` limit ${Number(this.limitN)}`
        : this.wantSingle || this.wantMaybeSingle
          ? " limit 2"
          : "";

    const colSql = selectColumnSql(parsed.columns);
    const { rows } = await query<Record<string, unknown>>(
      `select ${colSql} from ${quoteQualified(this.table)}${whereSql}${orderSql}${limitSql}`,
      where.params,
    );

    const nested = await nestEmbeds(this.table, rows, parsed.embeds);
    const result = this.finalizeRows(nested);
    if (count !== undefined) result.count = count;
    return result;
  }

  private returningSql(): { sql: string; embeds: { alias: string; columns: string }[] } {
    if (!this.returningSelect) return { sql: "", embeds: [] };
    const parsed = parseSelectColumns(this.returningSelect);
    return {
      sql: ` returning ${selectColumnSql(parsed.columns)}`,
      embeds: parsed.embeds,
    };
  }

  private async executeInsert(): Promise<DbResult> {
    const rows = Array.isArray(this.payload)
      ? (this.payload as Record<string, unknown>[])
      : [this.payload as Record<string, unknown>];
    if (rows.length === 0) return { data: [], error: null };

    const keys = Object.keys(rows[0]);
    if (keys.length === 0) {
      return { data: null, error: { message: "Insert payload is empty." } };
    }

    const params: unknown[] = [];
    const valueGroups: string[] = [];
    let idx = 0;
    for (const row of rows) {
      const placeholders: string[] = [];
      for (const key of keys) {
        idx += 1;
        params.push(row[key] === undefined ? null : row[key]);
        placeholders.push(`$${idx}`);
      }
      valueGroups.push(`(${placeholders.join(", ")})`);
    }

    const ret = this.returningSql();
    const sql = `insert into ${quoteQualified(this.table)} (${keys
      .map(quoteIdent)
      .join(", ")}) values ${valueGroups.join(", ")}${ret.sql}`;
    const { rows: out } = await query<Record<string, unknown>>(sql, params);
    if (!this.returningSelect) {
      return { data: null, error: null };
    }
    const nested = await nestEmbeds(this.table, out, ret.embeds);
    return this.finalizeRows(nested);
  }

  private async executeUpdate(): Promise<DbResult> {
    const patch = (this.payload ?? {}) as Record<string, unknown>;
    const keys = Object.keys(patch);
    if (keys.length === 0) {
      return { data: null, error: { message: "Update payload is empty." } };
    }

    const params: unknown[] = [];
    const sets: string[] = [];
    let idx = 0;
    for (const key of keys) {
      idx += 1;
      params.push(patch[key] === undefined ? null : patch[key]);
      sets.push(`${quoteIdent(key)} = $${idx}`);
    }

    const where = buildWhere(this.filters, idx);
    params.push(...where.params);
    const whereSql = where.sql === "true" ? "" : ` where ${where.sql}`;
    const ret = this.returningSql();
    const sql = `update ${quoteQualified(this.table)} set ${sets.join(", ")}${whereSql}${ret.sql}`;
    const { rows: out } = await query<Record<string, unknown>>(sql, params);
    if (!this.returningSelect) return { data: null, error: null };
    const nested = await nestEmbeds(this.table, out, ret.embeds);
    return this.finalizeRows(nested);
  }

  private async executeDelete(): Promise<DbResult> {
    const where = buildWhere(this.filters);
    const whereSql = where.sql === "true" ? "" : ` where ${where.sql}`;
    const ret = this.returningSql();
    const sql = `delete from ${quoteQualified(this.table)}${whereSql}${ret.sql}`;
    const { rows: out } = await query<Record<string, unknown>>(sql, where.params);
    if (!this.returningSelect) return { data: null, error: null };
    const nested = await nestEmbeds(this.table, out, ret.embeds);
    return this.finalizeRows(nested);
  }

  private async executeUpsert(): Promise<DbResult> {
    const rows = Array.isArray(this.payload)
      ? (this.payload as Record<string, unknown>[])
      : [this.payload as Record<string, unknown>];
    if (rows.length === 0) return { data: [], error: null };

    const keys = Object.keys(rows[0]);
    if (keys.length === 0) {
      return { data: null, error: { message: "Upsert payload is empty." } };
    }

    const conflictCols = (this.upsertOpts?.onConflict ?? keys[0])
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);
    if (conflictCols.length === 0) {
      return { data: null, error: { message: "Upsert onConflict is required." } };
    }

    const params: unknown[] = [];
    const valueGroups: string[] = [];
    let idx = 0;
    for (const row of rows) {
      const placeholders: string[] = [];
      for (const key of keys) {
        idx += 1;
        params.push(row[key] === undefined ? null : row[key]);
        placeholders.push(`$${idx}`);
      }
      valueGroups.push(`(${placeholders.join(", ")})`);
    }

    const updateKeys = keys.filter((k) => !conflictCols.includes(k));
    const setSql =
      updateKeys.length > 0
        ? updateKeys
            .map((k) => `${quoteIdent(k)} = excluded.${quoteIdent(k)}`)
            .join(", ")
        : conflictCols
            .map((k) => `${quoteIdent(k)} = excluded.${quoteIdent(k)}`)
            .join(", ");

    const ret = this.returningSql();
    const sql = `insert into ${quoteQualified(this.table)} (${keys
      .map(quoteIdent)
      .join(", ")}) values ${valueGroups.join(", ")}
      on conflict (${conflictCols.map(quoteIdent).join(", ")})
      do update set ${setSql}${ret.sql}`;
    const { rows: out } = await query<Record<string, unknown>>(sql, params);
    if (!this.returningSelect) return { data: null, error: null };
    const nested = await nestEmbeds(this.table, out, ret.embeds);
    return this.finalizeRows(nested);
  }
}

export function from(table: string): QueryBuilder {
  return new QueryBuilder(table);
}
