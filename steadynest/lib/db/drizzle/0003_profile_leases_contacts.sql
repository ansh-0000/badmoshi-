-- Profile / Identity & safety fields, leases, and emergency trusted contacts.
--
-- Written by hand rather than via `drizzle-kit generate` because generate
-- requires a TTY (it prompts on table-rename ambiguity) and this environment
-- is non-interactive. Kept deliberately in step with lib/db/src/schema/index.ts.
--
-- All statements are idempotent so this can be re-applied over a drifted dev
-- database without erroring — see the migration-0002 drift note in CLAUDE.md.

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "date_of_birth" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "preferred_language" text DEFAULT 'en' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "kyc_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "leases" (
  "id" text PRIMARY KEY NOT NULL,
  "tenant_id" text NOT NULL,
  "listing_id" text NOT NULL,
  "move_in_date" timestamp NOT NULL,
  "lease_end_date" timestamp NOT NULL,
  "monthly_rent" integer NOT NULL,
  "status" text DEFAULT 'active' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "trusted_contacts" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "name" text,
  "phone" text NOT NULL,
  "relationship" text,
  "priority" integer DEFAULT 1 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "leases" ADD CONSTRAINT "leases_tenant_id_users_id_fk"
    FOREIGN KEY ("tenant_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "leases" ADD CONSTRAINT "leases_listing_id_listings_id_fk"
    FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "trusted_contacts" ADD CONSTRAINT "trusted_contacts_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "leases_tenant_idx" ON "leases" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "trusted_contacts_user_idx" ON "trusted_contacts" USING btree ("user_id");
