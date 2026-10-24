-- ==============================================================================
-- ATHANG IMPEX AI Chatbot Platform — Supabase PostgreSQL Production Setup
-- Compatible with PostgreSQL 15+ and Supabase SQL Editor
-- All statements are safe, idempotent, and non-destructive (IF NOT EXISTS / ON CONFLICT)
-- ==============================================================================

-- 1. ADMINISTRATOR & SESSION TABLES
CREATE TABLE IF NOT EXISTS "Administrator" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'ADMIN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Administrator_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Session" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Session_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Session_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Administrator"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- 2. BUSINESS & MULTI-TENANT ISOLATION TABLES
CREATE TABLE IF NOT EXISTS "Business" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "website" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "productsServices" TEXT,
    "businessHours" TEXT,
    "supportedLanguages" TEXT,
    "faq" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "systemInstructions" TEXT NOT NULL,
    "whenYouDontKnow" TEXT NOT NULL,
    "welcomeMessage" TEXT NOT NULL,
    "safeFailureMessage" TEXT NOT NULL,
    "humanHandoffMessage" TEXT NOT NULL,
    "closingMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Business_pkey" PRIMARY KEY ("id")
);

-- Ensure optional business profile columns exist in existing Supabase deployments
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "productsServices" TEXT;
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "businessHours" TEXT;
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "supportedLanguages" TEXT;
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "faq" TEXT;

CREATE TABLE IF NOT EXISTS "BusinessInstructionVersion" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "systemInstructions" TEXT NOT NULL,
    "whenYouDontKnow" TEXT NOT NULL,
    "welcomeMessage" TEXT NOT NULL,
    "safeFailureMessage" TEXT NOT NULL,
    "humanHandoffMessage" TEXT NOT NULL,
    "closingMessage" TEXT,
    "editedByAdminId" TEXT,
    "versionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BusinessInstructionVersion_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "BusinessInstructionVersion_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- 3. CHANNEL INTEGRATIONS (WhatsApp & Telegram)
CREATE TABLE IF NOT EXISTS "ChannelIntegration" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "channelType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "credentialsEncrypted" TEXT NOT NULL,
    "phoneNumberId" TEXT,
    "wabaId" TEXT,
    "webhookVerifyToken" TEXT,
    "botUsername" TEXT,
    "webhookSecretToken" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NOT_CONFIGURED',
    "lastTestedAt" TIMESTAMP(3),
    "lastInboundAt" TIMESTAMP(3),
    "lastOutboundAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChannelIntegration_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ChannelIntegration_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- 4. AI PROVIDER CONFIGURATIONS (Groq, Mistral, Gemini Fallback Pipeline)
CREATE TABLE IF NOT EXISTS "AIProviderConfig" (
    "id" TEXT NOT NULL,
    "businessId" TEXT,
    "provider" TEXT NOT NULL,
    "apiKeyEncrypted" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "timeoutMs" INTEGER NOT NULL DEFAULT 15000,
    "maxTokens" INTEGER NOT NULL DEFAULT 1024,
    "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.3,
    "status" TEXT NOT NULL DEFAULT 'NOT_CONFIGURED',
    "lastTestedAt" TIMESTAMP(3),
    "lastSuccessAt" TIMESTAMP(3),
    "lastError" TEXT,
    "dailyRequestLimit" INTEGER,
    "monthlyRequestLimit" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AIProviderConfig_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "AIProviderConfig_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- 5. KNOWLEDGE BASE & PDF RAG GROUNDING TABLES
CREATE TABLE IF NOT EXISTS "KnowledgeBaseSource" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "fileSizeBytes" INTEGER NOT NULL DEFAULT 0,
    "pageCount" INTEGER NOT NULL DEFAULT 0,
    "chunkCount" INTEGER NOT NULL DEFAULT 0,
    "extractedPreview" TEXT,
    "errorMessage" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "KnowledgeBaseSource_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "KnowledgeBaseSource_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "KnowledgeBaseChunk" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "pageNumber" INTEGER,
    "content" TEXT NOT NULL,
    "tokenEstimate" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "KnowledgeBaseChunk_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "KnowledgeBaseChunk_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "KnowledgeBaseChunk_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "KnowledgeBaseSource"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- 6. CONTACTS & CONVERSATIONS
CREATE TABLE IF NOT EXISTS "Contact" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "channelType" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "displayName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Contact_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Conversation" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "channelType" TEXT NOT NULL,
    "channelIdentifier" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "isHumanTakeover" BOOLEAN NOT NULL DEFAULT false,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Conversation_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Conversation_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderType" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "channelMessageId" TEXT,
    "state" TEXT NOT NULL DEFAULT 'RECEIVED',
    "aiProviderUsed" TEXT,
    "modelUsed" TEXT,
    "latencyMs" INTEGER,
    "sourceReferences" TEXT,
    "errorDetails" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Message_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- 7. LEADS & RFQ CAPTURE
CREATE TABLE IF NOT EXISTS "Lead" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "contactId" TEXT,
    "conversationId" TEXT,
    "buyerName" TEXT,
    "company" TEXT,
    "country" TEXT,
    "destinationPort" TEXT,
    "productOfInterest" TEXT,
    "quantityAndUnit" TEXT,
    "requiredSpecs" TEXT,
    "packagingPreference" TEXT,
    "purchaseTimeline" TEXT,
    "emailOrPhone" TEXT,
    "orderReference" TEXT,
    "supportTopic" TEXT,
    "supportIssue" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "customFields" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Lead_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Lead_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Lead_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- 8. ASYNC BACKGROUND MESSAGE WORKER JOBS
CREATE TABLE IF NOT EXISTS "MessageJob" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "channelType" TEXT NOT NULL,
    "eventPayload" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "nextRetryAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastError" TEXT,
    "lockedAt" TIMESTAMP(3),
    "lockedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MessageJob_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "MessageJob_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- 9. AUDIT & USAGE TELEMETRY
CREATE TABLE IF NOT EXISTS "AuditEvent" (
    "id" TEXT NOT NULL,
    "businessId" TEXT,
    "adminId" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "details" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "UsageRecord" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "promptTokens" INTEGER NOT NULL DEFAULT 0,
    "completionTokens" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "isSuccessful" BOOLEAN NOT NULL DEFAULT true,
    "latencyMs" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UsageRecord_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "UsageRecord_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- 10. UNIQUE INDEXES
CREATE UNIQUE INDEX IF NOT EXISTS "Administrator_email_key" ON "Administrator"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "Session_token_key" ON "Session"("token");
CREATE UNIQUE INDEX IF NOT EXISTS "Business_slug_key" ON "Business"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "MessageJob_idempotencyKey_key" ON "MessageJob"("idempotencyKey");

-- 11. PRISMA MIGRATIONS COMPATIBILITY TABLE
-- Recording the initial migration ensures `prisma migrate status` and `prisma migrate deploy`
-- recognize the database as completely synced without failing on existing tables.
CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
    "id"                    VARCHAR(36) PRIMARY KEY NOT NULL,
    "checksum"              VARCHAR(64) NOT NULL,
    "finished_at"           TIMESTAMPTZ,
    "migration_name"        VARCHAR(255) NOT NULL,
    "logs"                  TEXT,
    "rolled_back_at"        TIMESTAMPTZ,
    "started_at"            TIMESTAMPTZ NOT NULL DEFAULT now(),
    "applied_steps_count"   INTEGER NOT NULL DEFAULT 0
);

INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "applied_steps_count")
VALUES (
    'c0a80101-0000-4000-8000-000000000001',
    '339243306db37996c5aa421cf46399b5a83a0026e6d1136b69a25032906b3aa7',
    now(),
    '20261024000000_init',
    1
)
ON CONFLICT ("id") DO NOTHING;

-- 12. INITIAL SEED: ATHANG IMPEX BUSINESS & DEFAULT OWNER ADMINISTRATOR
-- Administrator: admin@platform.local / AdminPassword123!
-- Password is encrypted with bcrypt (12 rounds).
INSERT INTO "Administrator" ("id", "email", "name", "passwordHash", "role", "createdAt", "updatedAt")
VALUES (
    'admin_owner_initial_01',
    'admin@platform.local',
    'Platform Owner',
    '$2a$12$XStaa32oWAZH95fkGSvCvOu3qhfsgDspv6OlWvqAI5uQZNqpop4CK',
    'OWNER',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("email") DO NOTHING;

-- Business: ATHANG IMPEX (Merchant exporter)
INSERT INTO "Business" (
    "id",
    "slug",
    "name",
    "description",
    "website",
    "email",
    "phone",
    "address",
    "productsServices",
    "businessHours",
    "supportedLanguages",
    "faq",
    "timezone",
    "isActive",
    "systemInstructions",
    "whenYouDontKnow",
    "welcomeMessage",
    "safeFailureMessage",
    "humanHandoffMessage",
    "closingMessage",
    "createdAt",
    "updatedAt"
)
VALUES (
    'business_athang_impex_01',
    'athang-impex',
    'ATHANG IMPEX',
    'Merchant exporter of premium dehydrated agricultural products from India.',
    'https://athangimpex.in',
    'info@athangimpex.in',
    '+91 9923407176',
    'Navi Mumbai / Nashik, Maharashtra, India',
    'Dehydrated Onion Powder, Dehydrated Onion Flakes, Pure Ginger Powder, Spray-Dried Tomato Powder',
    'Mon - Sat: 09:00 - 18:00 IST (UTC+5:30) | 24/7 AI Export Sales Assistant',
    'English, Hindi, Marathi',
    'Q: What is the MOQ?\nA: Minimum 1 FCL (20ft container) or LCL air cargo for commercial sample batches.\n\nQ: What packaging sizes are available?\nA: 20kg / 25kg multi-wall paper bags with inner poly liner, or custom export cartons.\n\nQ: What are payment terms?\nA: Standard export terms: 30% advance T/T, balance against B/L copy, or 100% Confirmed Irrevocable L/C at sight.',
    'Asia/Kolkata',
    true,
    'You are the official AI export sales representative for ATHANG IMPEX, a merchant exporter based in India.
Key Products:
1. Dehydrated Onion Powder (Premium grade, 80-100 mesh, moisture < 6%, free flowing, pungency preserved).
2. Dehydrated Onion Flakes / Minced (Commercial and A-grade, moisture < 5%, uniform size).
3. Ginger Powder (High gingerol aroma, fiber < 5%, moisture < 8%).
4. Tomato Powder (100% spray-dried/dehydrated natural tomato, rich red color, lycopene preserved).',
    'For custom chemical parameters, spot CFR/CIF container freight rates, or custom packaging not detailed in the knowledge base, state: "For tailored commercial quotations, minimum order quantities, and custom lab specifications, our export manager will assist you directly. Please share your destination port and required tonnage, or contact us at info@athangimpex.in or +91 9923407176."',
    'Welcome to ATHANG IMPEX! We are merchant exporters of premium Dehydrated Onion Powder, Onion Flakes, Ginger Powder, and Tomato Powder from India. How can we assist your business today?',
    'Sorry, I''m temporarily unable to process your message. Please contact our export team directly at info@athangimpex.in or WhatsApp +91 9923407176 for immediate assistance.',
    'Your export enquiry has been transferred to our export sales team. An agent will be with you shortly.',
    'Thank you for contacting ATHANG IMPEX. Have a great day!',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("slug") DO NOTHING;

-- Canonical AI Provider Fallback Chain (1. Groq -> 2. Mistral -> 3. Google Gemini)
INSERT INTO "AIProviderConfig" (
    "id",
    "businessId",
    "provider",
    "apiKeyEncrypted",
    "modelId",
    "priority",
    "isEnabled",
    "timeoutMs",
    "maxTokens",
    "temperature",
    "status",
    "createdAt",
    "updatedAt"
)
VALUES
(
    'ai_provider_groq_01',
    'business_athang_impex_01',
    'GROQ',
    '000000000000000000000000:00000000000000000000000000000000:00000000000000000000000000000000',
    'llama-3.3-70b-versatile',
    1,
    true,
    15000,
    1024,
    0.3,
    'NOT_CONFIGURED',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    'ai_provider_mistral_01',
    'business_athang_impex_01',
    'MISTRAL',
    '000000000000000000000000:00000000000000000000000000000000:00000000000000000000000000000000',
    'mistral-large-latest',
    2,
    true,
    15000,
    1024,
    0.3,
    'NOT_CONFIGURED',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    'ai_provider_gemini_01',
    'business_athang_impex_01',
    'GEMINI',
    '000000000000000000000000:00000000000000000000000000000000:00000000000000000000000000000000',
    'gemini-1.5-flash',
    3,
    true,
    15000,
    1024,
    0.3,
    'NOT_CONFIGURED',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO NOTHING;

-- 13. ROW LEVEL SECURITY (RLS) HARDENING
-- The ATHANG IMPEX application connects server-side via Prisma over direct PostgreSQL (role: postgres).
-- It does NOT use the client-side Supabase PostgREST API (anon/authenticated).
-- Enabling RLS on all tables without permissive policies ensures PostgREST clients (anon/authenticated)
-- CANNOT access, read, or write any private database tables.
-- The postgres superuser/table owner role used by Prisma bypasses RLS and continues to function normally.

ALTER TABLE "Administrator" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Business" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BusinessInstructionVersion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ChannelIntegration" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AIProviderConfig" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "KnowledgeBaseSource" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "KnowledgeBaseChunk" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Contact" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Conversation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Message" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Lead" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MessageJob" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UsageRecord" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;

-- Explicitly revoke public PostgREST API access from anon and authenticated roles (defense-in-depth)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
        REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
        REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
        REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM anon;
    END IF;

    IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
        REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated;
        REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM authenticated;
        REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM authenticated;
    END IF;
END $$;
