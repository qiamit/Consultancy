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

export function getPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured.");
  }
  if (!pool) {
    pool = new Pool({
      connectionString,
      max: 20,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 15_000,
    });
  }
  return pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<QueryResult<T>> {
  return getPool().query<T>(text, params);
}
