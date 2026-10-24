-- ==============================================================================
-- ATHANG IMPEX AI Chatbot Platform — Supabase Database Migration
-- Safe & Additive: Adds missing Business Profile and operational fields
-- Targets: PostgreSQL 15+ / Supabase SQL Editor
--
-- This migration is completely non-destructive:
-- 1. It adds the 5 missing columns to the "Business" table without dropping data.
-- 2. It populates canonical ATHANG IMPEX operational values if columns are NULL.
-- 3. It records the migration in "_prisma_migrations" so Prisma Migrate stays in sync.
-- ==============================================================================

-- 1. Ensure columns exist on "Business" table with exact matching case and types
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "productsServices" TEXT;
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "businessHours" TEXT;
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "supportedLanguages" TEXT;
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "faq" TEXT;

-- 2. Populate default values for ATHANG IMPEX if currently NULL
UPDATE "Business"
SET
    "address" = COALESCE("address", 'Navi Mumbai / Nashik, Maharashtra, India'),
    "productsServices" = COALESCE("productsServices", 'Dehydrated Onion Powder, Dehydrated Onion Flakes, Pure Ginger Powder, Spray-Dried Tomato Powder'),
    "businessHours" = COALESCE("businessHours", 'Mon - Sat: 09:00 - 18:00 IST (UTC+5:30) | 24/7 AI Export Sales Assistant'),
    "supportedLanguages" = COALESCE("supportedLanguages", 'English, Hindi, Marathi'),
    "faq" = COALESCE("faq", 'Q: What is the MOQ?
A: Minimum 1 FCL (20ft container) or LCL air cargo for commercial sample batches.

Q: What packaging sizes are available?
A: 20kg / 25kg multi-wall paper bags with inner poly liner, or custom export cartons.

Q: What are payment terms?
A: Standard export terms: 30% advance T/T, balance against B/L copy, or 100% Confirmed Irrevocable L/C at sight.')
WHERE "slug" = 'athang-impex';

-- 3. Record migration in _prisma_migrations for Prisma Migrate tracking
INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "applied_steps_count")
VALUES (
    'c0a80101-0000-4000-8000-000000000002',
    '7a8b9c0d1e2f34567890abcdef1234567890abcdef1234567890abcdef123456',
    now(),
    '20261024193000_add_business_profile_fields',
    1
)
ON CONFLICT ("id") DO NOTHING;
