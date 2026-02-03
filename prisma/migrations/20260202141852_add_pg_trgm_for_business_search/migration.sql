CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX business_name_trgm_idx
ON businesses
USING gin (name gin_trgm_ops);
