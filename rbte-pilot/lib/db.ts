import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "@/db/schema";

const rawConnectionString =
  process.env.DATABASE_URL ??
  "postgres://postgres:postgres@127.0.0.1:5432/rbte_pilot";

function normalizeDatabaseUrl(value: string) {
  const url = new URL(value);
  // `schema` is a Prisma-style option. postgres-js forwards unknown URL
  // parameters to PostgreSQL, where `schema` is not a valid setting.
  url.searchParams.delete("schema");
  return url.toString();
}

const connectionString = normalizeDatabaseUrl(rawConnectionString);

// Reuse client in dev
const globalForDb = globalThis as unknown as {
  sql?: ReturnType<typeof postgres>;
  db?: ReturnType<typeof drizzle>;
};

const sql =
  globalForDb.sql ??
  postgres(connectionString, { prepare: false, max: 20, idle_timeout: 20 });

const db = globalForDb.db ?? drizzle(sql, { schema });

if (process.env.NODE_ENV !== "production") {
  globalForDb.sql = sql;
  globalForDb.db = db;
}

export { sql, db };
