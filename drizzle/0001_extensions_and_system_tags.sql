-- Accent-insensitive (unaccent) and fuzzy (pg_trgm) matching for answers and search.
CREATE EXTENSION IF NOT EXISTS unaccent;--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
INSERT INTO "tags" ("name", "color", "system") VALUES
  ('hard', '#f97316', true),
  ('forgot', '#ef4444', true)
ON CONFLICT ("name") DO NOTHING;
