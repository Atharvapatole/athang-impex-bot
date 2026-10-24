import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { encryptCredential, decryptCredential, maskSecret, verifyWhatsAppSignature, verifyTelegramSecretToken } from "../src/lib/crypto";
import { isForbiddenIp, validateSafePdfUrl } from "../src/lib/kb/ssrf-validator";
import { PromptBuilder } from "../src/lib/kb/prompt-builder";
import { KnowledgeRetriever } from "../src/lib/kb/retriever";
import { LeadExtractor } from "../src/lib/leads/lead-extractor";
import { PdfIngestor } from "../src/lib/kb/pdf-ingestor";
import { GroqAdapter } from "../src/lib/ai/groq";
import { MistralAdapter } from "../src/lib/ai/mistral";
import { GeminiAdapter } from "../src/lib/ai/gemini";
import { FallbackEngine } from "../src/lib/ai/fallback-engine";
import { prisma } from "../src/lib/prisma";

// Mock fetch globally for deterministic tests
const originalFetch = global.fetch;

describe("1. Cryptographic Security & Credential Protection", () => {
  it("should encrypt and decrypt credentials with AES-256-GCM successfully", () => {
    const secret = "gsk_live_very_secret_api_key_1234567890";
    const encrypted = encryptCredential(secret);

    expect(encrypted).not.toBe(secret);
    expect(encrypted.split(":").length).toBe(3); // iv:authTag:ciphertext

    const decrypted = decryptCredential(encrypted);
    expect(decrypted).toBe(secret);
  });

  it("should reject tampered ciphertext with GCM authentication failure", () => {
    const secret = "test_api_key";
    const encrypted = encryptCredential(secret);
    const parts = encrypted.split(":");
    // Tamper with the ciphertext
    const tampered = `${parts[0]}:${parts[1]}:AAAA${parts[2].slice(4)}`;

    expect(() => decryptCredential(tampered)).toThrow();
  });

  it("should mask secrets safely for frontend display", () => {
    expect(maskSecret("EAAB123456789abcdefgh9999")).toBe("EAAB••••••••9999");
    expect(maskSecret(null)).toBe("Not Configured");
    expect(maskSecret("short")).toBe("••••••••");
  });

  it("should verify Meta WhatsApp Cloud API HMAC-SHA256 signatures", () => {
    const rawBody = JSON.stringify({ event: "test_whatsapp_message" });
    const appSecret = "meta_test_secret_key_123";

    // Generate expected signature
    const crypto = require("crypto");
    const hmac = crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
    const signatureHeader = `sha256=${hmac}`;

    expect(verifyWhatsAppSignature(rawBody, signatureHeader, appSecret)).toBe(true);
    expect(verifyWhatsAppSignature(rawBody, "sha256=invalidhash", appSecret)).toBe(false);
  });

  it("should verify Telegram webhook secret tokens with constant-time equality", () => {
    const secret = "telegram_secret_token_12345";
    expect(verifyTelegramSecretToken(secret, secret)).toBe(true);
    expect(verifyTelegramSecretToken("wrong_token", secret)).toBe(false);
  });
});

describe("2. SSRF Protection & Untrusted PDF Defense", () => {
  it("should block loopback and local addresses (127.0.0.1, ::1)", () => {
    expect(isForbiddenIp("127.0.0.1")).toBe(true);
    expect(isForbiddenIp("127.0.0.5")).toBe(true);
    expect(isForbiddenIp("::1")).toBe(true);
  });

  it("should block RFC 1918 private network IPs", () => {
    expect(isForbiddenIp("10.0.0.1")).toBe(true);
    expect(isForbiddenIp("172.16.0.1")).toBe(true);
    expect(isForbiddenIp("172.31.255.254")).toBe(true);
    expect(isForbiddenIp("192.168.1.1")).toBe(true);
  });

  it("should block AWS/GCP/Azure link-local cloud metadata (169.254.169.254)", () => {
    expect(isForbiddenIp("169.254.169.254")).toBe(true);
    expect(isForbiddenIp("169.254.1.1")).toBe(true);
  });

  it("should permit legitimate public IPs", () => {
    expect(isForbiddenIp("8.8.8.8")).toBe(false);
    expect(isForbiddenIp("1.1.1.1")).toBe(false);
    expect(isForbiddenIp("104.21.5.10")).toBe(false);
  });

  it("should reject localhost URLs", async () => {
    await expect(validateSafePdfUrl("http://localhost/secret.pdf")).rejects.toThrow();
    await expect(validateSafePdfUrl("http://127.0.0.1:8080/data.pdf")).rejects.toThrow();
  });
});

describe("3. PDF Chunking & OCR Extraction Guard", () => {
  it("should split long text into overlapping chunks with sentence boundaries", () => {
    const sampleText = `ATHANG IMPEX is a premier exporter of dehydrated agricultural commodities.
Our flagship product is Dehydrated Onion Powder, ground to 80-100 mesh size.
We also manufacture dehydrated onion flakes, garlic powder, ginger powder, and spray-dried tomato powder.
Our processing facility conforms to strict ISO and HACCP food quality guidelines.
Packaging is provided in 20kg or 25kg multi-wall kraft paper bags.`;

    const chunks = PdfIngestor.chunkText(sampleText, 150, 30);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].length).toBeGreaterThan(20);
    // Overlap should carry terms across adjacent chunks
    expect(chunks.some((c) => c.includes("Onion Powder"))).toBe(true);
  });
});

describe("4. Grounded Prompt Assembly & Untrusted Reference Isolation", () => {
  it("should format prompt messages with untrusted reference labeling and instructions", () => {
    const messages = PromptBuilder.buildPromptMessages({
      businessName: "ATHANG IMPEX",
      systemInstructions: "You are the export representative.",
      whenYouDontKnow: "Say contact sales.",
      retrievedChunks: [
        {
          id: "chunk-1",
          sourceId: "src-1",
          sourceName: "Catalog.pdf",
          pageNumber: 2,
          content: "Dehydrated Onion Powder 80-100 mesh, moisture < 5.5%.",
          score: 10,
        },
      ],
      conversationHistory: [{ role: "user", content: "Hi" }, { role: "assistant", content: "Hello!" }],
      currentMessage: "What is the mesh size?",
    });

    expect(messages.length).toBe(4); // system, user, assistant, current user
    expect(messages[0].role).toBe("system");
    expect(messages[0].content).toContain("UNTRUSTED REFERENCE DATA");
    expect(messages[0].content).toContain("Catalog.pdf");
    expect(messages[0].content).toContain("80-100 mesh");
    expect(messages[3].content).toBe("What is the mesh size?");
  });
});

describe("5. Knowledge Base Multi-Tenant Isolation", () => {
  it("should retrieve chunks strictly scoped to the requested business", async () => {
    const athangBiz = await prisma.business.findUnique({ where: { slug: "athang-impex" } });
    const benzwellBiz = await prisma.business.findUnique({ where: { slug: "benzwell" } });

    expect(athangBiz).not.toBeNull();
    expect(benzwellBiz).not.toBeNull();

    // Query for onion powder on Athang Impex
    const athangResults = await KnowledgeRetriever.retrieveChunks(athangBiz!.id, "onion powder mesh size", 3);
    expect(athangResults.length).toBeGreaterThan(0);
    expect(athangResults[0].content.toLowerCase()).toContain("onion");

    // Same query on Benzwell should return 0 chunks because Benzwell sells digital products!
    const benzwellResults = await KnowledgeRetriever.retrieveChunks(benzwellBiz!.id, "onion powder mesh size", 3);
    expect(benzwellResults.length).toBe(0);
  });
});

describe("6. AI Provider Fallback Engine & Bounded Failovers", () => {
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("should succeed with Groq if Groq returns 200", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "Groq response for Athang Impex" } }],
        usage: { prompt_tokens: 100, completion_tokens: 25, total_tokens: 125 },
      }),
    } as any);

    const adapter = new GroqAdapter({ apiKey: "test-groq-key", modelId: "llama-3.3-70b-versatile" });
    const result = await adapter.generateResponse([{ role: "user", content: "Hello" }]);

    expect(result.provider).toBe("GROQ");
    expect(result.text).toBe("Groq response for Athang Impex");
    expect(result.totalTokens).toBe(125);
  });

  it("should normalize Groq 429 rate limit as retryable error", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      text: async () => "Rate limit exceeded",
    } as any);

    const adapter = new GroqAdapter({ apiKey: "test-groq-key", modelId: "llama-3.3-70b-versatile" });
    await expect(adapter.generateResponse([{ role: "user", content: "Hello" }])).rejects.toMatchObject({
      category: "RATE_LIMIT",
      isRetryable: true,
    });
  });

  it("should normalize permanent 401 auth failure as non-retryable", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => "Unauthorized: Invalid API Key",
    } as any);

    const adapter = new MistralAdapter({ apiKey: "invalid-key", modelId: "mistral-large-latest" });
    await expect(adapter.generateResponse([{ role: "user", content: "Hello" }])).rejects.toMatchObject({
      category: "AUTH_ERROR",
      isRetryable: false,
    });
  });

  it("should fallback to safe failure message if all providers fail", async () => {
    // Mock fetch to simulate failures for all providers
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => "Provider server error",
    } as any);

    const athangBiz = await prisma.business.findUnique({ where: { slug: "athang-impex" } });
    expect(athangBiz).not.toBeNull();

    const fallbackResult = await FallbackEngine.generateWithFallback(
      athangBiz!.id,
      [{ role: "user", content: "Send quotation" }]
    );

    expect(fallbackResult.isSafeFailure).toBe(true);
    // Must contain Athang Impex contact info from safe failure message!
    expect(fallbackResult.response.text).toContain("info@athangimpex.in");
  });
});

describe("7. Lead Extraction Intelligence", () => {
  it("should extract international export lead parameters for ATHANG IMPEX", () => {
    const enquiry = "We need 20 MT of Dehydrated Onion Powder shipped to Jebel Ali Port in 25kg kraft bags. Contact export@gulfspice.com or +971501234567 urgently.";
    const lead = LeadExtractor.extractLeadDetails("athang-impex", enquiry);

    expect(lead.productOfInterest).toBe("Dehydrated Onion Powder");
    expect(lead.quantityAndUnit).toBe("20 MT");
    expect(lead.destinationPort).toContain("Jebel Ali");
    expect(lead.packagingPreference).toBe("25kg kraft paper bags");
    expect(lead.emailOrPhone).toBe("export@gulfspice.com");
    expect(lead.purchaseTimeline).toBe("Immediate");
  });

  it("should extract digital support order parameters for BENZWELL", () => {
    const supportMessage = "I purchased the UI Kit yesterday Order #ORD-9842 but my download link expired. Please send link to user@example.com.";
    const lead = LeadExtractor.extractLeadDetails("benzwell", supportMessage);

    expect(lead.orderReference).toBe("ORD-9842");
    expect(lead.supportTopic).toBe("Download & File Access");
    expect(lead.emailOrPhone).toBe("user@example.com");
  });
});
