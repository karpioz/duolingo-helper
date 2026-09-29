import "server-only";
import { attachDatabasePool } from "@vercel/functions";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import { pgUrl } from "./url";

// Reuse one pool across hot reloads in development.
const globalForDb = globalThis as unknown as { pool?: Pool };

const pool = globalForDb.pool ?? new Pool({ connectionString: pgUrl(process.env.DATABASE_URL) });
if (process.env.NODE_ENV !== "production") globalForDb.pool = pool;

// On Vercel Fluid compute, closes idle connections before the function suspends.
attachDatabasePool(pool);

export const db = drizzle({ client: pool, schema, casing: "snake_case" });
