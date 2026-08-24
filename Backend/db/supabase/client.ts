type FilterOp =
  | { type: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "ilike"; column: string; value: unknown }
  | { type: "in"; column: string; value: unknown[] }
  | { type: "is"; column: string; value: null | boolean }
  | { type: "not"; column: string; operator: string; value: unknown }
  | { type: "or"; filter: string };

type OrderBy = { column: string; ascending: boolean; nullsFirst?: boolean };

type Action = "select" | "insert" | "update" | "delete" | "upsert";

type SelectOptions = { count?: "exact"; head?: boolean };
type UpsertOptions = { onConflict?: string };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DbResult<TData = any[]> = {
  data: TData;
  error: { message: string; code?: string } | null;
  count?: number | null;
};

type SerializedQuery = {
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
class BrowserQueryBuilder<TData = any[]> implements PromiseLike<DbResult<TData>> {
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

  select(columns?: string, opts?: SelectOptions): this {
    if (
      this.action === "insert" ||
      this.action === "update" ||
      this.action === "upsert" ||
      this.action === "delete"
    ) {
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
  single(): BrowserQueryBuilder<any> {
    this.wantSingle = true;
    this.wantMaybeSingle = false;
    return this as unknown as BrowserQueryBuilder<any>;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  maybeSingle(): BrowserQueryBuilder<any> {
    this.wantMaybeSingle = true;
    this.wantSingle = false;
    return this as unknown as BrowserQueryBuilder<any>;
  }

  private serialize(): SerializedQuery {
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

  private async execute(): Promise<DbResult<any>> {
    const res = await fetch("/api/db", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(this.serialize()),
    });
    const json = (await res.json()) as DbResult<any>;
    if (!res.ok && !json?.error) {
      return {
        data: null,
        error: { message: `DB request failed (${res.status})` },
      };
    }
    return json;
  }

  then<TResult1 = DbResult<TData>, TResult2 = never>(
    onfulfilled?:
      | ((value: DbResult<TData>) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(
      onfulfilled as
        | ((value: DbResult<any>) => TResult1 | PromiseLike<TResult1>)
        | null
        | undefined,
      onrejected,
    );
  }
}

function createBrowserStorageBucket(bucket: string) {
  return {
    async upload(
      path: string,
      file: Blob | File | ArrayBuffer | Uint8Array | string,
      opts?: { upsert?: boolean; contentType?: string },
    ) {
      try {
        const form = new FormData();
        form.set("bucket", bucket);
        form.set("path", path);
        form.set("action", "upload");
        if (opts?.contentType) form.set("contentType", opts.contentType);
        if (typeof file === "string") {
          form.set("file", new Blob([file], { type: opts?.contentType }));
        } else if (file instanceof Blob) {
          form.set("file", file);
        } else {
          form.set(
            "file",
            new Blob([file as BlobPart], { type: opts?.contentType }),
          );
        }
        const res = await fetch("/api/storage", {
          method: "POST",
          credentials: "include",
          body: form,
        });
        const json = (await res.json()) as {
          data: { path: string } | null;
          error: { message: string } | null;
        };
        return json;
      } catch (e) {
        return {
          data: null,
          error: { message: e instanceof Error ? e.message : String(e) },
        };
      }
    },

    async download(path: string) {
      try {
        const res = await fetch("/api/storage", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "download", bucket, path }),
        });
        if (!res.ok) {
          const json = (await res.json().catch(() => null)) as {
            error?: { message?: string };
          } | null;
          return {
            data: null,
            error: {
              message: json?.error?.message ?? `Download failed (${res.status})`,
            },
          };
        }
        const blob = await res.blob();
        return { data: blob, error: null };
      } catch (e) {
        return {
          data: null,
          error: { message: e instanceof Error ? e.message : String(e) },
        };
      }
    },

    async remove(paths: string[]) {
      try {
        const res = await fetch("/api/storage", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "remove", bucket, paths }),
        });
        return (await res.json()) as {
          data: string[] | null;
          error: { message: string } | null;
        };
      } catch (e) {
        return {
          data: null,
          error: { message: e instanceof Error ? e.message : String(e) },
        };
      }
    },

    async createSignedUrl(path: string, expiresIn: number) {
      try {
        const res = await fetch("/api/storage", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "createSignedUrl",
            bucket,
            path,
            expiresIn,
          }),
        });
        return (await res.json()) as {
          data: { signedUrl: string } | null;
          error: { message: string } | null;
        };
      } catch (e) {
        return {
          data: null,
          error: { message: e instanceof Error ? e.message : String(e) },
        };
      }
    },

    getPublicUrl(path: string) {
      const params = new URLSearchParams({ bucket, path });
      return {
        data: { publicUrl: `/api/storage/public?${params.toString()}` },
      };
    },
  };
}

export function createClient() {
  return {
    from(table: string) {
      return new BrowserQueryBuilder(table);
    },
    auth: {
      async getUser() {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        const json = (await res.json()) as {
          data: { user: import("@backend/db/auth/types").AppUser | null };
          error: { message: string } | null;
        };
        return json;
      },
      async signInWithPassword(_credentials: {
        email: string;
        password: string;
      }) {
        return {
          data: { user: null, session: null },
          error: {
            message:
              "Use the server login action; browser password sign-in is disabled.",
          },
        };
      },
      async signOut() {
        const res = await fetch("/api/auth/me", {
          method: "DELETE",
          credentials: "include",
        });
        return (await res.json()) as { error: { message: string } | null };
      },
      // Browser client has no admin API; stub keeps SupabaseClient structural match.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      admin: null as any,
    },
    storage: {
      from(bucket: string) {
        return createBrowserStorageBucket(bucket);
      },
    },
  };
}
