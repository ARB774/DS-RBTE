import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "@/db/schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required');

// Reuse client in dev
const globalForDb = globalThis as unknown as {
  sql?: ReturnType<typeof postgres>;
  db?: ReturnType<typeof drizzle>;
};

const sql =
  globalForDb.sql ??
  postgres(connectionString, { prepare: false, max: 5, idle_timeout: 20, connect_timeout: 5, connection: { statement_timeout: 5000 } });

const db = globalForDb.db ?? drizzle(sql, { schema });

if (process.env.NODE_ENV !== "production") {
  globalForDb.sql = sql;
  globalForDb.db = db;
}

export { sql, db };
