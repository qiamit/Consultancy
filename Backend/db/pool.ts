import "server-only";
import { Pool, types, type QueryResult, type QueryResultRow } from "pg";

// node-pg returns NUMERIC as strings by default. Money/rate fields (slab_1_rate,
// MMF, fees) must be JS numbers so Number.isFinite / arithmetic work in the UI.
types.setTypeParser(types.builtins.NUMERIC, (value) => {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : value;
});

let pool: Pool | null = null;

function isRecoverableDbError(err: unknown): boolean {
  const code =
    err && typeof err === "object" && "code" in err
      ? String((err as { code?: unknown }).code ?? "")
      : "";
  const message = err instanceof Error ? err.message : String(err ?? "");
  return (
    code === "ECONNRESET" ||
    code === "ECONNREFUSED" ||
    code === "ETIMEDOUT" ||
    code === "EPIPE" ||
    /connection (terminated|timeout|ended)/i.test(message) ||
    /Connection terminated/i.test(message) ||
    /timeout/i.test(message)
  );
}

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured.");
  }
  const next = new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 20_000,
    connectionTimeoutMillis: 20_000,
    // Railway TCP proxy drops idle sockets; don't keep half-dead clients.
    allowExitOnIdle: true,
  });
  next.on("error", (err) => {
    console.error("Postgres pool error:", err.message);
    if (pool === next) {
      pool = null;
      void next.end().catch(() => undefined);
    }
  });
  return next;
}

export function getPool(): Pool {
  if (!pool) pool = createPool();
  return pool;
}

async function resetPool(): Promise<void> {
  const old = pool;
  pool = null;
  if (old) await old.end().catch(() => undefined);
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<QueryResult<T>> {
  try {
    return await getPool().query<T>(text, params);
  } catch (err) {
    if (!isRecoverableDbError(err)) throw err;
    await resetPool();
    return getPool().query<T>(text, params);
  }
}
