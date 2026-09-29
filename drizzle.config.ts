import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";
import { pgUrl } from "./src/db/url";

config({ path: ".env.local", quiet: true });

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  casing: "snake_case",
  // Migrations need a direct (non-pooled) connection.
  dbCredentials: { url: pgUrl(process.env.DATABASE_URL_UNPOOLED) },
});
