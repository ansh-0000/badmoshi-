-- NOTE: Postgres requires an expression index body to be wrapped in its own
-- parentheses when it is not a plain function call. Without the extra pair
-- this statement fails with `syntax error at or near "::"`, which meant
-- geo_idx was never actually created on any fresh database and every
-- /listings/nearby query fell back to a sequential scan.
CREATE INDEX "geo_idx" ON "listings" USING gist ((ST_SetSRID(ST_MakePoint("lng", "lat"), 4326)::geography));