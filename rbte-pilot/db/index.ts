import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

const rawConnectionString = process.env.DATABASE_URL;

if (!rawConnectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const databaseUrl = new URL(rawConnectionString);
databaseUrl.searchParams.delete('schema');
const connectionString = databaseUrl.toString();

const client = postgres(connectionString, { prepare: false });
export const db = drizzle(client, { schema });

export type DbClient = typeof db;
