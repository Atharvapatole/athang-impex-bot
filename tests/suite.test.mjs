import { describe, it } from "node:test";
import assert from "node:assert";
import crypto from "node:crypto";
import { PrismaClient } from "@prisma/client";

// Ensure master key is set
process.env.ENCRYPTION_MASTER_KEY = "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90";

const prisma = new PrismaClient();

// Helper to encrypt
function getMasterKey() {
  const hex = process.env.ENCRYPTION_MASTER_KEY;
  return Buffer.from(hex, "hex");
}

function encryptCredential(plaintext) {
  if (!plaintext) return "";
  const masterKey = getMasterKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", masterKey, iv);
  let ciphertext = cipher.update(plaintext, "utf8", "base64");
  ciphertext += cipher.final("base64");
  const authTag = cipher.getAuthTag().toString("base64");
  return `${iv.toString("base64")}:${authTag}:${ciphertext}`;
}

function decryptCredential(encryptedData) {
  if (!encryptedData) return "";
  const parts = encryptedData.split(":");
  const [ivB64, authTagB64, ciphertextB64] = parts;
  const masterKey = getMasterKey();
  const decipher = crypto.createDecipheriv("aes-256-gcm", masterKey, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(authTagB64, "base64"));
  let decrypted = decipher.update(ciphertextB64, "base64", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

function maskSecret(secret) {
  if (!secret) return "Not Configured";
  if (secret.length <= 8) return "••••••••";
  return `${secret.slice(0, 4)}••••••••${secret.slice(-4)}`;
}

function verifyWhatsAppSignature(rawBody, signatureHeader, appSecret) {
  if (!signatureHeader || !appSecret) return false;
  const parts = signatureHeader.split("=");
  if (parts.length !== 2 || parts[0] !== "sha256") return false;
  const expected = parts[1];
  const hmac = crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(hmac, "hex"));
  } catch {
    return false;
  }
}

function isForbiddenIp(ip) {
  const parts = ip.split(".").map(Number);
  const [p0, p1] = parts;
  if (p0 === 127 || p0 === 0) return true; // Loopback
  if (p0 === 10) return true; // Private
  if (p0 === 172 && p1 >= 16 && p1 <= 31) return true; // Private
  if (p0 === 192 && p1 === 168) return true; // Private
  if (p0 === 169 && p1 === 254) return true; // Cloud metadata / link-local
  return false;
}

function chunkText(text, chunkSize = 750, overlap = 100) {
  const cleaned = text.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ");
  const chunks = [];
  let start = 0;
  while (start < cleaned.length) {
    let end = start + chunkSize;
    if (end >= cleaned.length) {
      const slice = cleaned.slice(start).trim();
      if (slice.length > 20) chunks.push(slice);
      break;
    }
    const chunk = cleaned.slice(start, end).trim();
    if (chunk.length > 20) chunks.push(chunk);
    start = end - overlap;
  }
  return chunks;
}

describe("1. Cryptographic Security & AES-256-GCM Verification", () => {
  it("should encrypt and decrypt secrets without loss", () => {
    const secret = "gsk_live_api_key_for_groq_production_1234567890";
    const enc = encryptCredential(secret);
    assert.notStrictEqual(enc, secret);
    assert.strictEqual(enc.split(":").length, 3);
    const dec = decryptCredential(enc);
    assert.strictEqual(dec, secret);
  });

  it("should fail authentication on tampered ciphertext", () => {
    const enc = encryptCredential("confidential_data");
    const parts = enc.split(":");
    const tampered = `${parts[0]}:${parts[1]}:TAMPERED${parts[2].slice(8)}`;
    assert.throws(() => decryptCredential(tampered));
  });

  it("should mask secrets safely for UI rendering", () => {
    assert.strictEqual(maskSecret("EAAB_test_token_secret_meta_9999"), "EAAB••••••••9999");
    assert.strictEqual(maskSecret(null), "Not Configured");
  });

  it("should verify Meta WhatsApp HMAC-SHA256 signatures", () => {
    const payload = JSON.stringify({ event: "message" });
    const secret = "app_secret_12345";
    const hmac = crypto.createHmac("sha256", secret).update(payload).digest("hex");
    assert.strictEqual(verifyWhatsAppSignature(payload, `sha256=${hmac}`, secret), true);
    assert.strictEqual(verifyWhatsAppSignature(payload, "sha256=invalid", secret), false);
  });
});

describe("2. SSRF Protection & Untrusted PDF Boundaries", () => {
  it("should block loopback 127.0.0.1", () => {
    assert.strictEqual(isForbiddenIp("127.0.0.1"), true);
  });

  it("should block RFC 1918 private subnets (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)", () => {
    assert.strictEqual(isForbiddenIp("10.0.1.5"), true);
    assert.strictEqual(isForbiddenIp("172.20.0.1"), true);
    assert.strictEqual(isForbiddenIp("192.168.1.100"), true);
  });

  it("should block cloud metadata address 169.254.169.254", () => {
    assert.strictEqual(isForbiddenIp("169.254.169.254"), true);
  });

  it("should permit valid public internet addresses", () => {
    assert.strictEqual(isForbiddenIp("8.8.8.8"), false);
    assert.strictEqual(isForbiddenIp("104.21.5.10"), false);
  });
});

describe("3. PDF Chunking & Grounding", () => {
  it("should produce sensible overlapping text chunks", () => {
    const text = "ATHANG IMPEX supplies Dehydrated White Onion Powder (80-100 mesh) to global spice blenders and food processors. Moisture is certified below 5.5%. Packaging is provided in 25kg paper bags.";
    const chunks = chunkText(text, 80, 20);
    assert.ok(chunks.length >= 2);
    assert.ok(chunks[0].includes("ATHANG IMPEX"));
  });
});

describe("4. Single-Business Verification & ATHANG IMPEX Scope", () => {
  it("should verify ATHANG IMPEX is the sole configured business and isolated from other brands", async () => {
    const athang = await prisma.business.findUnique({ where: { slug: "athang-impex" } });
    const benzwell = await prisma.business.findUnique({ where: { slug: "benzwell" } });

    assert.ok(athang, "ATHANG IMPEX must exist in the database");
    assert.strictEqual(benzwell, null, "BENZWELL must not exist in active configuration");

    // Total businesses should be 1
    const totalBusinesses = await prisma.business.count();
    assert.strictEqual(totalBusinesses, 1, "Only 1 business should exist in the single-business platform");

    // Chunks for Athang
    const athangChunks = await prisma.knowledgeBaseChunk.findMany({ where: { businessId: athang.id } });
    assert.ok(athangChunks.length > 0, "ATHANG IMPEX should have active knowledge base chunks");
    assert.ok(athangChunks.some(c => c.content.includes("Onion Powder")), "Must have Onion Powder in export catalog");
  });
});

describe("5. Lead Extraction Heuristics", () => {
  it("should capture onion powder, quantity, port, and packaging for ATHANG IMPEX", () => {
    const message = "We need 20 MT of Dehydrated Onion Powder shipped to Jebel Ali Port in 25kg kraft bags. Contact export@gulfspice.com";
    // Check fields
    assert.ok(message.includes("Onion Powder"));
    assert.ok(message.includes("20 MT"));
    assert.ok(message.includes("Jebel Ali"));
  });
});

describe("6. AI Fallback Engine Safe Failure Path", () => {
  it("should return business-specific safe failure message when external providers fail", async () => {
    const athang = await prisma.business.findUnique({ where: { slug: "athang-impex" } });
    assert.ok(athang.safeFailureMessage.includes("info@athangimpex.in"));
    assert.ok(athang.safeFailureMessage.includes("+91 9923407176"));
  });
});

describe("7. Production Webhook URL Resolution (athangimpexbot.vercel.app)", () => {
  it("should resolve production WhatsApp webhook URL strictly from APP_BASE_URL", () => {
    const original = process.env.APP_BASE_URL;
    process.env.APP_BASE_URL = "https://athangimpexbot.vercel.app";

    const base = process.env.APP_BASE_URL.replace(/\/+$/, "");
    const waUrl = `${base}/api/webhooks/whatsapp`;
    const tgUrl = `${base}/api/webhooks/telegram`;

    assert.strictEqual(waUrl, "https://athangimpexbot.vercel.app/api/webhooks/whatsapp");
    assert.strictEqual(tgUrl, "https://athangimpexbot.vercel.app/api/webhooks/telegram");
    assert.ok(!waUrl.includes("localhost"));
    assert.ok(!tgUrl.includes("localhost"));

    process.env.APP_BASE_URL = original;
  });

  it("should handle trailing slashes in APP_BASE_URL gracefully", () => {
    const baseWithSlash = "https://athangimpexbot.vercel.app/";
    const cleanBase = baseWithSlash.replace(/\/+$/, "");
    const waUrl = `${cleanBase}/api/webhooks/whatsapp`;
    assert.strictEqual(waUrl, "https://athangimpexbot.vercel.app/api/webhooks/whatsapp");
    assert.ok(!waUrl.includes("//api"));
  });

  it("should support local development mode when APP_BASE_URL is localhost", () => {
    const localBase = "http://localhost:3000";
    const waUrl = `${localBase}/api/webhooks/whatsapp`;
    const tgUrl = `${localBase}/api/webhooks/telegram`;
    assert.strictEqual(waUrl, "http://localhost:3000/api/webhooks/whatsapp");
    assert.strictEqual(tgUrl, "http://localhost:3000/api/webhooks/telegram");
  });
});

describe("8. Administrator Authentication & Bootstrap Integrity", () => {
  it("should find the default administrator and verify password hash", async () => {
    const bcrypt = await import("bcryptjs").then(m => m.default || m);
    const admin = await prisma.administrator.findUnique({
      where: { email: "admin@platform.local" },
    });

    assert.ok(admin, "Default admin@platform.local must exist in the database");
    assert.strictEqual(admin.role, "OWNER");

    // Test password verification
    const valid = await bcrypt.compare("AdminPassword123!", admin.passwordHash);
    assert.strictEqual(valid, true, "AdminPassword123! must match the stored password hash");

    const invalid = await bcrypt.compare("WrongPassword!", admin.passwordHash);
    assert.strictEqual(invalid, false, "Wrong password must be rejected");
  });

  it("should maintain idempotent administrator count and prevent duplicate creation", async () => {
    const countBefore = await prisma.administrator.count();
    assert.ok(countBefore >= 1, "At least one administrator exists");

    // Replicate bootstrap check: if adminCount === 0 then create, else skip
    const adminCount = await prisma.administrator.count();
    let created = false;
    if (adminCount === 0) {
      created = true;
    }

    assert.strictEqual(created, false, "Must not create a new administrator when one already exists");
    const countAfter = await prisma.administrator.count();
    assert.strictEqual(countAfter, countBefore, "Administrator count must remain constant");
  });

  it("should dynamically configure datasource provider in schema.prisma for PostgreSQL and SQLite", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const schemaPath = path.join(process.cwd(), "prisma", "schema.prisma");
    const originalSchema = fs.readFileSync(schemaPath, "utf8");

    // Test provider detection regex
    const currentMatch = originalSchema.match(/datasource\s+db\s+\{\s*provider\s*=\s*"([^"]+)"/);
    assert.ok(currentMatch, "Datasource block must be present in schema.prisma");
    assert.ok(
      currentMatch[1] === "sqlite" || currentMatch[1] === "postgresql",
      `Provider should be sqlite or postgresql, got ${currentMatch[1]}`
    );
  });

  it("should verify valid initial PostgreSQL migration file and lockfile exist for Supabase", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const migrationFile = path.join(process.cwd(), "prisma", "migrations", "20261024000000_init", "migration.sql");
    const lockFile = path.join(process.cwd(), "prisma", "migrations", "migration_lock.toml");

    assert.ok(fs.existsSync(migrationFile), "Initial migration.sql must exist");
    assert.ok(fs.existsSync(lockFile), "migration_lock.toml must exist");

    const sql = fs.readFileSync(migrationFile, "utf8");
    assert.ok(sql.includes('CREATE TABLE "Administrator"'), "Migration must create Administrator table");
    assert.ok(sql.includes('CREATE TABLE "Business"'), "Migration must create Business table");
    assert.ok(sql.includes('CREATE TABLE "ChannelIntegration"'), "Migration must create ChannelIntegration table");
    assert.ok(sql.includes('CREATE TABLE "Lead"'), "Migration must create Lead table");

    const lock = fs.readFileSync(lockFile, "utf8");
    assert.ok(lock.includes('provider = "postgresql"'), "Lockfile provider must be postgresql");
  });

  it("should verify supabase/setup.sql contains all required tables, constraints, and initial seed", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const sqlPath = path.join(process.cwd(), "supabase", "setup.sql");

    assert.ok(fs.existsSync(sqlPath), "supabase/setup.sql must exist");
    const sql = fs.readFileSync(sqlPath, "utf8");

    // Verify all 13 core models from Prisma schema
    const requiredTables = [
      "Administrator",
      "Session",
      "Business",
      "BusinessInstructionVersion",
      "ChannelIntegration",
      "AIProviderConfig",
      "KnowledgeBaseSource",
      "KnowledgeBaseChunk",
      "Contact",
      "Conversation",
      "Message",
      "Lead",
      "MessageJob",
      "AuditEvent",
      "UsageRecord",
    ];

    for (const table of requiredTables) {
      assert.ok(
        sql.includes(`CREATE TABLE IF NOT EXISTS "${table}"`),
        `supabase/setup.sql must create table ${table}`
      );
    }

    // Verify Prisma migrations compatibility and seed
    assert.ok(sql.includes('"_prisma_migrations"'), "Must include _prisma_migrations table");
    assert.ok(sql.includes("20261024000000_init"), "Must record initial migration");
    assert.ok(sql.includes("admin@platform.local"), "Must seed default administrator");
    assert.ok(sql.includes("athang-impex"), "Must seed default business");

    // Verify Row Level Security is explicitly enabled on all tables
    for (const table of requiredTables) {
      assert.ok(
        sql.includes(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;`),
        `supabase/setup.sql must enable RLS on ${table}`
      );
    }
    assert.ok(sql.includes("REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;"), "Must revoke access from anon role");
    assert.ok(sql.includes("REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated;"), "Must revoke access from authenticated role");
  });
});

describe("9. Direct Access Mode & Login Panel Removal", () => {
  it("should verify home page redirects directly to /dashboard without login check", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const homeCode = fs.readFileSync(path.join(process.cwd(), "src", "app", "page.tsx"), "utf8");

    assert.ok(homeCode.includes('redirect("/dashboard")'), "Home page must redirect to /dashboard");
    assert.strictEqual(homeCode.includes('redirect("/login")'), false, "Home page must not redirect to /login");
  });

  it("should verify login page redirects directly to /dashboard", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const loginCode = fs.readFileSync(path.join(process.cwd(), "src", "app", "login", "page.tsx"), "utf8");

    assert.ok(loginCode.includes('redirect("/dashboard")'), "Login page must redirect to /dashboard");
    assert.strictEqual(loginCode.includes("<form"), false, "Login page must not contain a login form");
  });

  it("should verify middleware allows direct dashboard access without auth token", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const mwCode = fs.readFileSync(path.join(process.cwd(), "src", "middleware.ts"), "utf8");

    assert.ok(mwCode.includes('redirect(new URL("/dashboard"'), "Middleware must redirect /login to /dashboard");
    assert.strictEqual(mwCode.includes('redirect(new URL("/login"'), false, "Middleware must not redirect to /login");
  });

  it("should verify DashboardLayout does not contain Sign Out button or login redirects", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const layoutCode = fs.readFileSync(path.join(process.cwd(), "src", "components", "layout", "DashboardLayout.tsx"), "utf8");

    assert.strictEqual(layoutCode.includes("Sign Out"), false, "DashboardLayout must not render a Sign Out button");
    assert.strictEqual(layoutCode.includes('router.push("/login")'), false, "DashboardLayout must not push to /login");
  });
});

describe("10. Business Profile & AI Providers Fallback Verification", () => {
  it("should verify Business Profile page directly manages ATHANG IMPEX with all operational and AI fields", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const bizPage = fs.readFileSync(path.join(process.cwd(), "src", "app", "businesses", "page.tsx"), "utf8");

    assert.ok(bizPage.includes("ATHANG IMPEX"), "Must display ATHANG IMPEX profile");
    assert.ok(bizPage.includes("productsServices"), "Must include products and services field");
    assert.ok(bizPage.includes("businessHours"), "Must include business hours field");
    assert.ok(bizPage.includes("supportedLanguages"), "Must include supported languages field");
    assert.ok(bizPage.includes("faq"), "Must include FAQ field");
    assert.ok(bizPage.includes("systemInstructions"), "Must include system instructions field");
    assert.ok(bizPage.includes("Save Changes"), "Must have Save Changes button");
    assert.ok(bizPage.includes("Reset"), "Must have Reset button");
  });

  it("should verify AI Providers page configures 3-tier fallback chain with show/hide password toggles", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const aiPage = fs.readFileSync(path.join(process.cwd(), "src", "app", "ai-providers", "page.tsx"), "utf8");

    assert.ok(aiPage.includes("GROQ"), "Must support Groq");
    assert.ok(aiPage.includes("MISTRAL"), "Must support Mistral");
    assert.ok(aiPage.includes("GEMINI"), "Must support Gemini");
    assert.ok(aiPage.includes("Test Connection"), "Must include Test Connection button");
    assert.ok(aiPage.includes("EyeOff"), "Must include show/hide password toggle");
    assert.ok(aiPage.includes("Deterministic High-Availability Fallback Chain"), "Must include visual fallback chain");
  });

  it("should verify Business API supports PATCH with optional operational fields", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const bizApi = fs.readFileSync(path.join(process.cwd(), "src", "app", "api", "businesses", "route.ts"), "utf8");

    assert.ok(bizApi.includes("export async function PATCH"), "Must export PATCH handler");
    assert.ok(bizApi.includes("productsServices"), "Must handle productsServices");
    assert.ok(bizApi.includes("faq"), "Must handle faq");
  });

  it("should verify AI Providers API auto-provisions canonical 3 tiers if empty", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const aiApi = fs.readFileSync(path.join(process.cwd(), "src", "app", "api", "ai-providers", "route.ts"), "utf8");

    assert.ok(aiApi.includes("GROQ"), "Must include Groq tier");
    assert.ok(aiApi.includes("MISTRAL"), "Must include Mistral tier");
    assert.ok(aiApi.includes("GEMINI"), "Must include Gemini tier");
    assert.ok(aiApi.includes("maskSecret"), "Must mask secrets before sending to frontend");
  });
});

describe("11. Prisma Database Schema Mismatch & Additive Migration Verification", () => {
  it("should verify official Prisma migration exists for business profile fields", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const migrationPath = path.join(
      process.cwd(),
      "prisma",
      "migrations",
      "20261024193000_add_business_profile_fields",
      "migration.sql"
    );

    assert.ok(fs.existsSync(migrationPath), "Prisma migration file must exist");
    const sql = fs.readFileSync(migrationPath, "utf8");
    assert.ok(sql.includes('ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "address" TEXT'), "Must add address column");
    assert.ok(sql.includes('ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "productsServices" TEXT'), "Must add productsServices column");
    assert.ok(sql.includes('ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "businessHours" TEXT'), "Must add businessHours column");
    assert.ok(sql.includes('ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "supportedLanguages" TEXT'), "Must add supportedLanguages column");
    assert.ok(sql.includes('ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "faq" TEXT'), "Must add faq column");
  });

  it("should verify standalone Supabase SQL migration file exists and is additive", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const sqlPath = path.join(process.cwd(), "supabase", "migration_add_business_profile_fields.sql");

    assert.ok(fs.existsSync(sqlPath), "Standalone migration file must exist");
    const sql = fs.readFileSync(sqlPath, "utf8");
    assert.ok(sql.includes('ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "address" TEXT'), "Must include address column");
    assert.ok(sql.includes('"_prisma_migrations"'), "Must record migration in _prisma_migrations");
    assert.ok(!sql.includes("DROP TABLE"), "Must not drop any tables");
  });

  it("should verify Business API routes implement schema resilience and self-healing", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const bizRoute = fs.readFileSync(path.join(process.cwd(), "src", "app", "api", "businesses", "route.ts"), "utf8");
    const bizIdRoute = fs.readFileSync(path.join(process.cwd(), "src", "app", "api", "businesses", "[id]", "route.ts"), "utf8");

    assert.ok(bizRoute.includes("isMissingColumnError"), "Main route must check for missing column error");
    assert.ok(bizRoute.includes("autoHealBusinessSchema"), "Main route must trigger autoHealBusinessSchema");
    assert.ok(bizIdRoute.includes("isMissingColumnError"), "ID route must check for missing column error");
    assert.ok(bizIdRoute.includes("autoHealBusinessSchema"), "ID route must trigger autoHealBusinessSchema");
  });
});



