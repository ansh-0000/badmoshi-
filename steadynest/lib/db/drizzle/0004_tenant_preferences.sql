-- Tenant search preferences captured during onboarding (screen O2).
--
-- Hand-written rather than via `drizzle-kit generate`, which needs a TTY in
-- this environment. Kept deliberately in step with lib/db/src/schema/index.ts.
--
-- Every statement is idempotent so this can be re-applied over a drifted dev
-- database. IMPORTANT: this file is only ever executed because its tag is
-- registered in drizzle/meta/_journal.json — migration 0003 sat here unrun for
-- weeks because that entry was missing. If you add a migration by hand, add the
-- journal entry and the snapshot in the same commit, and verify against an
-- EMPTY database rather than the dev one.

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "budget_min" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "budget_max" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "preferred_areas" text[];--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "preferred_move_in_date" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "lifestyle_tags" text[];--> statement-breakpoint

-- Guards the pair rather than either column alone: a max below the min is not
-- a range, and the app would silently return zero listings for it. Both NULL
-- (not yet onboarded) and one-sided ranges stay legal.
DO $$ BEGIN
  ALTER TABLE "users" ADD CONSTRAINT "users_budget_range_check"
    CHECK ("budget_min" IS NULL OR "budget_max" IS NULL OR "budget_min" <= "budget_max");
EXCEPTION WHEN duplicate_object THEN null; END $$;
