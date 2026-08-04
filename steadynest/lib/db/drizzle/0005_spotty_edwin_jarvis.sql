ALTER TABLE "listings" ALTER COLUMN "currency" SET DEFAULT 'INR';--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "rating" real DEFAULT 0 NOT NULL;--> statement-breakpoint
