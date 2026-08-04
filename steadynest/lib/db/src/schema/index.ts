import { pgTable, text, integer, real, timestamp, index, boolean, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ── Users ────────────────────────────────────────────────────────────────────
export const users = pgTable('users', {
  id: text('id').primaryKey(), // Using text for UUID or short-id
  name: text('name').notNull(),
  email: text('email').unique(), // nullable: phone/OTP accounts may have no email
  password: text('password'), // nullable: OTP accounts have no password; argon2 hash otherwise
  role: text('role'), // nullable: chosen after OTP verification. 'tenant' | 'landlord'
  role_set_at: timestamp('role_set_at'), // when the role was first chosen
  phone: text('phone').unique(), // E.164, unique across accounts (nulls allowed & distinct)
  city: text('city'),
  avatar_url: text('avatar_url'),
  // Profile fields surfaced by the Identity & safety section on the Profile
  // screen. Age is derived from date_of_birth rather than stored, so it can
  // never drift out of date.
  date_of_birth: timestamp('date_of_birth'),
  // Preferred language for the in-chat voice translator, as a BCP-47 tag
  // ('en', 'hi', 'pa', ...). Drives the translation target for messages this
  // user receives.
  preferred_language: text('preferred_language').default('en').notNull(),
  // Whether identity verification has actually completed. Phone-OTP alone is
  // NOT KYC — keep these distinct so the UI can't imply verification we
  // haven't performed.
  kyc_verified: boolean('kyc_verified').default(false).notNull(),
  // ── Tenant search preferences (onboarding O2) ──────────────────────────────
  // All nullable: landlords never fill these in, and a tenant can skip the
  // step. Nothing downstream may assume they are present.
  //
  // Budget is monthly rent in whole INR — integer, not real. Rents here are
  // whole-rupee amounts and float arithmetic on money invites rounding drift
  // once these feed autopay figures.
  budget_min: integer('budget_min'),
  budget_max: integer('budget_max'),
  // Delhi NCR locality names ('Saket', 'Gurgaon Sector 29', ...). text[] to
  // match the existing listings.images convention rather than introducing a
  // second array representation.
  preferred_areas: text('preferred_areas').array(),
  // Desired move-in, distinct from leases.move_in_date: this is an aspiration
  // captured at onboarding, that one is a fact on a signed lease.
  preferred_move_in_date: timestamp('preferred_move_in_date'),
  // Free-form lifestyle tags used by Connect's matching heuristic
  // ('vegetarian', 'early-riser', 'pet-friendly', ...).
  lifestyle_tags: text('lifestyle_tags').array(),
  created_at: timestamp('created_at').defaultNow().notNull(),
}, (table) => {
  return {
    phoneIdx: index('users_phone_idx').on(table.phone),
    budgetRange: check(
      'users_budget_range_check',
      sql`"budget_min" IS NULL OR "budget_max" IS NULL OR "budget_min" <= "budget_max"`,
    ),
  };
});

// ── OTP Challenges ───────────────────────────────────────────────────────────
// Short-lived phone-verification codes. Codes are stored hashed (argon2), never
// in plaintext. A row is consumed on success (verified_at set) and expires via
// expires_at; attempts bounds brute-force on the 6-digit code.
export const otpChallenges = pgTable('otp_challenges', {
  id: text('id').primaryKey(),
  phone: text('phone').notNull(),
  code_hash: text('code_hash').notNull(),
  attempts: integer('attempts').default(0).notNull(),
  expires_at: timestamp('expires_at').notNull(),
  verified_at: timestamp('verified_at'),
  created_at: timestamp('created_at').defaultNow().notNull(),
}, (table) => {
  return {
    phoneIdx: index('otp_challenges_phone_idx').on(table.phone, table.created_at),
  };
});

// ── Groups ───────────────────────────────────────────────────────────────────
export const groups = pgTable('groups', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  avatar_url: text('avatar_url'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// ── Group Members (RBAC) ─────────────────────────────────────────────────────
export const groupMembers = pgTable('group_members', {
  id: text('id').primaryKey(),
  group_id: text('group_id').notNull().references(() => groups.id, { onDelete: 'cascade' }),
  user_id: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text('role').notNull(), // 'superadmin' | 'admin' | 'member'
  joined_at: timestamp('joined_at').defaultNow().notNull(),
});

// ── Messages ─────────────────────────────────────────────────────────────────
export const messages = pgTable('messages', {
  id: text('id').primaryKey(),
  chat_id: text('chat_id').notNull(), // Could be a group_id or a DM conversation ID
  sender_id: text('sender_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  text: text('text'),
  media_url: text('media_url'),
  status: text('status').default('sent').notNull(), // 'sent' | 'delivered' | 'read'
  timestamp: timestamp('timestamp').defaultNow().notNull(),
});

// ── Swipes ───────────────────────────────────────────────────────────────────
export const swipes = pgTable('swipes', {
  id: text('id').primaryKey(),
  swiper_id: text('swiper_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  target_id: text('target_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  status: text('status').default('pending').notNull(), // 'pending' | 'matched' | 'passed'
  timestamp: timestamp('timestamp').defaultNow().notNull(),
});

// ── Listings (Properties) ────────────────────────────────────────────────────
export const listings = pgTable('listings', {
  id: text('id').primaryKey(),
  owner_id: text('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  type: text('type').notNull(), // 'apartment' | 'house' | 'room' | 'co-living'
  price: integer('price').notNull(),
  security_deposit: integer('security_deposit'),
  currency: text('currency').default('INR').notNull(),
  address: text('address'),
  lat: real('lat').notNull(),
  lng: real('lng').notNull(),
  available_from: timestamp('available_from'),
  images: text('images').array(),
  status: text('status').default('available').notNull(), // 'available' | 'rented'
  rating: real('rating').default(0).notNull(), // 0 means no tenant rating yet
  created_at: timestamp('created_at').defaultNow().notNull(),
}, (table) => {
  return {
    geoIdx: index('geo_idx').using('gist', sql`((ST_SetSRID(ST_MakePoint(${table.lng}, ${table.lat}), 4326))::geography)`)
  };
});

// ── Inquiries ────────────────────────────────────────────────────────────────
export const inquiries = pgTable('inquiries', {
  id: text('id').primaryKey(),
  listing_id: text('listing_id').notNull().references(() => listings.id, { onDelete: 'cascade' }),
  tenant_id: text('tenant_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  status: text('status').default('pending').notNull(), // 'pending' | 'accepted' | 'rejected'
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// ── Leases ───────────────────────────────────────────────────────────────────
// A tenant's tenancy on a listing. Owns move-in / expiry (shown in the
// Profile "Identity & safety" section) and the rent figure the autopay
// schedule bills against.
//
// Default term is 11 months: Indian residential agreements are conventionally
// 11 months because a term of 12 months or more triggers compulsory
// registration under the Registration Act / state Rent Control legislation.
export const leases = pgTable('leases', {
  id: text('id').primaryKey(),
  tenant_id: text('tenant_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  listing_id: text('listing_id').notNull().references(() => listings.id, { onDelete: 'cascade' }),
  move_in_date: timestamp('move_in_date').notNull(),
  lease_end_date: timestamp('lease_end_date').notNull(),
  monthly_rent: integer('monthly_rent').notNull(),
  status: text('status').default('active').notNull(), // 'active' | 'expired' | 'pending' | 'terminated'
  created_at: timestamp('created_at').defaultNow().notNull(),
}, (table) => {
  return {
    tenantIdx: index('leases_tenant_idx').on(table.tenant_id),
  };
});

// ── Trusted Contacts (Emergency SOS) ─────────────────────────────────────────
// People notified when a user triggers SOS. Kept in its own table (not a
// column on users) because the design shows up to three, ordered by priority.
export const trustedContacts = pgTable('trusted_contacts', {
  id: text('id').primaryKey(),
  user_id: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name'),
  phone: text('phone').notNull(), // E.164
  relationship: text('relationship'),
  priority: integer('priority').default(1).notNull(), // 1 = contacted first
  created_at: timestamp('created_at').defaultNow().notNull(),
}, (table) => {
  return {
    userIdx: index('trusted_contacts_user_idx').on(table.user_id),
  };
});

// ── Transactions ─────────────────────────────────────────────────────────────
export const transactions = pgTable('transactions', {
  id: text('id').primaryKey(),
  user_id: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  amount: integer('amount').notNull(),
  status: text('status').default('pending').notNull(), // 'pending' | 'completed' | 'failed'
  stripe_session_id: text('stripe_session_id'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// ── Types & Interfaces ───────────────────────────────────────────────────────
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Group = typeof groups.$inferSelect;
export type Message = typeof messages.$inferSelect;

export type PropertyListing = typeof listings.$inferSelect;
export type NewPropertyListing = typeof listings.$inferInsert;

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;

export type Lease = typeof leases.$inferSelect;
export type NewLease = typeof leases.$inferInsert;

export type TrustedContact = typeof trustedContacts.$inferSelect;
export type NewTrustedContact = typeof trustedContacts.$inferInsert;
