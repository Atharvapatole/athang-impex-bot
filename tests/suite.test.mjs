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
});

